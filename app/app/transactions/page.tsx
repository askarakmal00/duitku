'use client';
import { useEffect, useState, useMemo } from 'react';
import { Plus, Search, ChevronLeft, ChevronRight, X, SlidersHorizontal, Hash, TrendingUp, TrendingDown, FileSpreadsheet } from 'lucide-react';
import Header from '@/components/Header';
import RecentTransactions from '@/components/RecentTransactions';
import TransactionModal from '@/components/TransactionModal';
import BulkImportModal from '@/components/BulkImportModal';
import {
  getTransactions, addTransaction, updateTransaction, deleteTransaction,
  getCategories, getBudgetPos, getSavingGoals,
} from '@/lib/store';
import { Transaction, Category, BudgetPos, SavingGoal } from '@/lib/types';
import { formatCurrency, getCurrentMonth, getMonthName, getCategoryEmoji, getRelativeTime } from '@/lib/helpers';
import ConfirmDeleteModal from '@/components/ConfirmDeleteModal';
import { useDataRefresh } from '@/lib/useDataRefresh';
import { useCallback } from 'react';

type TypeFilter = 'semua' | 'masuk' | 'keluar';

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [budgetPosList, setBudgetPosList] = useState<BudgetPos[]>([]);
  const [goals, setGoals] = useState<SavingGoal[]>([]);

  // Period filter: default to current month
  const { year: currentYear, month: currentMonth } = getCurrentMonth();
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [selectedMonth, setSelectedMonth] = useState(currentMonth); // 0 = Semua bulan
  const [showAllMonths, setShowAllMonths] = useState(false);

  // Type filter
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('semua');

  // Dropdown filters
  const [filterCategory, setFilterCategory] = useState('');
  const [filterBudget, setFilterBudget] = useState('');
  const [filterGoal, setFilterGoal] = useState('');

  // Search
  const [search, setSearch] = useState('');

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [editTarget, setEditTarget] = useState<Transaction | undefined>();
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Show/hide advanced filters panel
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  const load = useCallback(() => {
    setTransactions(getTransactions());
    setCategories(getCategories());
    setBudgetPosList(getBudgetPos());
    setGoals(getSavingGoals());
  }, []);
  useDataRefresh(load);

  // Navigate months
  const goToPrevMonth = () => {
    if (selectedMonth === 1) {
      setSelectedMonth(12);
      setSelectedYear(y => y - 1);
    } else {
      setSelectedMonth(m => m - 1);
    }
    setShowAllMonths(false);
  };

  const goToNextMonth = () => {
    if (selectedMonth === 12) {
      setSelectedMonth(1);
      setSelectedYear(y => y + 1);
    } else {
      setSelectedMonth(m => m + 1);
    }
    setShowAllMonths(false);
  };

  const goToCurrentMonth = () => {
    setSelectedYear(currentYear);
    setSelectedMonth(currentMonth);
    setShowAllMonths(false);
  };

  const isCurrentMonth = selectedYear === currentYear && selectedMonth === currentMonth && !showAllMonths;

  const filtered = useMemo(() => {
    return transactions.filter(t => {
      // Period filter
      if (!showAllMonths) {
        const d = new Date(t.date);
        if (d.getFullYear() !== selectedYear || d.getMonth() + 1 !== selectedMonth) return false;
      }
      // Type filter
      if (typeFilter === 'masuk' && t.type !== 'masuk') return false;
      if (typeFilter === 'keluar' && t.type !== 'keluar') return false;
      // Category filter
      if (filterCategory && t.category !== filterCategory) return false;
      // Budget filter
      if (filterBudget && t.budgetPosId !== filterBudget) return false;
      // Goal filter
      if (filterGoal && t.goalId !== filterGoal) return false;
      // Search
      if (search) {
        const q = search.toLowerCase();
        if (!t.note?.toLowerCase().includes(q) && !t.category.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [transactions, showAllMonths, selectedYear, selectedMonth, typeFilter, filterCategory, filterBudget, filterGoal, search]);

  const totalIn = filtered.filter(t => t.type === 'masuk').reduce((s, t) => s + t.amount, 0);
  const totalOut = filtered.filter(t => t.type === 'keluar').reduce((s, t) => s + t.amount, 0);

  const handleSave = async (data: Omit<Transaction, 'id' | 'createdAt'>) => {
    if (editTarget) {
      await updateTransaction(editTarget.id, data);
    } else {
      await addTransaction(data);
    }
    setShowModal(false);
    setEditTarget(undefined);
    load();
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
      load();
    } finally {
      setIsDeleting(false);
      setDeleteId(null);
    }
  };

  // Count active advanced filters
  const activeAdvancedCount = [filterCategory, filterBudget, filterGoal].filter(Boolean).length;

  // Get unique categories used in transactions for filter dropdown
  const usedCategories = useMemo(() => {
    const names = new Set(transactions.map(t => t.category));
    return categories.filter(c => names.has(c.name));
  }, [transactions, categories]);

  // Budget/goals only those used in transactions
  const usedBudgets = useMemo(() => {
    const ids = new Set(transactions.map(t => t.budgetPosId).filter(Boolean));
    return budgetPosList.filter(b => ids.has(b.id));
  }, [transactions, budgetPosList]);

  const usedGoals = useMemo(() => {
    const ids = new Set(transactions.map(t => t.goalId).filter(Boolean));
    return goals.filter(g => ids.has(g.id));
  }, [transactions, goals]);

  return (
    <>
      {/* ─── MOBILE VIEW (Image 1) ─── */}
      <div className="mobile-only-view page-container" style={{ flexDirection: 'column', gap: 14 }}>
        <div className="mobile-page-header">
          <div className="mobile-page-title">Transaksi</div>
          <div className="mobile-page-subtitle">Kelola semua pemasukan dan pengeluaran</div>
        </div>

        {/* Card 1: Total transaksi */}
        <div className="mobile-stat-card">
          <div className="mobile-stat-label">Total transaksi</div>
          <div className="mobile-stat-val">{filtered.length}</div>
          <div className="mobile-stat-sub">
            {showAllMonths ? 'Semua waktu' : getMonthName(selectedYear, selectedMonth)}
          </div>
        </div>

        {/* Grid 2: Total masuk & Total keluar */}
        <div className="mobile-grid-2">
          <div className="mobile-stat-card">
            <div className="mobile-stat-label">Total masuk</div>
            <div className="mobile-stat-val income">+{formatCurrency(totalIn, true)}</div>
            <div className="mobile-stat-sub">{filtered.filter(t => t.type === 'masuk').length} transaksi</div>
          </div>
          <div className="mobile-stat-card">
            <div className="mobile-stat-label">Total keluar</div>
            <div className="mobile-stat-val expense">-{formatCurrency(totalOut, true)}</div>
            <div className="mobile-stat-sub">{filtered.filter(t => t.type === 'keluar').length} transaksi</div>
          </div>
        </div>

        {/* Month Navigator */}
        <div className="mobile-month-nav">
          <button className="mobile-month-arrow" onClick={goToPrevMonth} aria-label="Bulan sebelumnya">
            <ChevronLeft size={20} />
          </button>
          <span className="mobile-month-title">
            {showAllMonths ? 'Semua Waktu' : getMonthName(selectedYear, selectedMonth)}
          </span>
          <button className="mobile-month-arrow" onClick={goToNextMonth} aria-label="Bulan berikutnya" disabled={showAllMonths}>
            <ChevronRight size={20} />
          </button>
        </div>

        {/* Filter Pills */}
        <div className="mobile-filter-pills">
          <button
            className={`mobile-pill ${typeFilter === 'semua' ? 'active' : ''}`}
            onClick={() => setTypeFilter('semua')}
          >
            Semua
          </button>
          <button
            className={`mobile-pill ${typeFilter === 'masuk' ? 'active' : ''}`}
            onClick={() => setTypeFilter('masuk')}
          >
            Pemasukan
          </button>
          <button
            className={`mobile-pill ${typeFilter === 'keluar' ? 'active' : ''}`}
            onClick={() => setTypeFilter('keluar')}
          >
            Pengeluaran
          </button>
        </div>

        {/* Search input */}
        <div className="mobile-search-bar">
          <input
            type="text"
            className="mobile-search-input"
            placeholder="Cari transaksi..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        {/* Transactions list */}
        {filtered.length === 0 ? (
          <div className="empty-state" style={{ padding: '24px 0' }}>
            <div className="empty-state-icon">💸</div>
            <h3>Tidak ada transaksi</h3>
            <p>Coba ubah kata kunci pencarian atau filter Anda.</p>
          </div>
        ) : (
          <div className="mobile-txn-list-v2">
            {filtered.map(t => {
              const emoji = getCategoryEmoji(t.category);
              return (
                <div key={t.id} className="mobile-txn-v2-item" onClick={() => handleEdit(t)} style={{ cursor: 'pointer' }}>
                  <div className={`mobile-txn-v2-icon ${t.type}`}>
                    <span>{emoji}</span>
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

      {/* ─── DESKTOP VIEW ─── */}
      <div className="desktop-only-view">
        <Header title="Transaksi" subtitle="Kelola semua pemasukan dan pengeluaran" />

        <div className="page-container">
          {/* Unified Stat Card — Transactions (indigo accent) */}
          <div className="page-stat-card" style={{
          background: 'linear-gradient(135deg, #EEF2FF 0%, #E0E7FF 100%)',
          border: '1px solid #C7D2FE',
          marginBottom: 20,
          position: 'relative',
        }}>
          <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 4, background: '#4F46E5', borderRadius: '4px 0 0 4px' }} />
          <div className="psc-item">
            <div className="psc-header">
              <div className="psc-icon" style={{ background: 'rgba(79,70,229,0.12)', color: '#4F46E5' }}><Hash size={16} /></div>
              <span className="psc-label" style={{ color: '#4338CA' }}>Total Transaksi</span>
            </div>
            <div className="psc-value" style={{ color: '#3730A3' }}>{filtered.length}</div>
            <div className="psc-sub">{showAllMonths ? 'semua waktu' : getMonthName(selectedYear, selectedMonth)}</div>
          </div>

          <div className="psc-divider" />

          <div className="psc-item">
            <div className="psc-header">
              <div className="psc-icon" style={{ background: 'rgba(16,185,129,0.12)', color: '#059669' }}><TrendingDown size={16} /></div>
              <span className="psc-label" style={{ color: '#4338CA' }}>Total Masuk</span>
            </div>
            <div className="psc-value" style={{ color: 'var(--success)' }}>+{formatCurrency(totalIn)}</div>
            <div className="psc-sub">{filtered.filter(t => t.type === 'masuk').length} transaksi</div>
          </div>

          <div className="psc-divider" />

          <div className="psc-item">
            <div className="psc-header">
              <div className="psc-icon" style={{ background: 'rgba(239,68,68,0.12)', color: '#DC2626' }}><TrendingUp size={16} /></div>
              <span className="psc-label" style={{ color: '#4338CA' }}>Total Keluar</span>
            </div>
            <div className="psc-value" style={{ color: 'var(--danger)' }}>-{formatCurrency(totalOut)}</div>
            <div className="psc-sub">{filtered.filter(t => t.type === 'keluar').length} transaksi</div>
          </div>
        </div>

        <div className="card">
          {/* Period Navigator */}
          <div className="txn-period-nav">
            <button className="txn-period-btn" onClick={goToPrevMonth} aria-label="Bulan sebelumnya">
              <ChevronLeft size={16} />
            </button>

            <div className="txn-period-center">
              {showAllMonths ? (
                <span className="txn-period-label">Semua Waktu</span>
              ) : (
                <span className="txn-period-label">
                  {getMonthName(selectedYear, selectedMonth)}
                </span>
              )}
              {!isCurrentMonth && !showAllMonths && (
                <button className="txn-go-current" onClick={goToCurrentMonth}>
                  Kembali ke Bulan Ini
                </button>
              )}
            </div>

            <button className="txn-period-btn" onClick={goToNextMonth} aria-label="Bulan berikutnya" disabled={showAllMonths}>
              <ChevronRight size={16} />
            </button>

            <button
              className={`txn-period-all ${showAllMonths ? 'active' : ''}`}
              onClick={() => setShowAllMonths(v => !v)}
              title="Tampilkan semua waktu"
            >
              Semua
            </button>
          </div>

          {/* Toolbar */}
          <div className="transactions-toolbar">
            <div className="filter-bar-wrap">
              <div className="filter-bar" style={{ marginBottom: 0 }}>
                {(['semua', 'masuk', 'keluar'] as TypeFilter[]).map(f => (
                  <button
                    key={f}
                    className={`filter-chip ${typeFilter === f ? 'active' : ''}`}
                    onClick={() => setTypeFilter(f)}
                  >
                    {f === 'semua' ? 'Semua' : f === 'masuk' ? '↑ Pemasukan' : '↓ Pengeluaran'}
                  </button>
                ))}
              </div>
            </div>

            <div className="search-action-group">
              <div style={{ position: 'relative', flex: 1, minWidth: 0 }}>
                <Search size={15} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input
                  className="form-input"
                  style={{ paddingLeft: 32, marginBottom: 0, width: '100%', minWidth: 0 }}
                  placeholder="Cari transaksi..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                />
              </div>

              {/* Advanced filter toggle */}
              <button
                className={`btn ${showAdvancedFilters || activeAdvancedCount > 0 ? 'btn-primary' : 'btn-ghost'}`}
                onClick={() => setShowAdvancedFilters(v => !v)}
                style={{ flexShrink: 0, position: 'relative', gap: 6 }}
                title="Filter lanjutan"
              >
                <SlidersHorizontal size={15} />
                {activeAdvancedCount > 0 && (
                  <span className="txn-filter-badge">{activeAdvancedCount}</span>
                )}
              </button>

              <button
                className="btn btn-ghost"
                onClick={() => setShowBulkModal(true)}
                style={{ flexShrink: 0, gap: 6 }}
                title="Import transaksi dari CSV / Excel"
              >
                <FileSpreadsheet size={15} />
                <span className="desktop-only-inline">Bulk Import</span>
              </button>

              <button className="btn btn-primary desktop-only-inline" onClick={() => { setEditTarget(undefined); setShowModal(true); }}>
                <Plus size={16} /> Tambah
              </button>
            </div>
          </div>

          {/* Advanced Filters Panel */}
          {showAdvancedFilters && (
            <div className="txn-advanced-filters">
              <div className="txn-adv-filter-group">
                <label className="txn-adv-label">Kategori</label>
                <div className="txn-adv-select-wrap">
                  <select
                    className="form-input txn-adv-select"
                    value={filterCategory}
                    onChange={e => setFilterCategory(e.target.value)}
                  >
                    <option value="">Semua Kategori</option>
                    {usedCategories.map(c => (
                      <option key={c.id} value={c.name}>{c.name}</option>
                    ))}
                  </select>
                  {filterCategory && (
                    <button className="txn-adv-clear" onClick={() => setFilterCategory('')} aria-label="Hapus filter kategori">
                      <X size={13} />
                    </button>
                  )}
                </div>
              </div>

              <div className="txn-adv-filter-group">
                <label className="txn-adv-label">Anggaran</label>
                <div className="txn-adv-select-wrap">
                  <select
                    className="form-input txn-adv-select"
                    value={filterBudget}
                    onChange={e => setFilterBudget(e.target.value)}
                    disabled={usedBudgets.length === 0}
                  >
                    <option value="">Semua Anggaran</option>
                    {usedBudgets.map(b => (
                      <option key={b.id} value={b.id}>{b.name}</option>
                    ))}
                  </select>
                  {filterBudget && (
                    <button className="txn-adv-clear" onClick={() => setFilterBudget('')} aria-label="Hapus filter anggaran">
                      <X size={13} />
                    </button>
                  )}
                </div>
                {usedBudgets.length === 0 && (
                  <p className="txn-adv-empty">Tidak ada transaksi dengan anggaran</p>
                )}
              </div>

              <div className="txn-adv-filter-group">
                <label className="txn-adv-label">Goals</label>
                <div className="txn-adv-select-wrap">
                  <select
                    className="form-input txn-adv-select"
                    value={filterGoal}
                    onChange={e => setFilterGoal(e.target.value)}
                    disabled={usedGoals.length === 0}
                  >
                    <option value="">Semua Goals</option>
                    {usedGoals.map(g => (
                      <option key={g.id} value={g.id}>{g.name}</option>
                    ))}
                  </select>
                  {filterGoal && (
                    <button className="txn-adv-clear" onClick={() => setFilterGoal('')} aria-label="Hapus filter goal">
                      <X size={13} />
                    </button>
                  )}
                </div>
                {usedGoals.length === 0 && (
                  <p className="txn-adv-empty">Tidak ada transaksi dengan goals</p>
                )}
              </div>

              {activeAdvancedCount > 0 && (
                <button
                  className="txn-reset-filters"
                  onClick={() => { setFilterCategory(''); setFilterBudget(''); setFilterGoal(''); }}
                >
                  <X size={13} /> Reset Semua Filter
                </button>
              )}
            </div>
          )}

          <RecentTransactions
            transactions={filtered}
            showAll
            onEdit={handleEdit}
            onDelete={handleDeleteRequest}
          />
        </div>
      </div>
      </div>

      {/* FAB: mobile-only floating add button */}
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
          onSave={handleSave}
          onClose={() => { setShowModal(false); setEditTarget(undefined); }}
        />
      )}

      {showBulkModal && (
        <BulkImportModal
          onSuccess={() => {
            setShowBulkModal(false);
            load();
          }}
          onClose={() => setShowBulkModal(false)}
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
