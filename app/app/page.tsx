'use client';
import { useState, useCallback } from 'react';
import { Plus, User } from 'lucide-react';
import Header from '@/components/Header';
import SummaryCard from '@/components/SummaryCard';
import MoneyFlowChart from '@/components/MoneyFlowChart';
import BudgetDonut from '@/components/BudgetDonut';
import RecentTransactions from '@/components/RecentTransactions';
import SavingGoalsList from '@/components/SavingGoalsList';
import ConfirmDeleteModal from '@/components/ConfirmDeleteModal';
import TransactionModal from '@/components/TransactionModal';
import {
  getTransactions, addTransaction, updateTransaction, deleteTransaction, getTotalBalance,
  getMonthlyIncome, getMonthlyExpense, getTotalSavings, getRemainingBudget, getFreeMoney,
  getBudgetPos, getBudgetUsed, getSavingGoals, getGoalProgress, getSettings,
} from '@/lib/store';
import { Transaction, BudgetPos, SavingGoal } from '@/lib/types';
import { getCurrentMonth, getPreviousMonth, formatCurrency, clamp, formatDate } from '@/lib/helpers';
import { useDataRefresh } from '@/lib/useDataRefresh';
import Link from 'next/link';


// Category to emoji map for mobile transaction icons
const CATEGORY_EMOJI: Record<string, string> = {
  'Makan': '🍽️',
  'Transport': '🚗',
  'Tagihan': '⚡',
  'Kebutuhan Rumah Tangga': '🏠',
  'Kesehatan': '💊',
  'Hiburan': '🎬',
  'Belanja': '🛍️',
  'Tabungan': '🏦',
  'Hutang': '💳',
  'Lainnya': '📝',
  'Gaji': '💼',
  'Bonus': '🎁',
  'Investasi': '📈',
};

function getCategoryEmoji(category: string): string {
  return CATEGORY_EMOJI[category] || (category ? category[0].toUpperCase() : '?');
}

