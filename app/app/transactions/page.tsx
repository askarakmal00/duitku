'use client';
import { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import {
  Plus, Search, ChevronLeft, ChevronRight, X, SlidersHorizontal,
  Wallet, MoreHorizontal, Pencil, Trash2, Bell, FileSpreadsheet
} from 'lucide-react';
import SpaceSwitcher from '@/components/SpaceSwitcher';
import TransactionModal from '@/components/TransactionModal';
import BulkImportModal from '@/components/BulkImportModal';
import ConfirmDeleteModal from '@/components/ConfirmDeleteModal';
import {
  getTransactions, addTransaction, updateTransaction, deleteTransaction,
  getCategories, getBudgetPos, getSavingGoals,
} from '@/lib/store';
import { Transaction, Category, BudgetPos, SavingGoal } from '@/lib/types';
import { formatCurrency, getCurrentMonth, getMonthName } from '@/lib/helpers';
import { useDataRefresh } from '@/lib/useDataRefresh';
import { useSpace } from '@/lib/useSpace';

type TypeFilter = 'semua' | 'masuk' | 'keluar';

function formatDesktopDate(dateStr: string): string {
  const d = new Date(dateStr);
  const day = String(d.getDate()).padStart(2, '0');
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
  const m = monthNames[d.getMonth()] || 'Okt';
  return `${day} ${m} ${d.getFullYear()}`;
}

function formatTime(createdAt?: string): string {
  if (createdAt) {
    const d = new Date(createdAt);
    if (!isNaN(d.getTime())) {
      const h = String(d.getHours()).padStart(2, '0');
      const min = String(d.getMinutes()).padStart(2, '0');
      return `${h}.${min}`;
    }
  }
  return '12.00';
}

function formatMobileDate(dateStr: string, createdAt?: string): string {
  const d = new Date(dateStr);
  const day = String(d.getDate()).padStart(2, '0');
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
  const m = monthNames[d.getMonth()] || 'Okt';
  return `${day} ${m}, ${formatTime(createdAt)}`;
}

function getAvatarInfo(t: Transaction, idx: number) {
  if (t.paidBy === 'asykar') return { initial: 'A', bg: '#2563EB' };
  if (t.paidBy === 'istri') return { initial: 'R', bg: '#EC4899' };
  if (t.paidBy === 'bersama') return { initial: 'K', bg: '#10B981' };
  const lower = (t.note || '').toLowerCase();
  if (lower.includes('asykar')) return { initial: 'A', bg: '#2563EB' };
  if (lower.includes('riska') || lower.includes('istri')) return { initial: 'R', bg: '#EC4899' };
  if (lower.includes('anak') || lower.includes('bayi')) {
    return { initial: idx % 2 === 0 ? 'A' : 'R', bg: idx % 2 === 0 ? '#2563EB' : '#EC4899' };
  }
  const letter = (t.note || t.category || 'T').trim()[0]?.toUpperCase() || 'T';
  return { initial: letter, bg: t.type === 'masuk' ? '#10B981' : '#2563EB' };
}

function getMobileIcon(t: Transaction) {
  const cat = (t.category || '').toLowerCase();
  const note = (t.note || '').toLowerCase();
  if (cat.includes('anak') || note.includes('anak') || note.includes('bayi')) {
    return { bg: '#FFEDD5', color: '#EA580C', icon: '👶' };
  }
  if (cat.includes('tabung') || note.includes('tabung') || cat.includes('invest')) {
    return { bg: '#DBEAFE', color: '#2563EB', icon: '🏦' };
  }
  if (cat.includes('makan') || note.includes('makan') || note.includes('restoran')) {
    return { bg: '#FEE2E2', color: '#DC2626', icon: '🍜' };
  }
  if (t.type === 'masuk') {
    return { bg: '#DCFCE7', color: '#16A34A', icon: '💰' };
  }
  return { bg: '#F1F5F9', color: '#475569', icon: '💳' };
}

function getCategoryBadge(category: string) {
  const cat = (category || '').toLowerCase();
  if (cat.includes('anak')) {
    return { bg: '#FFF7ED', border: '#FFEDD5', text: '#C2410C' };
  }
  if (cat.includes('tabung') || cat.includes('investasi')) {
    return { bg: '#EFF6FF', border: '#DBEAFE', text: '#1D4ED8' };
  }
  if (cat.includes('gaji') || cat.includes('income') || cat.includes('masuk')) {
    return { bg: '#F0FDF4', border: '#DCFCE7', text: '#15803D' };
  }
  if (cat.includes('makan')) {
    return { bg: '#FEF2F2', border: '#FEE2E2', text: '#B91C1C' };
  }
  return { bg: '#F8FAFC', border: '#E2E8F0', text: '#475569' };
}

export default function TransactionsPage() {
  const { activeSpace } = useSpace();
  const currentSpace = activeSpace || 'pribadi';

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [budgetPosList, setBudgetPosList] = useState<BudgetPos[]>([]);
  const [goals, setGoals] = useState<SavingGoal[]>([]);

  // Period filter: default to current month
  const { year: currentYear, month: currentMonth } = getCurrentMonth();
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [selectedMonth, setSelectedMonth] = useState(currentMonth);
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

  // Action menu dropdown state for table
  const [actionMenuId, setActionMenuId] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

  // Show/hide advanced filters panel
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  const load = useCallback(() => {
    setTransactions(getTransactions(activeSpace || undefined));
    setCategories(getCategories());
    setBudgetPosList(getBudgetPos(activeSpace || undefined));
    setGoals(getSavingGoals(activeSpace || undefined));
  }, [activeSpace]);

  useDataRefresh(load);

  // Close action menu when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setActionMenuId(null);
      }
    }
    if (actionMenuId) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [actionMenuId]);

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

  // 1. Calculate Running Balance for EVERY transaction in chronological ascending order
  const { runningBalanceMap, currentBalance } = useMemo(() => {
    const sortedAsc = [...transactions].sort((a, b) => {
      const da = new Date(a.date).getTime();
      const db = new Date(b.date).getTime();
      if (da !== db) return da - db;
      const ca = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const cb = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return ca - cb;
    });

    const map = new Map<string, number>();
    let bal = 0;
    for (const t of sortedAsc) {
      if (t.type === 'masuk') {
        bal += t.amount;
      } else {
        bal -= t.amount;
      }
      map.set(t.id, bal);
    }
    return { runningBalanceMap: map, currentBalance: bal };
  }, [transactions]);

  // 2. Filter transactions based on month, type, category, budget, goal, and search
  const filtered = useMemo(() => {
    return transactions
      .filter(t => {
        if (!showAllMonths) {
          const d = new Date(t.date);
          if (d.getFullYear() !== selectedYear || d.getMonth() + 1 !== selectedMonth) return false;
        }
        if (typeFilter === 'masuk' && t.type !== 'masuk') return false;
        if (typeFilter === 'keluar' && t.type !== 'keluar') return false;
        if (filterCategory && t.category !== filterCategory) return false;
        if (filterBudget && t.budgetPosId !== filterBudget) return false;
        if (filterGoal && t.goalId !== filterGoal) return false;
        if (search) {
          const q = search.toLowerCase();
          if (!t.note?.toLowerCase().includes(q) && !t.category.toLowerCase().includes(q)) return false;
        }
        return true;
      })
      .sort((a, b) => {
        const da = new Date(a.date).getTime();
        const db = new Date(b.date).getTime();
        if (da !== db) return db - da;
        const ca = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const cb = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return cb - ca;
      });
  }, [transactions, showAllMonths, selectedYear, selectedMonth, typeFilter, filterCategory, filterBudget, filterGoal, search]);

  const totalIn = filtered.filter(t => t.type === 'masuk').reduce((s, t) => s + t.amount, 0);
  const totalOut = filtered.filter(t => t.type === 'keluar').reduce((s, t) => s + t.amount, 0);
  const countIn = filtered.filter(t => t.type === 'masuk').length;
  const countOut = filtered.filter(t => t.type === 'keluar').length;

  const handleSave = async (data: Omit<Transaction, 'id' | 'createdAt'>) => {
    if (editTarget) {
      await updateTransaction(editTarget.id, { ...data, spaceId: editTarget.spaceId || currentSpace });
    } else {
      await addTransaction({ ...data, spaceId: data.spaceId || currentSpace });
    }
    setShowModal(false);
    setEditTarget(undefined);
    load();
  };

  const handleEdit = (t: Transaction) => {
    setActionMenuId(null);
    setEditTarget(t);
    setShowModal(true);
  };

  const handleDeleteRequest = (id: string) => {
    setActionMenuId(null);
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

  const activeAdvancedCount = [filterCategory, filterBudget, filterGoal].filter(Boolean).length;

  const usedCategories = useMemo(() => {
    const names = new Set(transactions.map(t => t.category).filter(Boolean));
    const allKnown = new Map<string, { id: string; name: string }>();
    categories.forEach(c => allKnown.set(c.name, { id: c.id, name: c.name }));
    names.forEach(name => {
      if (!allKnown.has(name)) {
        allKnown.set(name, { id: name, name });
      }
    });
    return Array.from(allKnown.values()).filter(c => names.has(c.name));
  }, [transactions, categories]);

  const usedBudgets = useMemo(() => {
    const ids = new Set(transactions.map(t => t.budgetPosId).filter(Boolean));
    return budgetPosList.filter(b => ids.has(b.id));
  }, [transactions, budgetPosList]);

  const usedGoals = useMemo(() => {
    const ids = new Set(transactions.map(t => t.goalId).filter(Boolean));
    return goals.filter(g => ids.has(g.id));
  }, [transactions, goals]);

  const currentMonthLabel = showAllMonths
    ? 'SEMUA WAKTU'
    : `${getMonthName(selectedYear, selectedMonth).toUpperCase()} ${selectedYear}`;

  const currentMonthDisplay = showAllMonths
    ? 'Semua Waktu'
    : `${getMonthName(selectedYear, selectedMonth)} ${selectedYear}`;

  return (
    <>
      {/* ─── MOBILE VIEW (Reference UI Image 1) ─── */}
      <div className="mobile-only-view page-container" style={{ flexDirection: 'column', gap: 14 }}>
        <div className="mobile-txn-header-wrap">
          <div className="txn-month-tag">{currentMonthLabel}</div>
          <h1 className="txn-page-title">Transaksi</h1>
          <div className="txn-page-subtitle">
            Duitku {activeSpace === 'keluarga' ? 'Keluarga' : 'Pribadi'}
          </div>
        </div>

        {/* Sisa Saldo Row */}
        <div className="txn-sisa-saldo-card">
          <div className="txn-sisa-saldo-left">
            <div className="txn-wallet-icon-wrap">
              <Wallet size={17} />
            </div>
            <span>Sisa saldo</span>
          </div>
          <div className="txn-sisa-saldo-val">
            {formatCurrency(currentBalance)}
          </div>
        </div>

        {/* 2 Stat Cards: Total Masuk & Total Keluar */}
        <div className="mobile-grid-2">
          <div className="txn-stat-card-clean">
            <div className="txn-stat-card-label">Total masuk</div>
            <div className="txn-stat-card-val income">+{formatCurrency(totalIn)}</div>
            <div className="txn-stat-card-sub">{countIn} transaksi</div>
          </div>
          <div className="txn-stat-card-clean">
            <div className="txn-stat-card-label">Total keluar</div>
            <div className="txn-stat-card-val expense">-{formatCurrency(totalOut)}</div>
            <div className="txn-stat-card-sub">{countOut} transaksi</div>
          </div>
        </div>

        {/* Month Navigator */}
        <div className="txn-month-navigator" style={{ justifyContent: 'center', width: '100%', margin: '2px 0' }}>
          <button className="txn-nav-arrow" onClick={goToPrevMonth} aria-label="Bulan sebelumnya">
            <ChevronLeft size={18} />
          </button>
          <span className="txn-nav-month-title">{currentMonthDisplay}</span>
          <button className="txn-nav-arrow" onClick={goToNextMonth} aria-label="Bulan berikutnya" disabled={showAllMonths}>
            <ChevronRight size={18} />
          </button>
        </div>

        {/* Filter Pills */}
        <div className="mobile-filter-pills-row">
          <button
            className={`mobile-filter-pill ${typeFilter === 'semua' ? 'active' : ''}`}
            onClick={() => setTypeFilter('semua')}
          >
            Semua
          </button>
          <button
            className={`mobile-filter-pill ${typeFilter === 'masuk' ? 'active' : ''}`}
            onClick={() => setTypeFilter('masuk')}
          >
            Pemasukan
          </button>
          <button
            className={`mobile-filter-pill ${typeFilter === 'keluar' ? 'active' : ''}`}
            onClick={() => setTypeFilter('keluar')}
          >
            Pengeluaran
          </button>
        </div>

        {/* Search input */}
        <div className="txn-search-input-wrap">
          <Search size={16} className="txn-search-icon" />
          <input
            className="txn-search-input"
            placeholder="Cari transaksi..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          {search && (
            <button className="txn-search-clear" onClick={() => setSearch('')}>
              <X size={14} />
            </button>
          )}
        </div>

        {/* Transactions list with Running Balance */}
        {filtered.length === 0 ? (
          <div className="empty-state" style={{ padding: '28px 0' }}>
            <div className="empty-state-icon">💸</div>
            <h3>Tidak ada transaksi</h3>
            <p>Coba ubah kata kunci pencarian atau filter Anda.</p>
          </div>
        ) : (
          <div className="mobile-txn-card-list">
            {filtered.map((t, idx) => {
              const iconInfo = getMobileIcon(t);
              const runningBal = runningBalanceMap.get(t.id) ?? 0;
              return (
                <div
                  key={t.id}
                  className="mobile-txn-ref-item"
                  onClick={() => handleEdit(t)}
                >
                  <div className="mobile-txn-ref-left">
                    <div
                      className="mobile-txn-pastel-avatar"
                      style={{ background: iconInfo.bg, color: iconInfo.color }}
                    >
                      {iconInfo.icon}
                    </div>
                    <div className="mobile-txn-ref-details">
                      <div className="mobile-txn-ref-name">
                        {t.note || t.category}
                      </div>
                      <div className="mobile-txn-ref-sub">
                        {formatMobileDate(t.date, t.createdAt)} · {t.category}
                      </div>
                    </div>
                  </div>
                  <div className="mobile-txn-ref-right">
                    <div className={`mobile-txn-ref-amount ${t.type === 'masuk' ? 'positive' : 'negative'}`}>
                      {t.type === 'masuk' ? '+' : '-'}{formatCurrency(t.amount)}
                    </div>
                    <div className="mobile-txn-ref-sisa">
                      Sisa {formatCurrency(runningBal)}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ─── DESKTOP VIEW (Reference UI Image 2) ─── */}
      <div className="desktop-only-view page-container" style={{ flexDirection: 'column', gap: 18 }}>
        {/* Desktop Header */}
        <div className="desktop-txn-header-wrap">
          <div>
            <div className="txn-month-tag">{currentMonthLabel}</div>
            <h1 className="txn-page-title" style={{ fontSize: 30 }}>Transaksi</h1>
            <div className="txn-page-subtitle">
              Duitku {activeSpace === 'keluarga' ? 'Keluarga' : 'Pribadi'}
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <SpaceSwitcher />
            <button className="header-btn" title="Cari"><Search size={18} /></button>
            <button className="header-btn notif-btn" title="Notifikasi"><Bell size={18} /></button>
            <div
              className="avatar"
              style={{ background: '#2563EB', color: '#FFFFFF', fontWeight: 700 }}
              title={activeSpace === 'keluarga' ? 'Keluarga' : 'Asykar'}
            >
              {activeSpace === 'keluarga' ? 'K' : 'A'}
            </div>
          </div>
        </div>

        {/* Sisa Saldo Bar */}
        <div className="txn-sisa-saldo-card">
          <div className="txn-sisa-saldo-left">
            <div className="txn-wallet-icon-wrap">
              <Wallet size={18} />
            </div>
            <span>Sisa saldo saat ini</span>
          </div>
          <div className="txn-sisa-saldo-val" style={{ fontSize: 21 }}>
            {formatCurrency(currentBalance)}
          </div>
        </div>

        {/* 3 Stat Cards */}
        <div className="txn-stat-cards-3">
          <div className="txn-stat-card-clean">
            <div className="txn-stat-card-label">TOTAL TRANSAKSI</div>
            <div className="txn-stat-card-val" style={{ fontSize: 28 }}>{filtered.length}</div>
            <div className="txn-stat-card-sub">{currentMonthDisplay}</div>
          </div>
          <div className="txn-stat-card-clean">
            <div className="txn-stat-card-label">TOTAL MASUK</div>
            <div className="txn-stat-card-val income" style={{ fontSize: 24 }}>+{formatCurrency(totalIn)}</div>
            <div className="txn-stat-card-sub">{countIn} transaksi</div>
          </div>
          <div className="txn-stat-card-clean">
            <div className="txn-stat-card-label">TOTAL KELUAR</div>
            <div className="txn-stat-card-val expense" style={{ fontSize: 24 }}>-{formatCurrency(totalOut)}</div>
            <div className="txn-stat-card-sub">{countOut} transaksi</div>
          </div>
        </div>

        {/* Controls Row 1: Month Nav & Filter Pills */}
        <div className="txn-nav-filter-row">
          <div className="txn-month-navigator">
            <button className="txn-nav-arrow" onClick={goToPrevMonth} aria-label="Bulan sebelumnya">
              <ChevronLeft size={18} />
            </button>
            <span className="txn-nav-month-title">{currentMonthDisplay}</span>
            <button className="txn-nav-arrow" onClick={goToNextMonth} aria-label="Bulan berikutnya" disabled={showAllMonths}>
              <ChevronRight size={18} />
            </button>
            <button
              className={`txn-pill-btn ${showAllMonths ? 'active' : ''}`}
              style={{ marginLeft: 8, padding: '6px 12px', fontSize: 12 }}
              onClick={() => setShowAllMonths(v => !v)}
            >
              Semua
            </button>
          </div>

          <div className="txn-pill-group">
            <button
              className={`txn-pill-btn ${typeFilter === 'semua' ? 'active' : ''}`}
              onClick={() => setTypeFilter('semua')}
            >
              Semua
            </button>
            <button
              className={`txn-pill-btn ${typeFilter === 'masuk' ? 'active' : ''}`}
              onClick={() => setTypeFilter('masuk')}
            >
              ↑ Pemasukan
            </button>
            <button
              className={`txn-pill-btn ${typeFilter === 'keluar' ? 'active' : ''}`}
              onClick={() => setTypeFilter('keluar')}
            >
              ↓ Pengeluaran
            </button>
          </div>
        </div>

        {/* Controls Row 2: Search, Filter toggle, Bulk Import, Tambah Button */}
        <div className="txn-search-actions-row">
          <div className="txn-search-input-wrap">
            <Search size={16} className="txn-search-icon" />
            <input
              className="txn-search-input"
              placeholder="Cari transaksi..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            {search && (
              <button className="txn-search-clear" onClick={() => setSearch('')}>
                <X size={14} />
              </button>
            )}
          </div>

          <button
            className={`txn-btn-outline ${showAdvancedFilters || activeAdvancedCount > 0 ? 'active' : ''}`}
            onClick={() => setShowAdvancedFilters(v => !v)}
            title="Filter lanjutan"
          >
            <SlidersHorizontal size={15} /> Filter
            {activeAdvancedCount > 0 && <span className="txn-filter-badge">{activeAdvancedCount}</span>}
          </button>

          <button
            className="txn-btn-outline"
            onClick={() => setShowBulkModal(true)}
            title="Import transaksi bulk"
          >
            <FileSpreadsheet size={15} /> Bulk Import
          </button>

          <button
            className="txn-btn-primary"
            onClick={() => { setEditTarget(undefined); setShowModal(true); }}
          >
            <Plus size={16} /> Tambah
          </button>
        </div>

        {/* Advanced Filters Panel */}
        {showAdvancedFilters && (
          <div className="txn-advanced-filters" style={{ margin: 0 }}>
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
                  <button className="txn-adv-clear" onClick={() => setFilterCategory('')}>
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
                  <button className="txn-adv-clear" onClick={() => setFilterBudget('')}>
                    <X size={13} />
                  </button>
                )}
              </div>
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
                  <button className="txn-adv-clear" onClick={() => setFilterGoal('')}>
                    <X size={13} />
                  </button>
                )}
              </div>
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

        {/* Table View matching Screenshot 2 */}
        <div className="txn-table-card">
          {filtered.length === 0 ? (
            <div className="empty-state" style={{ padding: '40px 0' }}>
              <div className="empty-state-icon">💸</div>
              <h3>Belum ada transaksi</h3>
              <p>Mulai catat pemasukan dan pengeluaranmu hari ini!</p>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table className="txn-table">
                <thead>
                  <tr>
                    <th style={{ width: 140 }}>TANGGAL</th>
                    <th>KETERANGAN</th>
                    <th style={{ width: 180 }}>KATEGORI</th>
                    <th style={{ textAlign: 'right', width: 170 }}>JUMLAH</th>
                    <th style={{ width: 50, textAlign: 'center' }}></th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((t, idx) => {
                    const avatar = getAvatarInfo(t, idx);
                    const catBadge = getCategoryBadge(t.category);
                    const runningBal = runningBalanceMap.get(t.id) ?? 0;
                    const isMenuOpen = actionMenuId === t.id;

                    return (
                      <tr key={t.id}>
                        {/* Tanggal column */}
                        <td>
                          <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: 13 }}>
                            {formatDesktopDate(t.date)}
                          </div>
                          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                            {formatTime(t.createdAt)}
                          </div>
                        </td>

                        {/* Keterangan column */}
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                            <div
                              className="txn-avatar-circle"
                              style={{ background: avatar.bg }}
                            >
                              {avatar.initial}
                            </div>
                            <div style={{ minWidth: 0 }}>
                              <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: 13.5 }}>
                                {t.note || t.category}
                                {t.paidBy && (
                                  <span style={{
                                    marginLeft: 8,
                                    fontSize: 10,
                                    padding: '2px 6px',
                                    borderRadius: 6,
                                    background: t.paidBy === 'asykar' ? '#EEF2FF' : t.paidBy === 'istri' ? '#FDF2F8' : '#ECFDF5',
                                    color: t.paidBy === 'asykar' ? '#4F46E5' : t.paidBy === 'istri' ? '#DB2777' : '#059669',
                                    fontWeight: 600
                                  }}>
                                    {t.paidBy === 'asykar' ? 'Asykar' : t.paidBy === 'istri' ? 'Istri' : 'Bersama'}
                                  </span>
                                )}
                              </div>
                              {t.subCategory && (
                                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 1 }}>
                                  {t.subCategory}
                                </div>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Kategori column */}
                        <td>
                          <span
                            className="txn-category-badge"
                            style={{
                              background: catBadge.bg,
                              borderColor: catBadge.border,
                              color: catBadge.text,
                            }}
                          >
                            {t.category}
                          </span>
                        </td>

                        {/* Jumlah column with Running Balance */}
                        <td style={{ textAlign: 'right' }}>
                          <div className={`txn-amount-val ${t.type === 'masuk' ? 'positive' : 'negative'}`}>
                            {t.type === 'masuk' ? '+' : '-'}{formatCurrency(t.amount)}
                          </div>
                          <div className="txn-running-balance">
                            Sisa {formatCurrency(runningBal)}
                          </div>
                        </td>

                        {/* Actions column */}
                        <td style={{ textAlign: 'center', position: 'relative' }}>
                          <button
                            className="txn-more-btn"
                            onClick={e => {
                              e.stopPropagation();
                              setActionMenuId(isMenuOpen ? null : t.id);
                            }}
                            title="Menu aksi"
                          >
                            <MoreHorizontal size={18} />
                          </button>

                          {isMenuOpen && (
                            <div className="txn-action-menu" ref={menuRef}>
                              <button
                                className="txn-action-menu-item"
                                onClick={() => handleEdit(t)}
                              >
                                <Pencil size={13} /> Edit
                              </button>
                              <button
                                className="txn-action-menu-item danger"
                                onClick={() => handleDeleteRequest(t.id)}
                              >
                                <Trash2 size={13} /> Hapus
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
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

      {/* Modals */}
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
