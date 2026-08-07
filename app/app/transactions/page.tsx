'use client';
import { useEffect, useState, useMemo } from 'react';
import { Plus, Search, ChevronLeft, ChevronRight, X, SlidersHorizontal } from 'lucide-react';
import Header from '@/components/Header';
import RecentTransactions from '@/components/RecentTransactions';
import TransactionModal from '@/components/TransactionModal';
import {
  getTransactions, addTransaction, updateTransaction, deleteTransaction,
  getCategories, getBudgetPos, getSavingGoals,
} from '@/lib/store';
import { Transaction, Category, BudgetPos, SavingGoal } from '@/lib/types';
import { formatCurrency, getCurrentMonth, getMonthName } from '@/lib/helpers';
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
      <Header title="Transaksi" subtitle="Kelola semua pemasukan dan pengeluaran" />

      <div className="page-container">
        {/* Stats Row */}
        <div className="stats-row-3">
          <div className="card" style={{ padding: '16px 20px' }}>
            <p className="text-sm text-muted">Total Transaksi</p>
            <p className="font-700" style={{ fontSize: 22, color: 'var(--text-primary)', marginTop: 4 }}>
              {filtered.length}
            </p>
          </div>
          <div className="card" style={{ padding: '16px 20px' }}>
            <p className="text-sm text-muted">Total Masuk</p>
            <p className="font-700 amount-positive" style={{ fontSize: 22, marginTop: 4 }}>
              +{formatCurrency(totalIn)}
            </p>
          </div>
          <div className="card" style={{ padding: '16px 20px' }}>
            <p className="text-sm text-muted">Total Keluar</p>
            <p className="font-700 amount-negative" style={{ fontSize: 22, marginTop: 4 }}>
              -{formatCurrency(totalOut)}
            </p>
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
