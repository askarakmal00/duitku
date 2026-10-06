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
  getTransactions, addTransaction, updateTransaction, deleteTransaction,
  getBudgetPos, getBudgetUsed, getSavingGoals, getGoalProgress, getSettings,
  getDashboardFinanceSummary
} from '@/lib/store';
import { Transaction, BudgetPos, SavingGoal } from '@/lib/types';
import { getCurrentMonth, formatCurrency, clamp, formatDate } from '@/lib/helpers';
import { useDataRefresh } from '@/lib/useDataRefresh';
import Link from 'next/link';
import { useSpace } from '@/lib/useSpace';
import SpaceSwitcher from '@/components/SpaceSwitcher';
import FamilyDashboardRedesign from '@/components/FamilyDashboardRedesign';


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
  const { activeSpace } = useSpace();
  const isFamily = activeSpace === 'keluarga';

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [budgetPos, setBudgetPos] = useState<BudgetPos[]>([]);
  const [goals, setGoals] = useState<SavingGoal[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editTarget, setEditTarget] = useState<Transaction | undefined>();
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [userName, setUserName] = useState('Pengguna');

  const { year, month } = getCurrentMonth();

  const loadData = useCallback(() => {
    setTransactions(getTransactions(activeSpace || undefined));
    setBudgetPos(getBudgetPos(activeSpace || undefined));
    setGoals(getSavingGoals(activeSpace || undefined));
    const s = getSettings();
    setUserName(s.userName);
  }, [activeSpace]);

  useDataRefresh(loadData);

  // Satu-satunya sumber perhitungan terpadu untuk semua kartu dashboard
  const summary = getDashboardFinanceSummary(year, month);

  const budgetItems = budgetPos.map(p => ({
    name: p.name,
    allocated: p.monthlyAllocation,
    used: getBudgetUsed(p.id, year, month, p.spaceId || activeSpace || undefined),
  }));

  // Budget summary for mobile
  const totalBudgetAllocated = budgetPos.reduce((s, p) => s + p.monthlyAllocation, 0);
  const totalBudgetUsed = budgetPos.reduce((s, p) => s + getBudgetUsed(p.id, year, month, p.spaceId || activeSpace || undefined), 0);
  const budgetPct = totalBudgetAllocated > 0
    ? clamp((totalBudgetUsed / totalBudgetAllocated) * 100, 0, 100)
    : 0;

  // Goal summary for mobile (first goal only or total)
  const firstGoal = goals[0] || null;
  const firstGoalProgress = firstGoal ? getGoalProgress(firstGoal.id, firstGoal.spaceId || activeSpace || undefined) : 0;
  const firstGoalPct = firstGoal
    ? clamp((firstGoalProgress / firstGoal.targetAmount) * 100, 0, 100)
    : 0;
  const totalGoalProgress = goals.reduce((s, g) => s + getGoalProgress(g.id, g.spaceId || activeSpace || undefined), 0);
  const totalGoalTarget = goals.reduce((s, g) => s + g.targetAmount, 0);
  const totalGoalPct = totalGoalTarget > 0
    ? clamp((totalGoalProgress / totalGoalTarget) * 100, 0, 100)
    : 0;

  const handleSaveTransaction = async (data: Omit<Transaction, 'id' | 'createdAt'>) => {
    if (editTarget) {
      await updateTransaction(editTarget.id, { ...data, spaceId: editTarget.spaceId || activeSpace || 'pribadi' });
    } else {
      await addTransaction({ ...data, spaceId: data.spaceId || activeSpace || 'pribadi' });
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
      {/* ─── DESKTOP HEADER (hidden on mobile, and hidden when isFamily so FamilyDashboardRedesign renders its exact header) ─── */}
      {!isFamily && (
        <div className="desktop-only-view">
          <Header title="Dashboard" subtitle="Ringkasan keuangan Anda bulan ini" />
        </div>
      )}

      {/* ─── MOBILE HEADER (hidden on desktop, hidden in family mode because FamilyDashboardRedesign renders its own header) ─── */}
      {!isFamily && (
        <div className="mobile-only-view mobile-dashboard-header">
          <div className="mobile-db-greeting">
            <div>
              <div className="mobile-db-hello">
                Halo, {userName.split(' ')[0]}
              </div>
              <div className="mobile-db-appname">
                Duitku Pribadi
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <SpaceSwitcher />
              <div className="mobile-db-avatar">
                <User size={20} />
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="page-container">

        {/* ─── MOBILE LAYOUT ─── */}
        <div className="mobile-only-view" style={{ flexDirection: 'column', gap: 16 }}>
          {isFamily ? (
            <div style={{ width: '100%' }}>
              {/* Consistency Audit Alert (if discrepancy detected) */}
              {!summary.isConsistent && (
                <div style={{ background: '#fef2f2', border: '1px solid #f87171', color: '#991b1b', padding: '10px 14px', borderRadius: 10, marginBottom: 16, fontSize: 13, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span>⚠️ Data keuangan tidak seimbang. Periksa transaksi kas masuk/keluar.</span>
                </div>
              )}

              {/* Exact Redesigned Family Dashboard (Mobile View) */}
              <FamilyDashboardRedesign
                isMobile={true}
                year={year}
                month={month}
                userName={userName}
              />

              {/* Mobile Recent Transactions */}
              <div className="mobile-section" style={{ marginTop: 20 }}>
                <div className="mobile-section-header">
                  <span className="mobile-section-title">Transaksi kas terbaru</span>
                  <Link href="/transactions" className="mobile-section-action">Lihat semua</Link>
                </div>

                {recentTxns.length === 0 ? (
                  <div className="empty-state" style={{ padding: '24px 0' }}>
                    <div className="empty-state-icon">💸</div>
                    <h3>Belum ada transaksi</h3>
                    <p>Mulai catat transaksi kas bersama hari ini!</p>
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
          ) : (
            <>
              {/* Balance Card */}
              <div className="mobile-balance-card">
                <div className="mobile-balance-label">
                  Total saldo kas
                </div>
                <div className="mobile-balance-amount">{formatCurrency(summary.closingBalance)}</div>
                {summary.initialBalance !== 0 && (
                  <div style={{ fontSize: 11, opacity: 0.85, marginTop: -4, marginBottom: 8 }}>
                    Saldo awal: {formatCurrency(summary.initialBalance)} · Bulan ini: {summary.netCashFlow >= 0 ? '+' : ''}{formatCurrency(summary.netCashFlow)}
                  </div>
                )}
                <div className="mobile-balance-row">
                  <div className="mobile-balance-stat">
                    <span className="mobile-balance-stat-icon income">↗</span>
                    <div>
                      <div className="mobile-balance-stat-label">Pemasukan</div>
                      <div className="mobile-balance-stat-val income">{formatCurrency(summary.totalCashIn, true)}</div>
                    </div>
                  </div>
                  <div className="mobile-balance-stat">
                    <span className="mobile-balance-stat-icon expense">↙</span>
                    <div>
                      <div className="mobile-balance-stat-label">Pengeluaran</div>
                      <div className="mobile-balance-stat-val expense">{formatCurrency(summary.totalCashOut, true)}</div>
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
                          className="mobile-progress-bar-fill budget"
                          style={{ width: `${budgetPct}%` }}
                        />
                      </div>
                      <div className="mobile-progress-sub">
                        {budgetPct.toFixed(0)}% dari {formatCurrency(totalBudgetAllocated, true)}
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
                        {formatCurrency(totalGoalProgress, true)} / {formatCurrency(totalGoalTarget, true)}
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
                            {t.type === 'masuk' ? '+' : '-'}{formatCurrency(t.amount)}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* ─── DESKTOP LAYOUT ─── */}
        <div className="desktop-only-view" style={{ width: '100%' }}>
          {isFamily ? (
            <div>
              {/* Consistency Audit Alert (if discrepancy detected) */}
              {!summary.isConsistent && (
                <div style={{ background: '#fef2f2', border: '1px solid #f87171', color: '#991b1b', padding: '10px 14px', borderRadius: 10, marginBottom: 16, fontSize: 13, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span>⚠️ Data keuangan tidak seimbang. Periksa transaksi kas masuk/keluar.</span>
                </div>
              )}

              {/* Exact Redesigned Family Dashboard (Screenshot Match) */}
              <FamilyDashboardRedesign
                year={year}
                month={month}
                userName={userName}
              />

              {/* Secondary Sections: Recent Transactions & Money Flow */}
              <div className="dashboard-grid" style={{ width: '100%', maxWidth: '100%', minWidth: 0, boxSizing: 'border-box', marginTop: 24 }}>
                {/* Left Column: Recent Transactions */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 20, minWidth: 0, width: '100%', maxWidth: '100%', boxSizing: 'border-box' }}>
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

                {/* Right Column: Arus Uang */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 20, minWidth: 0, width: '100%', maxWidth: '100%', boxSizing: 'border-box' }}>
                  <div className="card">
                    <div className="card-header" style={{ minWidth: 0 }}>
                      <span className="card-title" style={{ minWidth: 0, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>Arus Uang (Money Flow)</span>
                      <span className="text-sm text-muted">7 bulan terakhir</span>
                    </div>
                    <MoneyFlowChart months={7} />
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <>
              {/* Consistency Audit Alert (if discrepancy detected) */}
              {!summary.isConsistent && (
                <div style={{ background: '#fef2f2', border: '1px solid #f87171', color: '#991b1b', padding: '10px 14px', borderRadius: 10, marginBottom: 16, fontSize: 13, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span>⚠️ Data keuangan tidak seimbang. Periksa transaksi kas masuk/keluar.</span>
                </div>
              )}

              {/* Personal Summary Cards */}
              <div className="summary-grid mb-5">
                <SummaryCard
                  label="Total Saldo Kas"
                  value={summary.closingBalance}
                  variant="hero"
                  initialBalance={summary.initialBalance}
                  netSurplus={summary.netCashFlow}
                  freeMoney={summary.freeMoneyOrDeficit}
                  remainingBudget={summary.remainingBudget}
                />
                <SummaryCard
                  label="Pemasukan (Bulan Ini)"
                  value={summary.totalCashIn}
                  growthPct={summary.incomeGrowthPct}
                  comparisonLabel={summary.comparisonPeriodLabel}
                  variant="income"
                />
                <SummaryCard
                  label="Pengeluaran (Bulan Ini)"
                  value={summary.totalCashOut}
                  growthPct={summary.expenseGrowthPct}
                  comparisonLabel={summary.comparisonPeriodLabel}
                  variant="expense"
                />
                <SummaryCard
                  label="Total Tabungan"
                  value={summary.totalSavingsStored}
                  variant="savings"
                  badgeLabel="Akumulasi sampai hari ini"
                  subtitle="Pos simpanan pribadi"
                />
              </div>

              {/* Personal Main Grid */}
              <div className="dashboard-grid" style={{ width: '100%', maxWidth: '100%', minWidth: 0, boxSizing: 'border-box' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 20, minWidth: 0, width: '100%', maxWidth: '100%', boxSizing: 'border-box' }}>
                  <div className="card">
                    <div className="card-header" style={{ minWidth: 0 }}>
                      <span className="card-title" style={{ minWidth: 0, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>Arus Uang (Money Flow)</span>
                      <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexShrink: 0 }}>
                        <span className="text-sm text-muted">7 bulan terakhir</span>
                      </div>
                    </div>
                    <MoneyFlowChart months={7} />
                  </div>

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

                <div style={{ display: 'flex', flexDirection: 'column', gap: 20, minWidth: 0, width: '100%', maxWidth: '100%', boxSizing: 'border-box' }}>
                  <div className="card">
                    <div className="card-header" style={{ minWidth: 0 }}>
                      <span className="card-title" style={{ minWidth: 0, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>Anggaran</span>
                      <a href="/budget" className="card-action" style={{ flexShrink: 0 }}>Lihat semua →</a>
                    </div>
                    <BudgetDonut items={budgetItems} />
                  </div>

                  <div className="card">
                    <div className="card-header" style={{ minWidth: 0 }}>
                      <span className="card-title" style={{ minWidth: 0, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>Target Tabungan</span>
                      <a href="/goals" className="card-action" style={{ flexShrink: 0 }}>Lihat semua →</a>
                    </div>
                    <SavingGoalsList goals={goals.slice(0, 4)} />
                  </div>
                </div>
              </div>
            </>
          )}
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
