import { Transaction, BudgetPos, DebtParty, DebtTransaction, SavingGoal, Category, AppSettings } from './types';
import { supabase } from './supabase';

const KEYS = {
  transactions: 'pf_transactions',
  budgetPos: 'pf_budget_pos',
  debtParties: 'pf_debt_parties',
  debtTransactions: 'pf_debt_transactions',
  savingGoals: 'pf_saving_goals',
  categories: 'pf_categories',
  settings: 'pf_settings',
};

function genId(): string {
  if (typeof window !== 'undefined' && window.crypto && window.crypto.randomUUID) {
    return window.crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

function load<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function save<T>(key: string, data: T): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(key, JSON.stringify(data));
}

// ─── Syncing ───────────────────────────────────────────────────
export async function syncWithSupabase(): Promise<void> {
  const [
    txnsRes,
    budgetRes,
    partiesRes,
    debtTxnsRes,
    goalsRes,
    catsRes,
    settingsRes,
  ] = await Promise.all([
    supabase.from('transactions').select('*'),
    supabase.from('budget_pos').select('*'),
    supabase.from('debt_parties').select('*'),
    supabase.from('debt_transactions').select('*'),
    supabase.from('saving_goals').select('*'),
    supabase.from('categories').select('*'),
    supabase.from('app_settings').select('*').maybeSingle(),
  ]);

  const errors = [
    txnsRes.error,
    budgetRes.error,
    partiesRes.error,
    debtTxnsRes.error,
    goalsRes.error,
    catsRes.error,
    settingsRes.error
  ];
  
  const missingTableError = errors.find(err => err && (err.code === '42P01' || err.message?.includes('relation') || err.message?.includes('does not exist')));
  if (missingTableError) {
    throw new Error('SCHEMA_MISSING');
  }

  const genericError = errors.find(err => err);
  if (genericError) {
    throw new Error(genericError.message || 'DATABASE_ERROR');
  }

  // 1. Transactions
  const mappedTxns = (txnsRes.data || []).map(t => ({
    id: t.id,
    type: t.type,
    category: t.category,
    subCategory: t.sub_category || undefined,
    budgetPosId: t.budget_pos_id || undefined,
    goalId: t.goal_id || undefined,
    amount: Number(t.amount),
    note: t.note || '',
    date: t.date,
    createdAt: t.created_at,
  }));
  save(KEYS.transactions, mappedTxns);

  // 2. Budget Pos
  const mappedBudgets = (budgetRes.data || []).map(b => ({
    id: b.id,
    name: b.name,
    monthlyAllocation: Number(b.monthly_allocation),
    rollover: b.rollover || false,
    createdAt: b.created_at,
  }));
  save(KEYS.budgetPos, mappedBudgets);

  // 3. Debt Parties
  const mappedParties = (partiesRes.data || []).map(p => ({
    id: p.id,
    name: p.name,
    createdAt: p.created_at,
  }));
  save(KEYS.debtParties, mappedParties);

  // 4. Debt Transactions
  const mappedDebtTxns = (debtTxnsRes.data || []).map(dt => ({
    id: dt.id,
    partyId: dt.party_id,
    type: dt.type,
    amount: Number(dt.amount),
    note: dt.note || '',
    date: dt.date,
    createdAt: dt.created_at,
  }));
  save(KEYS.debtTransactions, mappedDebtTxns);

  // 5. Saving Goals
  const mappedGoals = (goalsRes.data || []).map(g => ({
    id: g.id,
    name: g.name,
    targetAmount: Number(g.target_amount),
    createdAt: g.created_at,
  }));
  save(KEYS.savingGoals, mappedGoals);

  // 6. Categories
  const mappedCats = (catsRes.data || []).map(c => ({
    id: c.id,
    name: c.name,
    type: c.type,
    isDefault: c.is_default || false,
  }));
  if (mappedCats.length > 0) {
    save(KEYS.categories, mappedCats);
  }

  // 7. Settings
  if (settingsRes.data) {
    const s = settingsRes.data;
    save(KEYS.settings, {
      userName: s.user_name || 'Pengguna',
      darkMode: s.dark_mode || false,
    });
  }
}

// ─── Transactions ─────────────────────────────────────────────
export function getTransactions(): Transaction[] {
  return load<Transaction[]>(KEYS.transactions, []);
}

export async function addTransaction(data: Omit<Transaction, 'id' | 'createdAt'>): Promise<Transaction> {
  const txns = getTransactions();
  const newTxn: Transaction = { ...data, id: genId(), createdAt: new Date().toISOString() };
  save(KEYS.transactions, [newTxn, ...txns]);

  await supabase.from('transactions').insert({
    id: newTxn.id,
    type: newTxn.type,
    category: newTxn.category,
    sub_category: newTxn.subCategory || null,
    budget_pos_id: newTxn.budgetPosId || null,
    goal_id: newTxn.goalId || null,
    amount: newTxn.amount,
    note: newTxn.note || '',
    date: newTxn.date,
    created_at: newTxn.createdAt,
  });

  return newTxn;
}

export async function updateTransaction(id: string, data: Partial<Omit<Transaction, 'id' | 'createdAt'>>): Promise<void> {
  const txns = getTransactions().map(t => t.id === id ? { ...t, ...data } : t);
  save(KEYS.transactions, txns);

  const updateData: any = {};
  if (data.type !== undefined) updateData.type = data.type;
  if (data.category !== undefined) updateData.category = data.category;
  if (data.subCategory !== undefined) updateData.sub_category = data.subCategory || null;
  if (data.budgetPosId !== undefined) updateData.budget_pos_id = data.budgetPosId || null;
  if (data.goalId !== undefined) updateData.goal_id = data.goalId || null;
  if (data.amount !== undefined) updateData.amount = data.amount;
  if (data.note !== undefined) updateData.note = data.note;
  if (data.date !== undefined) updateData.date = data.date;

  await supabase.from('transactions').update(updateData).eq('id', id);
}

export async function deleteTransaction(id: string): Promise<void> {
  const current = getTransactions();
  const updated = current.filter(t => t.id !== id);
  save(KEYS.transactions, updated);
  try {
    const { error } = await supabase.from('transactions').delete().eq('id', id);
    if (error) {
      console.warn('Supabase transaction delete warning:', error.message);
    }
  } catch (err) {
    console.error('Supabase transaction delete error:', err);
  }
}

// ─── Budget Pos ────────────────────────────────────────────────
export function getBudgetPos(): BudgetPos[] {
  return load<BudgetPos[]>(KEYS.budgetPos, []);
}

export async function addBudgetPos(data: Omit<BudgetPos, 'id' | 'createdAt'>): Promise<BudgetPos> {
  const list = getBudgetPos();
  const newPos: BudgetPos = { ...data, id: genId(), createdAt: new Date().toISOString() };
  save(KEYS.budgetPos, [...list, newPos]);

  await supabase.from('budget_pos').insert({
    id: newPos.id,
    name: newPos.name,
    monthly_allocation: newPos.monthlyAllocation,
    rollover: newPos.rollover,
    created_at: newPos.createdAt,
  });

  return newPos;
}

export async function updateBudgetPos(id: string, data: Partial<Omit<BudgetPos, 'id' | 'createdAt'>>): Promise<void> {
  save(KEYS.budgetPos, getBudgetPos().map(p => p.id === id ? { ...p, ...data } : p));

  const updateData: any = {};
  if (data.name !== undefined) updateData.name = data.name;
  if (data.monthlyAllocation !== undefined) updateData.monthly_allocation = data.monthlyAllocation;
  if (data.rollover !== undefined) updateData.rollover = data.rollover;

  await supabase.from('budget_pos').update(updateData).eq('id', id);
}

export async function deleteBudgetPos(id: string): Promise<void> {
  save(KEYS.budgetPos, getBudgetPos().filter(p => p.id !== id));
  await supabase.from('budget_pos').delete().eq('id', id);
}

export function getBudgetUsed(posId: string, year: number, month: number): number {
  const txns = getTransactions();
  return txns
    .filter(t => {
      if (t.type !== 'keluar' || t.budgetPosId !== posId) return false;
      const d = new Date(t.date);
      return d.getFullYear() === year && d.getMonth() + 1 === month;
    })
    .reduce((sum, t) => sum + t.amount, 0);
}

// ─── Debt ──────────────────────────────────────────────────────
export function getDebtParties(): DebtParty[] {
  return load<DebtParty[]>(KEYS.debtParties, []);
}

export async function addDebtParty(name: string): Promise<DebtParty> {
  const list = getDebtParties();
  const existing = list.find(p => p.name.toLowerCase() === name.toLowerCase());
  if (existing) return existing;
  const newParty: DebtParty = { id: genId(), name, createdAt: new Date().toISOString() };
  save(KEYS.debtParties, [...list, newParty]);

  await supabase.from('debt_parties').insert({
    id: newParty.id,
    name: newParty.name,
    created_at: newParty.createdAt,
  });

  return newParty;
}

export async function deleteDebtParty(id: string): Promise<void> {
  save(KEYS.debtParties, getDebtParties().filter(p => p.id !== id));
  save(KEYS.debtTransactions, getDebtTransactions().filter(t => t.partyId !== id));

  await supabase.from('debt_parties').delete().eq('id', id);
}

export function getDebtTransactions(): DebtTransaction[] {
  return load<DebtTransaction[]>(KEYS.debtTransactions, []);
}

export async function addDebtTransaction(data: Omit<DebtTransaction, 'id' | 'createdAt'>): Promise<DebtTransaction> {
  const list = getDebtTransactions();
  const newTxn: DebtTransaction = { ...data, id: genId(), createdAt: new Date().toISOString() };
  save(KEYS.debtTransactions, [newTxn, ...list]);

  await supabase.from('debt_transactions').insert({
    id: newTxn.id,
    party_id: newTxn.partyId,
    type: newTxn.type,
    amount: newTxn.amount,
    note: newTxn.note || '',
    date: newTxn.date,
    created_at: newTxn.createdAt,
  });

  return newTxn;
}

export async function deleteDebtTransaction(id: string): Promise<void> {
  save(KEYS.debtTransactions, getDebtTransactions().filter(t => t.id !== id));
  await supabase.from('debt_transactions').delete().eq('id', id);
}

export function getDebtBalance(partyId: string): number {
  return getDebtTransactions()
    .filter(t => t.partyId === partyId)
    .reduce((sum, t) => sum + (t.type === 'tambah' ? t.amount : -t.amount), 0);
}

export function getTotalDebt(): number {
  return getDebtParties().reduce((sum, p) => sum + Math.max(0, getDebtBalance(p.id)), 0);
}

// ─── Saving Goals ──────────────────────────────────────────────
export function getSavingGoals(): SavingGoal[] {
  return load<SavingGoal[]>(KEYS.savingGoals, []);
}

export async function addSavingGoal(data: Omit<SavingGoal, 'id' | 'createdAt'>): Promise<SavingGoal> {
  const list = getSavingGoals();
  const newGoal: SavingGoal = { ...data, id: genId(), createdAt: new Date().toISOString() };
  save(KEYS.savingGoals, [...list, newGoal]);

  await supabase.from('saving_goals').insert({
    id: newGoal.id,
    name: newGoal.name,
    target_amount: newGoal.targetAmount,
    created_at: newGoal.createdAt,
  });

  return newGoal;
}

export async function updateSavingGoal(id: string, data: Partial<Omit<SavingGoal, 'id' | 'createdAt'>>): Promise<void> {
  save(KEYS.savingGoals, getSavingGoals().map(g => g.id === id ? { ...g, ...data } : g));

  const updateData: any = {};
  if (data.name !== undefined) updateData.name = data.name;
  if (data.targetAmount !== undefined) updateData.target_amount = data.targetAmount;

  await supabase.from('saving_goals').update(updateData).eq('id', id);
}

export async function deleteSavingGoal(id: string): Promise<void> {
  save(KEYS.savingGoals, getSavingGoals().filter(g => g.id !== id));
  await supabase.from('saving_goals').delete().eq('id', id);
}

export function getGoalProgress(goalId: string): number {
  return getTransactions()
    .filter(t => t.goalId === goalId)
    .reduce((sum, t) => sum + (t.type === 'keluar' ? t.amount : -t.amount), 0);
}

// ─── Categories ────────────────────────────────────────────────
const DEFAULT_CATEGORIES: Category[] = [
  { id: 'c1', name: 'Gaji', type: 'masuk', isDefault: true },
  { id: 'c2', name: 'Bonus', type: 'masuk', isDefault: true },
  { id: 'c3', name: 'Investasi', type: 'masuk', isDefault: true },
  { id: 'c4', name: 'Tabungan', type: 'both', isDefault: true },
  { id: 'c5', name: 'Pengeluaran', type: 'keluar', isDefault: true },
  { id: 'c6', name: 'Hutang', type: 'both', isDefault: true },
  { id: 'c7', name: 'Lainnya', type: 'both', isDefault: true },
];

export function getCategories(): Category[] {
  return load<Category[]>(KEYS.categories, DEFAULT_CATEGORIES);
}

export async function addCategory(data: Omit<Category, 'id'>): Promise<Category> {
  const list = getCategories();
  const newCat: Category = { ...data, id: genId() };
  save(KEYS.categories, [...list, newCat]);

  await supabase.from('categories').insert({
    id: newCat.id,
    name: newCat.name,
    type: newCat.type,
    is_default: newCat.isDefault || false,
  });

  return newCat;
}

export async function deleteCategory(id: string): Promise<void> {
  save(KEYS.categories, getCategories().filter(c => c.id !== id || c.isDefault));
  await supabase.from('categories').delete().eq('id', id);
}

// ─── Settings ──────────────────────────────────────────────────
const DEFAULT_SETTINGS: AppSettings = { userName: 'Pengguna', darkMode: false };

export function getSettings(): AppSettings {
  return load<AppSettings>(KEYS.settings, DEFAULT_SETTINGS);
}

export async function saveSettings(settings: AppSettings): Promise<void> {
  save(KEYS.settings, settings);

  await supabase.from('app_settings').upsert({
    id: 1,
    user_name: settings.userName,
    dark_mode: settings.darkMode,
    updated_at: new Date().toISOString(),
  });
}

// ─── Dashboard Calculations ────────────────────────────────────
export function getTotalBalance(): number {
  return getTransactions().reduce((sum, t) =>
    sum + (t.type === 'masuk' ? t.amount : -t.amount), 0);
}

export function getMonthlyIncome(year: number, month: number): number {
  return getTransactions()
    .filter(t => {
      if (t.type !== 'masuk') return false;
      const d = new Date(t.date);
      return d.getFullYear() === year && d.getMonth() + 1 === month;
    })
    .reduce((sum, t) => sum + t.amount, 0);
}

export function getMonthlyExpense(year: number, month: number): number {
  return getTransactions()
    .filter(t => {
      if (t.type !== 'keluar') return false;
      const d = new Date(t.date);
      return d.getFullYear() === year && d.getMonth() + 1 === month;
    })
    .reduce((sum, t) => sum + t.amount, 0);
}

export function getTotalSavings(): number {
  return getTransactions()
    .filter(t => t.category === 'Tabungan')
    .reduce((sum, t) => sum + (t.type === 'masuk' ? t.amount : -t.amount), 0);
}

export function getMonthlyFlowData(months: number = 7): { labels: string[]; income: number[]; expense: number[] } {
  const labels: string[] = [];
  const income: number[] = [];
  const expense: number[] = [];
  const now = new Date();

  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    labels.push(d.toLocaleDateString('id-ID', { month: 'short' }));
    income.push(getMonthlyIncome(d.getFullYear(), d.getMonth() + 1));
    expense.push(getMonthlyExpense(d.getFullYear(), d.getMonth() + 1));
  }

  return { labels, income, expense };
}

export async function clearAllData(): Promise<void> {
  Object.values(KEYS).forEach(key => {
    if (typeof window !== 'undefined') localStorage.removeItem(key);
  });

  await Promise.all([
    supabase.from('transactions').delete().neq('id', '00000000-0000-0000-0000-000000000000'),
    supabase.from('debt_transactions').delete().neq('id', '00000000-0000-0000-0000-000000000000'),
    supabase.from('debt_parties').delete().neq('id', '00000000-0000-0000-0000-000000000000'),
    supabase.from('budget_pos').delete().neq('id', '00000000-0000-0000-0000-000000000000'),
    supabase.from('saving_goals').delete().neq('id', '00000000-0000-0000-0000-000000000000'),
    supabase.from('categories').delete().neq('is_default', true),
    supabase.from('app_settings').upsert({ id: 1, user_name: 'Pengguna', dark_mode: false }),
  ]);
}
