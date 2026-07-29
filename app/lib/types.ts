export interface Transaction {
  id: string;
  type: 'masuk' | 'keluar';
  category: string;
  subCategory?: string;
  budgetPosId?: string;
  goalId?: string;
  amount: number;
  note: string;
  date: string;
  createdAt: string;
}

export interface BudgetPos {
  id: string;
  name: string;
  monthlyAllocation: number;
  rollover: boolean;
  createdAt: string;
}

export interface DebtParty {
  id: string;
  name: string;
  createdAt: string;
}

export interface DebtTransaction {
  id: string;
  partyId: string;
  type: 'tambah' | 'bayar';
  amount: number;
  note: string;
  date: string;
  createdAt: string;
}

export interface SavingGoal {
  id: string;
  name: string;
  targetAmount: number;
  createdAt: string;
}

export interface Category {
  id: string;
  name: string;
  type: 'masuk' | 'keluar' | 'both';
  isDefault?: boolean;
}

export interface AppSettings {
  userName: string;
  darkMode: boolean;
}

export const DEFAULT_INCOME_CATEGORIES = ['Gaji', 'Tabungan', 'Hutang', 'Lainnya'];
export const DEFAULT_EXPENSE_CATEGORIES = ['Pengeluaran', 'Tabungan', 'Hutang', 'Lainnya'];
export const SUB_CATEGORIES = ['Makan', 'Transport', 'Tagihan', 'Kebutuhan Rumah Tangga', 'Kesehatan', 'Lainnya'];