// Relative time helper
function getRelativeTime(dateStr: string, createdAt?: string): string {
  const txDate = new Date(dateStr);
  const now = new Date();
  const todayStr = now.toISOString().slice(0, 10);
  const txDateStr = dateStr.slice(0, 10);

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().slice(0, 10);

  const timeStr = createdAt
    ? new Date(createdAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
    : '';

  if (txDateStr === todayStr) {
    return `Hari ini${timeStr ? `, ${timeStr}` : ''}`;
  } else if (txDateStr === yesterdayStr) {
    return `Kemarin${timeStr ? `, ${timeStr}` : ''}`;
  } else {
    const diffDays = Math.floor((now.getTime() - txDate.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays < 7) return `${diffDays} hari lalu`;
    return formatDate(dateStr, 'short');
  }
}

export default function DashboardPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [budgetPos, setBudgetPos] = useState<BudgetPos[]>([]);
  const [goals, setGoals] = useState<SavingGoal[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editTarget, setEditTarget] = useState<Transaction | undefined>();
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [userName, setUserName] = useState('Pengguna');

  const { year, month } = getCurrentMonth();
  const prev = getPreviousMonth();

  const loadData = useCallback(() => {
    setTransactions(getTransactions());
    setBudgetPos(getBudgetPos());
    setGoals(getSavingGoals());
    const s = getSettings();
    setUserName(s.userName);
  }, []);

  useDataRefresh(loadData);

  const totalBalance = getTotalBalance();
  const remainingBudget = getRemainingBudget(year, month);
  const freeMoney = getFreeMoney(year, month);

  const income = getMonthlyIncome(year, month);
  const expense = getMonthlyExpense(year, month);
  const savings = getTotalSavings();
  const prevIncome = getMonthlyIncome(prev.year, prev.month);
  const prevExpense = getMonthlyExpense(prev.year, prev.month);

  const budgetItems = budgetPos.map(p => ({
    name: p.name,
    allocated: p.monthlyAllocation,
    used: getBudgetUsed(p.id, year, month),
  }));

  // Budget summary for mobile
  const totalBudgetAllocated = budgetPos.reduce((s, p) => s + p.monthlyAllocation, 0);
  const totalBudgetUsed = budgetPos.reduce((s, p) => s + getBudgetUsed(p.id, year, month), 0);
  const budgetPct = totalBudgetAllocated > 0
    ? clamp((totalBudgetUsed / totalBudgetAllocated) * 100, 0, 100)
    : 0;

  // Goal summary for mobile (first goal only or total)
  const firstGoal = goals[0] || null;
  const firstGoalProgress = firstGoal ? getGoalProgress(firstGoal.id) : 0;
  const firstGoalPct = firstGoal
    ? clamp((firstGoalProgress / firstGoal.targetAmount) * 100, 0, 100)
    : 0;
  const totalGoalProgress = goals.reduce((s, g) => s + getGoalProgress(g.id), 0);
  const totalGoalTarget = goals.reduce((s, g) => s + g.targetAmount, 0);
  const totalGoalPct = totalGoalTarget > 0
    ? clamp((totalGoalProgress / totalGoalTarget) * 100, 0, 100)
    : 0;

  const handleSaveTransaction = async (data: Omit<Transaction, 'id' | 'createdAt'>) => {
    if (editTarget) {
      await updateTransaction(editTarget.id, data);
    } else {
      await addTransaction(data);
    }
    setShowModal(false);
    setEditTarget(undefined);
    loadData();
  };

  const handleEdit = (t: Transaction) => {
    setEditTarget(t);
    setShowModal(true);
  };

  const handleDeleteRequest = (id: string) => {
    setDeleteId(id);
  };

  const handleConfirmDelete = async () => {
    if (!deleteId) return;
    setIsDeleting(true);
    try {
      await deleteTransaction(deleteId);
      loadData();
    } finally {
      setIsDeleting(false);
      setDeleteId(null);
    }
  };

  const recentTxns = transactions.slice(0, 5);

  return (
    <>
      {/* ─── DESKTOP HEADER (hidden on mobile) ─── */}
      <div className="desktop-only-view">
        <Header title="Dashboard" subtitle="Ringkasan keuangan Anda bulan ini" />
      </div>

      {/* ─── MOBILE HEADER (hidden on desktop) ─── */}
      <div className="mobile-only-view mobile-dashboard-header">
        <div className="mobile-db-greeting">
          <div>
            <div className="mobile-db-hello">Halo, {userName.split(' ')[0]}</div>
            <div className="mobile-db-appname">Duitku</div>
          </div>
          <div className="mobile-db-avatar">
            <User size={22} />
          </div>
        </div>
      </div>

      <div className="page-container">

        {/* ─── MOBILE LAYOUT ─── */}
        <div className="mobile-only-view" style={{ flexDirection: 'column', gap: 16 }}>

          {/* Balance Card */}
          <div className="mobile-balance-card">
            <div className="mobile-balance-label">Total saldo</div>
            <div className="mobile-balance-amount">{formatCurrency(totalBalance)}</div>
            <div className="mobile-balance-sub">
              Termasuk {formatCurrency(Math.max(0, freeMoney))} uang bebas belanja
            </div>

            <div className="mobile-balance-divider" />

            <div className="mobile-balance-row">
              <div className="mobile-balance-stat">
                <span className="mobile-balance-stat-icon income">↗</span>
                <div>
                  <div className="mobile-balance-stat-label">Pemasukan</div>
                  <div className="mobile-balance-stat-val income">{formatCurrency(income, true)}</div>
                </div>
              </div>
              <div className="mobile-balance-stat">
                <span className="mobile-balance-stat-icon expense">↘</span>
                <div>
                  <div className="mobile-balance-stat-label">Pengeluaran</div>
                  <div className="mobile-balance-stat-val expense">{formatCurrency(expense, true)}</div>
                </div>
              </div>
            </div>
          </div>

          {/* Budget & Goal Progress Cards */}
          {(budgetPos.length > 0 || goals.length > 0) && (
            <div className="mobile-progress-row">
              {budgetPos.length > 0 && (
                <Link href="/budget" className="mobile-progress-card" style={{ textDecoration: 'none' }}>
                  <div className="mobile-progress-title">Anggaran bulan ini</div>
                  <div className="mobile-progress-bar-wrap">
                    <div
                      className={`mobile-progress-bar-fill ${budgetPct >= 100 ? 'budget-over' : 'budget'}`}
                      style={{ width: `${budgetPct}%` }}
                    />
                  </div>
                  <div className={`mobile-progress-sub ${budgetPct >= 100 ? 'is-over' : ''}`}>
                    Terpakai {formatCurrency(totalBudgetUsed, true)} dari {formatCurrency(totalBudgetAllocated, true)}
                  </div>
                </Link>
              )}
              {goals.length > 0 && (
                <Link href="/goals" className="mobile-progress-card" style={{ textDecoration: 'none' }}>
                  <div className="mobile-progress-title">Target tabungan</div>
                  <div className="mobile-progress-bar-wrap">
                    <div
                      className="mobile-progress-bar-fill goal"
                      style={{ width: `${totalGoalPct}%` }}
                    />
                  </div>
                  <div className="mobile-progress-sub">
                    {formatCurrency(totalGoalProgress, true)} dari {formatCurrency(totalGoalTarget, true)}
                  </div>
                </Link>
              )}
            </div>
          )}

          {/* Recent Transactions */}
          <div className="mobile-section">
            <div className="mobile-section-header">
              <span className="mobile-section-title">Transaksi terbaru</span>
              <Link href="/transactions" className="mobile-section-action">Lihat semua</Link>
            </div>

            {recentTxns.length === 0 ? (
              <div className="empty-state" style={{ padding: '24px 0' }}>
                <div className="empty-state-icon">💸</div>
                <h3>Belum ada transaksi</h3>
                <p>Mulai catat keuanganmu hari ini!</p>
              </div>
            ) : (
              <div className="mobile-txn-list-v2">
                {recentTxns.map(t => {
                  const emoji = getCategoryEmoji(t.category);
                  const isEmoji = emoji.length <= 2 && !/^[A-Z]$/.test(emoji);
                  return (
                    <div key={t.id} className="mobile-txn-v2-item">
                      <div className={`mobile-txn-v2-icon ${t.type}`}>
                        {isEmoji ? (
                          <span style={{ fontSize: 18, lineHeight: 1 }}>{emoji}</span>
                        ) : (
                          <span style={{ fontSize: 14, fontWeight: 700 }}>{emoji}</span>
                        )}
                      </div>
                      <div className="mobile-txn-v2-info">
                        <div className="mobile-txn-v2-name">{t.note || t.category}</div>
                        <div className="mobile-txn-v2-time">{getRelativeTime(t.date, t.createdAt)}</div>
                      </div>
                      <div className={`mobile-txn-v2-amount ${t.type === 'masuk' ? 'income' : 'expense'}`}>
                        {t.type === 'masuk' ? '+' : '-'}{formatCurrency(t.amount, true)}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* ─── DESKTOP LAYOUT (existing) ─── */}
        <div className="desktop-only-view" style={{ width: '100%' }}>
          {/* Summary Cards */}
          <div className="summary-grid mb-5">
            <SummaryCard
              label="Total Saldo"
              value={totalBalance}
              variant="hero"
              freeMoney={freeMoney}
              remainingBudget={remainingBudget}
            />
            <SummaryCard label="Pemasukan (Bulan Ini)" value={income} prevValue={prevIncome} variant="income" />
            <SummaryCard label="Pengeluaran (Bulan Ini)" value={expense} prevValue={prevExpense} variant="expense" />
            <SummaryCard label="Total Tabungan" value={savings} variant="savings" />
          </div>

          {/* Main Grid */}
          <div className="dashboard-grid" style={{ width: '100%', maxWidth: '100%', minWidth: 0, boxSizing: 'border-box' }}>
            {/* Left Column */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20, minWidth: 0, width: '100%', maxWidth: '100%', boxSizing: 'border-box' }}>
              {/* Money Flow */}
              <div className="card">
                <div className="card-header" style={{ minWidth: 0 }}>
                  <span className="card-title" style={{ minWidth: 0, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>Arus Uang (Money Flow)</span>
                  <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexShrink: 0 }}>
                    <span className="text-sm text-muted">7 bulan terakhir</span>
                  </div>
                </div>
                <MoneyFlowChart months={7} />
              </div>

              {/* Recent Transactions */}
              <div className="card">
                <div className="card-header" style={{ minWidth: 0 }}>
                  <span className="card-title" style={{ minWidth: 0, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>Transaksi Terbaru</span>
                  <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexShrink: 0 }}>
                    <button className="btn btn-primary btn-sm" onClick={() => { setEditTarget(undefined); setShowModal(true); }}>
                      <Plus size={14} /> Tambah
                    </button>
                  </div>
                </div>
                <RecentTransactions
                  transactions={transactions}
                  limit={5}
                  onEdit={handleEdit}
                  onDelete={handleDeleteRequest}
                />
              </div>
            </div>

            {/* Right Column */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20, minWidth: 0, width: '100%', maxWidth: '100%', boxSizing: 'border-box' }}>
              {/* Budget */}
              <div className="card">
                <div className="card-header" style={{ minWidth: 0 }}>
                  <span className="card-title" style={{ minWidth: 0, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>Anggaran</span>
                  <a href="/budget" className="card-action" style={{ flexShrink: 0 }}>Lihat semua →</a>
                </div>
                <BudgetDonut items={budgetItems} />
              </div>

              {/* Saving Goals */}
              <div className="card">
                <div className="card-header" style={{ minWidth: 0 }}>
                  <span className="card-title" style={{ minWidth: 0, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>Target Tabungan</span>
                  <a href="/goals" className="card-action" style={{ flexShrink: 0 }}>Lihat semua →</a>
                </div>
                <SavingGoalsList goals={goals.slice(0, 4)} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* FAB for mobile */}
      <button
        className="fab"
        onClick={() => { setEditTarget(undefined); setShowModal(true); }}
        aria-label="Tambah transaksi"
      >
        <Plus size={22} />
      </button>

      {showModal && (
        <TransactionModal
          existing={editTarget}
          onSave={handleSaveTransaction}
          onClose={() => { setShowModal(false); setEditTarget(undefined); }}
        />
      )}

      {deleteId && (
        <ConfirmDeleteModal
          title="Hapus Transaksi"
          message="Apakah Anda yakin ingin menghapus transaksi ini? Data yang dihapus tidak dapat dikembalikan."
          isLoading={isDeleting}
          onConfirm={handleConfirmDelete}
          onClose={() => setDeleteId(null)}
        />
      )}
    </>
  );
}
