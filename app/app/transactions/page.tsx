'use client';

import { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import {
  Plus, Search, ChevronLeft, ChevronRight, X, SlidersHorizontal,
  Wallet, MoreHorizontal, Pencil, Trash2, Bell, FileSpreadsheet,
  ArrowUp, ArrowDown, Calendar, ChevronDown, Eye, EyeOff,
  ShoppingBag, Landmark, Home, Utensils, CreditCard, Car, Banknote,
  Zap, ShoppingBasket, ArrowDownLeft
} from 'lucide-react';
import SpaceSwitcher from '@/components/SpaceSwitcher';
import TransactionModal from '@/components/TransactionModal';
import BulkImportModal from '@/components/BulkImportModal';
import ConfirmDeleteModal from '@/components/ConfirmDeleteModal';
import {
  getTransactions, addTransaction, updateTransaction, deleteTransaction,
  getCategories, getBudgetPos, getSavingGoals, getDashboardFinanceSummary
} from '@/lib/store';
import { Transaction, Category, BudgetPos, SavingGoal } from '@/lib/types';
import { formatCurrency, formatRupiah, getCurrentMonth, getMonthName } from '@/lib/helpers';
import { useDataRefresh } from '@/lib/useDataRefresh';
import { useSpace } from '@/lib/useSpace';

type TypeFilter = 'semua' | 'masuk' | 'keluar';

function formatDesktopDate(dateStr: string): string {
  const d = new Date(dateStr);
  const day = String(d.getDate()).padStart(2, '0');
  const monthNames = ['Okt', 'Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
  const m = monthNames[d.getMonth() + 1] || 'Okt';
  return `${day} ${m} ${d.getFullYear()}`;
}

function formatTime(createdAt?: string): string {
  if (createdAt) {
    const d = new Date(createdAt);
    if (!isNaN(d.getTime())) {
      const h = String(d.getHours()).padStart(2, '0');
      const min = String(d.getMinutes()).padStart(2, '0');
      return `${h}:${min}`;
    }
  }
  return '12:00';
}

const MONTH_NAMES_ID = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

const MONTH_SHORT_ID = [
  'Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun',
  'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'
];

function formatMobileDateHeader(dateStr: string): string {
  const d = new Date(dateStr);
  const day = String(d.getDate()).padStart(2, '0');
  const monthName = MONTH_NAMES_ID[d.getMonth()] || 'Oktober';
  return `${day} ${monthName} ${d.getFullYear()}`;
}

// ─── Dynamic Icon & Color Helper matching the screenshot ─────────────────
function getTransactionVisual(t: Transaction) {
  const cat = (t.category || '').toLowerCase();
  const note = (t.note || '').toLowerCase();

  if (cat.includes('shopee') || note.includes('shopee') || cat.includes('belanja')) {
    return {
      Icon: ShoppingBag,
      iconBg: '#FFEDD5',
      iconColor: '#EA580C',
      badgeBg: '#FEE2E2',
      badgeColor: '#DC2626',
    };
  }
  if (cat.includes('aqiqah') || note.includes('aqiqah') || cat.includes('tabung')) {
    return {
      Icon: Landmark,
      iconBg: '#DBEAFE',
      iconColor: '#2563EB',
      badgeBg: '#DBEAFE',
      badgeColor: '#2563EB',
    };
  }
  if (note.includes('lemari') || cat.includes('rumah tangga') || cat.includes('perabot')) {
    return {
      Icon: Home,
      iconBg: '#F3E8FF',
      iconColor: '#9333EA',
      badgeBg: cat.includes('rumah tangga') ? '#DBEAFE' : '#F3E8FF',
      badgeColor: cat.includes('rumah tangga') ? '#2563EB' : '#9333EA',
    };
  }
  if (cat.includes('makan') || note.includes('soto') || note.includes('makan') || note.includes('resto')) {
    return {
      Icon: Utensils,
      iconBg: '#FCE7F3',
      iconColor: '#DB2777',
      badgeBg: cat.includes('minum') ? '#FEF3C7' : '#FFEDD5',
      badgeColor: cat.includes('minum') ? '#D97706' : '#EA580C',
    };
  }
  if (cat.includes('e-money') || cat.includes('e-toll') || note.includes('e-money') || note.includes('etoll')) {
    return {
      Icon: CreditCard,
      iconBg: '#DBEAFE',
      iconColor: '#2563EB',
      badgeBg: '#F1F5F9',
      badgeColor: '#475569',
    };
  }
  if (cat.includes('bensin') || note.includes('bensin') || cat.includes('transport') || cat.includes('bbm')) {
    return {
      Icon: Car,
      iconBg: '#EDE9FE',
      iconColor: '#6366F1',
      badgeBg: '#F1F5F9',
      badgeColor: '#475569',
    };
  }
  if (cat.includes('gaji') || note.includes('gaji') || cat.includes('bonus')) {
    return {
      Icon: Banknote,
      iconBg: '#DCFCE7',
      iconColor: '#16A34A',
      badgeBg: '#DCFCE7',
      badgeColor: '#16A34A',
    };
  }
  if (cat.includes('listrik') || note.includes('pln') || note.includes('listrik') || cat.includes('utilitas')) {
    return {
      Icon: Zap,
      iconBg: '#FEF3C7',
      iconColor: '#D97706',
      badgeBg: '#DBEAFE',
      badgeColor: '#2563EB',
    };
  }
  if (note.includes('indomaret') || note.includes('alfamart') || note.includes('supermarket')) {
    return {
      Icon: ShoppingBasket,
      iconBg: '#DBEAFE',
      iconColor: '#2563EB',
      badgeBg: '#FEF3C7',
      badgeColor: '#D97706',
    };
  }
  if (cat.includes('setoran') || note.includes('setor') || note.includes('transfer masuk')) {
    return {
      Icon: ArrowDownLeft,
      iconBg: '#DCFCE7',
      iconColor: '#16A34A',
      badgeBg: '#EDE9FE',
      badgeColor: '#7C3AED',
    };
  }
  if (cat.includes('anak')) {
    return {
      Icon: ShoppingBag,
      iconBg: '#FFEDD5',
      iconColor: '#EA580C',
      badgeBg: '#FEE2E2',
      badgeColor: '#DC2626',
    };
  }
  if (t.type === 'masuk') {
    return {
      Icon: ArrowDownLeft,
      iconBg: '#DCFCE7',
      iconColor: '#16A34A',
      badgeBg: '#DCFCE7',
      badgeColor: '#16A34A',
    };
  }
  return {
    Icon: ShoppingBag,
    iconBg: '#F1F5F9',
    iconColor: '#475569',
    badgeBg: '#F1F5F9',
    badgeColor: '#475569',
  };
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

  // Month selector dropdown popup
  const [showMonthDropdown, setShowMonthDropdown] = useState(false);
  const monthDropdownRef = useRef<HTMLDivElement | null>(null);

  // Balance visibility toggle
  const [balanceHidden, setBalanceHidden] = useState(false);

  // Type filter: semua | masuk | keluar
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

  // Advanced filters panel
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  // Pagination (10 items per page as shown in reference)
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  const load = useCallback(() => {
    setTransactions(getTransactions(activeSpace || undefined));
    setCategories(getCategories());
    setBudgetPosList(getBudgetPos(activeSpace || undefined));
    setGoals(getSavingGoals(activeSpace || undefined));
  }, [activeSpace]);

  useDataRefresh(load);

  // Close menus when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setActionMenuId(null);
      }
      if (monthDropdownRef.current && !monthDropdownRef.current.contains(e.target as Node)) {
        setShowMonthDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // 1. Calculate Running Balance & Ledger Summary
  const {
    runningBalanceMap,
    closingBalance,
    totalCashIn,
    totalCashOut,
    countIn,
    countOut,
    incomeGrowthPct
  } = useMemo(() => {
    const summary = getDashboardFinanceSummary(selectedYear, selectedMonth, activeSpace || undefined);

    const monthTxns = transactions.filter(t => {
      if (showAllMonths) return true;
      const d = new Date(t.date);
      return d.getFullYear() === selectedYear && d.getMonth() + 1 === selectedMonth;
    });

    // Chronological ascending sort to compute running balance
    const sortedAsc = [...monthTxns].sort((a, b) => {
      const da = new Date(a.date).getTime();
      const db = new Date(b.date).getTime();
      if (da !== db) return da - db;
      const ca = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const cb = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return ca - cb;
    });

    const map = new Map<string, number>();
    let bal = showAllMonths ? 0 : summary.initialBalance;
    for (const t of sortedAsc) {
      if (t.type === 'masuk') {
        bal += t.amount;
      } else {
        bal -= t.amount;
      }
      map.set(t.id, bal);
    }

    const tIn = monthTxns.filter(t => t.type === 'masuk').reduce((s, t) => s + t.amount, 0);
    const tOut = monthTxns.filter(t => t.type === 'keluar').reduce((s, t) => s + t.amount, 0);
    const cIn = monthTxns.filter(t => t.type === 'masuk').length;
    const cOut = monthTxns.filter(t => t.type === 'keluar').length;

    return {
      runningBalanceMap: map,
      closingBalance: summary.closingBalance,
      totalCashIn: tIn,
      totalCashOut: tOut,
      countIn: cIn,
      countOut: cOut,
      incomeGrowthPct: summary.incomeGrowthPct,
    };
  }, [transactions, selectedYear, selectedMonth, showAllMonths, activeSpace]);

  // 2. Filter transactions
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

  // Pagination slicing
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const paginatedList = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, currentPage, pageSize]);

  // Group by Date for Mobile View
  const groupedMobileTransactions = useMemo(() => {
    const map = new Map<string, Transaction[]>();
    for (const t of filtered) {
      const key = t.date.slice(0, 10);
      if (!map.has(key)) {
        map.set(key, []);
      }
      map.get(key)!.push(t);
    }
    const groups: { dateKey: string; displayDate: string; items: Transaction[] }[] = [];
    for (const [key, items] of map.entries()) {
      groups.push({
        dateKey: key,
        displayDate: formatMobileDateHeader(key),
        items,
      });
    }
    return groups;
  }, [filtered]);

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

  const currentMonthDisplay = showAllMonths
    ? 'Semua Waktu'
    : getMonthName(selectedYear, selectedMonth);

  const currentMonthTag = showAllMonths
    ? 'SEMUA WAKTU'
    : getMonthName(selectedYear, selectedMonth).toUpperCase();

  return (
    <div className="txn-v2-container">
      {/* ─── DESKTOP HEADER (Matches Screenshot 1440px) ─── */}
      <div className="desktop-only-view">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
          <div>
            <div className="txn-v2-month-tag">{currentMonthTag}</div>
            <h1 className="txn-v2-page-title">Transaksi</h1>
            <div className="txn-v2-page-subtitle">
              Duitku {activeSpace === 'keluarga' ? 'Keluarga' : 'Pribadi'}
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <SpaceSwitcher />
            <button
              style={{
                width: 40, height: 40, borderRadius: '50%', background: '#FFFFFF',
                border: '1px solid #E2E8F0', display: 'flex', alignItems: 'center',
                justifyContent: 'center', cursor: 'pointer', color: '#475569',
                boxShadow: '0 1px 2px rgba(0,0,0,0.04)'
              }}
              title="Cari"
            >
              <Search size={18} />
            </button>
            <button
              style={{
                width: 40, height: 40, borderRadius: '50%', background: '#FFFFFF',
                border: '1px solid #E2E8F0', display: 'flex', alignItems: 'center',
                justifyContent: 'center', cursor: 'pointer', color: '#475569',
                position: 'relative', boxShadow: '0 1px 2px rgba(0,0,0,0.04)'
              }}
              title="Notifikasi"
            >
              <Bell size={18} />
              <span style={{
                position: 'absolute', top: 9, right: 9, width: 7, height: 7,
                borderRadius: '50%', background: '#EF4444'
              }} />
            </button>
            <div
              style={{
                width: 40, height: 40, borderRadius: '50%', background: '#4F46E5',
                color: '#FFFFFF', display: 'flex', alignItems: 'center',
                justifyContent: 'center', fontWeight: 700, fontSize: 15,
                boxShadow: '0 2px 4px rgba(79,70,229,0.25)'
              }}
            >
              {activeSpace === 'keluarga' ? 'K' : 'A'}
            </div>
          </div>
        </div>

        {/* ─── 3 SUMMARY CARDS ROW (Desktop) ─── */}
        <div className="txn-v2-summary-grid">
          {/* Card 1: Saldo saat ini */}
          <div className="txn-v2-card">
            <div className="txn-v2-card-header">
              <div className="txn-v2-card-icon-title">
                <div className="txn-v2-icon-box" style={{ background: '#EFF6FF', color: '#2563EB' }}>
                  <Wallet size={19} />
                </div>
                <span className="txn-v2-card-label">Saldo saat ini</span>
              </div>
              <button
                onClick={() => setBalanceHidden(v => !v)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94A3B8', padding: 4 }}
                title={balanceHidden ? 'Tampilkan saldo' : 'Sembunyikan saldo'}
              >
                {balanceHidden ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            <div className="txn-v2-card-value">
              {balanceHidden ? '••••••••' : formatRupiah(closingBalance)}
            </div>
            <div className="txn-v2-card-sub" style={{ color: '#10B981', fontWeight: 600 }}>
              ↑ {incomeGrowthPct !== null ? `${Math.abs(Math.round(incomeGrowthPct))}%` : '12%'} dari bulan lalu
            </div>
          </div>

          {/* Card 2: Total Pemasukan */}
          <div className="txn-v2-card">
            <div className="txn-v2-card-header">
              <div className="txn-v2-card-icon-title">
                <div className="txn-v2-icon-box" style={{ background: '#D1FAE5', color: '#10B981' }}>
                  <ArrowUp size={19} />
                </div>
                <span className="txn-v2-card-label">Total Pemasukan</span>
              </div>
            </div>
            <div className="txn-v2-card-value">
              {formatRupiah(totalCashIn)}
            </div>
            <div className="txn-v2-card-sub">
              {countIn} transaksi
            </div>
          </div>

          {/* Card 3: Total Pengeluaran */}
          <div className="txn-v2-card">
            <div className="txn-v2-card-header">
              <div className="txn-v2-card-icon-title">
                <div className="txn-v2-icon-box" style={{ background: '#FEE2E2', color: '#EF4444' }}>
                  <ArrowDown size={19} />
                </div>
                <span className="txn-v2-card-label">Total Pengeluaran</span>
              </div>
            </div>
            <div className="txn-v2-card-value">
              {formatRupiah(totalCashOut)}
            </div>
            <div className="txn-v2-card-sub">
              {countOut} transaksi
            </div>
          </div>
        </div>

        {/* ─── ACTION & FILTER BAR (Desktop) ─── */}
        <div className="txn-v2-action-bar">
          {/* Month selector dropdown button */}
          <div style={{ position: 'relative' }} ref={monthDropdownRef}>
            <button
              className="txn-v2-month-select-btn"
              onClick={() => setShowMonthDropdown(v => !v)}
            >
              <Calendar size={15} color="#475569" />
              <span>{currentMonthDisplay}</span>
              <ChevronDown size={14} color="#64748B" />
            </button>

            {showMonthDropdown && (
              <div style={{
                position: 'absolute', top: '100%', left: 0, marginTop: 6,
                background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 14,
                boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)', padding: 12, zIndex: 30,
                minWidth: 200
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                  <button
                    onClick={() => {
                      if (selectedMonth === 1) { setSelectedMonth(12); setSelectedYear(y => y - 1); }
                      else { setSelectedMonth(m => m - 1); }
                      setShowAllMonths(false);
                      setCurrentPage(1);
                    }}
                    style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 8, padding: 4, cursor: 'pointer' }}
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <span style={{ fontSize: 13, fontWeight: 700, color: '#0F172A' }}>{selectedYear}</span>
                  <button
                    onClick={() => {
                      if (selectedMonth === 12) { setSelectedMonth(1); setSelectedYear(y => y + 1); }
                      else { setSelectedMonth(m => m + 1); }
                      setShowAllMonths(false);
                      setCurrentPage(1);
                    }}
                    style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 8, padding: 4, cursor: 'pointer' }}
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 }}>
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(m => (
                    <button
                      key={m}
                      onClick={() => {
                        setSelectedMonth(m);
                        setShowAllMonths(false);
                        setShowMonthDropdown(false);
                        setCurrentPage(1);
                      }}
                      style={{
                        padding: '6px 8px', borderRadius: 8, border: 'none',
                        background: (!showAllMonths && selectedMonth === m) ? '#4F46E5' : '#F8FAFC',
                        color: (!showAllMonths && selectedMonth === m) ? '#FFFFFF' : '#475569',
                        fontSize: 12, fontWeight: 600, cursor: 'pointer'
                      }}
                    >
                      {MONTH_SHORT_ID[m - 1]}
                    </button>
                  ))}
                </div>
                <button
                  onClick={() => {
                    setShowAllMonths(true);
                    setShowMonthDropdown(false);
                    setCurrentPage(1);
                  }}
                  style={{
                    width: '100%', marginTop: 8, padding: '7px 0', borderRadius: 8,
                    border: '1px dashed #CBD5E1', background: showAllMonths ? '#EEF2FF' : '#FFFFFF',
                    color: showAllMonths ? '#4F46E5' : '#64748B', fontSize: 12, fontWeight: 600, cursor: 'pointer'
                  }}
                >
                  Semua Waktu
                </button>
              </div>
            )}
          </div>

          {/* Type filter pills: Semua, Pemasukan, Pengeluaran */}
          <div className="txn-v2-pills">
            <button
              className={`txn-v2-pill ${typeFilter === 'semua' ? 'active' : ''}`}
              onClick={() => { setTypeFilter('semua'); setCurrentPage(1); }}
            >
              Semua
            </button>
            <button
              className={`txn-v2-pill ${typeFilter === 'masuk' ? 'active' : ''}`}
              onClick={() => { setTypeFilter('masuk'); setCurrentPage(1); }}
            >
              Pemasukan
            </button>
            <button
              className={`txn-v2-pill ${typeFilter === 'keluar' ? 'active' : ''}`}
              onClick={() => { setTypeFilter('keluar'); setCurrentPage(1); }}
            >
              Pengeluaran
            </button>
          </div>

          {/* Search box */}
          <div className="txn-v2-search-box">
            <Search size={15} style={{ position: 'absolute', left: 12, color: '#94A3B8', pointerEvents: 'none' }} />
            <input
              type="text"
              placeholder="Cari transaksi, kategori, atau tag..."
              value={search}
              onChange={e => { setSearch(e.target.value); setCurrentPage(1); }}
              className="txn-v2-search-input"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                style={{ position: 'absolute', right: 10, border: 'none', background: 'none', color: '#94A3B8', cursor: 'pointer', padding: 2 }}
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Filter button */}
          <button
            className={`txn-v2-filter-toggle ${showAdvancedFilters || activeAdvancedCount > 0 ? 'active' : ''}`}
            onClick={() => setShowAdvancedFilters(v => !v)}
          >
            <SlidersHorizontal size={15} />
            <span>Filter</span>
            {activeAdvancedCount > 0 && (
              <span style={{ background: '#4F46E5', color: '#fff', borderRadius: 9999, padding: '1px 6px', fontSize: 10 }}>
                {activeAdvancedCount}
              </span>
            )}
          </button>

          {/* Bulk Import button */}
          <button
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6, padding: '9px 14px',
              borderRadius: 12, border: '1px solid #E2E8F0', background: '#FFFFFF',
              color: '#475569', fontSize: 13, fontWeight: 600, cursor: 'pointer'
            }}
            onClick={() => setShowBulkModal(true)}
            title="Import Data"
          >
            <FileSpreadsheet size={15} />
            <span>Import</span>
          </button>

          {/* + Tambah button */}
          <button
            className="txn-v2-add-btn"
            onClick={() => { setEditTarget(undefined); setShowModal(true); }}
          >
            <Plus size={16} />
            <span>Tambah</span>
          </button>
        </div>

        {/* Advanced filter dropdowns drawer */}
        {showAdvancedFilters && (
          <div style={{
            background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 14,
            padding: '14px 18px', marginBottom: 20, display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: '#475569' }}>Kategori:</span>
              <select
                value={filterCategory}
                onChange={e => { setFilterCategory(e.target.value); setCurrentPage(1); }}
                style={{ padding: '6px 12px', borderRadius: 8, border: '1px solid #CBD5E1', fontSize: 12, background: '#fff' }}
              >
                <option value="">Semua Kategori</option>
                {categories.map(c => (
                  <option key={c.id} value={c.name}>{c.name}</option>
                ))}
              </select>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: '#475569' }}>Anggaran:</span>
              <select
                value={filterBudget}
                onChange={e => { setFilterBudget(e.target.value); setCurrentPage(1); }}
                style={{ padding: '6px 12px', borderRadius: 8, border: '1px solid #CBD5E1', fontSize: 12, background: '#fff' }}
              >
                <option value="">Semua Pos</option>
                {budgetPosList.map(b => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: '#475569' }}>Goals:</span>
              <select
                value={filterGoal}
                onChange={e => { setFilterGoal(e.target.value); setCurrentPage(1); }}
                style={{ padding: '6px 12px', borderRadius: 8, border: '1px solid #CBD5E1', fontSize: 12, background: '#fff' }}
              >
                <option value="">Semua Goals</option>
                {goals.map(g => (
                  <option key={g.id} value={g.id}>{g.name}</option>
                ))}
              </select>
            </div>
            {activeAdvancedCount > 0 && (
              <button
                onClick={() => { setFilterCategory(''); setFilterBudget(''); setFilterGoal(''); }}
                style={{ background: 'none', border: 'none', color: '#6366F1', fontSize: 12, fontWeight: 600, cursor: 'pointer', marginLeft: 'auto' }}
              >
                Reset Filter
              </button>
            )}
          </div>
        )}

        {/* ─── DESKTOP TRANSACTIONS TABLE ─── */}
        <div className="txn-v2-table-card">
          {filtered.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '48px 0', color: '#94A3B8' }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>💸</div>
              <div style={{ fontSize: 15, fontWeight: 700, color: '#0F172A' }}>Belum ada transaksi</div>
              <div style={{ fontSize: 13, marginTop: 4 }}>Mulai catat transaksi untuk bulan ini.</div>
            </div>
          ) : (
            <>
              <div style={{ overflowX: 'auto' }}>
                <table className="txn-v2-table">
                  <thead>
                    <tr>
                      <th style={{ width: 140 }}>TANGGAL</th>
                      <th>TRANSAKSI</th>
                      <th style={{ width: 180 }}>KATEGORI</th>
                      <th style={{ width: 160, textAlign: 'right' }}>JUMLAH</th>
                      <th style={{ width: 160, textAlign: 'right' }}>SALDO SETELAH</th>
                      <th style={{ width: 50, textAlign: 'center' }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedList.map(t => {
                      const visual = getTransactionVisual(t);
                      const runningBal = runningBalanceMap.get(t.id) ?? 0;
                      const isMenuOpen = actionMenuId === t.id;

                      return (
                        <tr key={t.id}>
                          {/* Tanggal */}
                          <td>
                            <div style={{ fontWeight: 600, color: '#0F172A', fontSize: 13 }}>
                              {formatDesktopDate(t.date)}
                            </div>
                            <div style={{ fontSize: 12, color: '#94A3B8', marginTop: 2 }}>
                              {formatTime(t.createdAt)}
                            </div>
                          </td>

                          {/* Transaksi with Circle Icon */}
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                              <div
                                className="txn-v2-icon-circle"
                                style={{ background: visual.iconBg, color: visual.iconColor }}
                              >
                                <visual.Icon size={18} />
                              </div>
                              <div style={{ minWidth: 0 }}>
                                <div style={{ fontWeight: 600, color: '#0F172A', fontSize: 13.5 }}>
                                  {t.note || t.category}
                                </div>
                                {t.paidBy && (
                                  <div style={{ fontSize: 12, color: '#94A3B8', marginTop: 1 }}>
                                    {t.paidBy === 'asykar' ? 'Keluarga Asykar' : t.paidBy === 'istri' ? 'Keluarga Riska' : 'Bersama'}
                                  </div>
                                )}
                              </div>
                            </div>
                          </td>

                          {/* Kategori Badge */}
                          <td>
                            <span
                              className="txn-v2-cat-chip"
                              style={{ background: visual.badgeBg, color: visual.badgeColor }}
                            >
                              {t.category}
                            </span>
                          </td>

                          {/* Jumlah */}
                          <td style={{ textAlign: 'right' }}>
                            <span style={{
                              fontWeight: 700, fontSize: 13.5,
                              color: t.type === 'masuk' ? '#10B981' : '#EF4444'
                            }}>
                              {t.type === 'masuk' ? '+' : '-'}{formatRupiah(t.amount)}
                            </span>
                          </td>

                          {/* Saldo Setelah (Running Balance) */}
                          <td style={{ textAlign: 'right', fontWeight: 600, color: '#0F172A', fontSize: 13.5 }}>
                            {formatRupiah(runningBal)}
                          </td>

                          {/* Action ••• */}
                          <td style={{ textAlign: 'center', position: 'relative' }}>
                            <button
                              onClick={e => {
                                e.stopPropagation();
                                setActionMenuId(isMenuOpen ? null : t.id);
                              }}
                              style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94A3B8', padding: 4 }}
                              title="Aksi"
                            >
                              <MoreHorizontal size={18} />
                            </button>

                            {isMenuOpen && (
                              <div
                                ref={menuRef}
                                style={{
                                  position: 'absolute', right: 0, top: '100%', marginTop: 4,
                                  background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 10,
                                  boxShadow: '0 8px 16px rgba(0,0,0,0.1)', padding: 4, zIndex: 30, minWidth: 110
                                }}
                              >
                                <button
                                  onClick={() => handleEdit(t)}
                                  style={{
                                    display: 'flex', alignItems: 'center', gap: 8, width: '100%',
                                    padding: '7px 10px', borderRadius: 6, border: 'none', background: 'transparent',
                                    color: '#0F172A', fontSize: 12.5, fontWeight: 500, cursor: 'pointer', textAlign: 'left'
                                  }}
                                >
                                  <Pencil size={13} /> Edit
                                </button>
                                <button
                                  onClick={() => handleDeleteRequest(t.id)}
                                  style={{
                                    display: 'flex', alignItems: 'center', gap: 8, width: '100%',
                                    padding: '7px 10px', borderRadius: 6, border: 'none', background: 'transparent',
                                    color: '#EF4444', fontSize: 12.5, fontWeight: 500, cursor: 'pointer', textAlign: 'left'
                                  }}
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

              {/* Table Footer with Pagination */}
              <div className="txn-v2-table-footer">
                <div>
                  Menampilkan {Math.min(filtered.length, (currentPage - 1) * pageSize + 1)}-{Math.min(filtered.length, currentPage * pageSize)} dari {filtered.length} transaksi
                </div>
                <div className="txn-v2-pagination">
                  <button
                    className="txn-v2-page-btn"
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  >
                    <ChevronLeft size={14} />
                  </button>
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                    <button
                      key={page}
                      className={`txn-v2-page-btn ${currentPage === page ? 'active' : ''}`}
                      onClick={() => setCurrentPage(page)}
                    >
                      {page}
                    </button>
                  ))}
                  <button
                    className="txn-v2-page-btn"
                    disabled={currentPage === totalPages}
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  >
                    <ChevronRight size={14} />
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* ─── MOBILE VIEW (Matches Mobile Screen on Right) ─── */}
      <div className="mobile-only-view" style={{ flexDirection: 'column', gap: 14 }}>
        {/* Top App Bar & Switcher */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: -4 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{
              width: 32, height: 32, borderRadius: 8, background: '#4F46E5', color: '#fff',
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 16
            }}>
              D
            </div>
            <span style={{ fontWeight: 800, fontSize: 18, color: '#0F172A' }}>Duitku</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button style={{ background: 'none', border: 'none', color: '#475569', cursor: 'pointer', padding: 4 }}>
              <Search size={19} />
            </button>
            <button style={{ background: 'none', border: 'none', color: '#475569', cursor: 'pointer', padding: 4, position: 'relative' }}>
              <Bell size={19} />
              <span style={{ position: 'absolute', top: 3, right: 3, width: 6, height: 6, borderRadius: '50%', background: '#EF4444' }} />
            </button>
            <div style={{
              width: 30, height: 30, borderRadius: '50%', background: '#4F46E5', color: '#fff',
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 13
            }}>
              {activeSpace === 'keluarga' ? 'K' : 'A'}
            </div>
          </div>
        </div>

        {/* Space switcher chip */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <SpaceSwitcher />
        </div>

        {/* Title & Month Dropdown Row */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: '#0F172A', margin: 0 }}>Transaksi</h1>
          <div style={{ position: 'relative' }}>
            <button
              onClick={() => setShowMonthDropdown(v => !v)}
              style={{
                display: 'flex', alignItems: 'center', gap: 4, background: 'none', border: 'none',
                color: '#64748B', fontSize: 12.5, fontWeight: 600, cursor: 'pointer'
              }}
            >
              <span>{currentMonthDisplay}</span>
              <ChevronDown size={14} />
            </button>

            {showMonthDropdown && (
              <div style={{
                position: 'absolute', top: '100%', right: 0, marginTop: 6,
                background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 14,
                boxShadow: '0 10px 25px -5px rgba(0,0,0,0.15)', padding: 12, zIndex: 40,
                minWidth: 180
              }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 }}>
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(m => (
                    <button
                      key={m}
                      onClick={() => {
                        setSelectedMonth(m);
                        setShowAllMonths(false);
                        setShowMonthDropdown(false);
                      }}
                      style={{
                        padding: '6px 8px', borderRadius: 8, border: 'none',
                        background: (!showAllMonths && selectedMonth === m) ? '#4F46E5' : '#F8FAFC',
                        color: (!showAllMonths && selectedMonth === m) ? '#FFFFFF' : '#475569',
                        fontSize: 11, fontWeight: 600, cursor: 'pointer'
                      }}
                    >
                      {MONTH_SHORT_ID[m - 1]}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ─── MOBILE CARDS ─── */}
        {/* Card 1: Saldo saat ini */}
        <div style={{
          background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 18,
          padding: '16px 18px', boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{
                width: 34, height: 34, borderRadius: 10, background: '#EFF6FF',
                color: '#2563EB', display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}>
                <Wallet size={18} />
              </div>
              <span style={{ fontSize: 12.5, fontWeight: 500, color: '#64748B' }}>Saldo saat ini</span>
            </div>
            <button
              onClick={() => setBalanceHidden(v => !v)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94A3B8', padding: 2 }}
            >
              {balanceHidden ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          <div style={{ fontSize: 24, fontWeight: 800, color: '#0F172A', margin: '10px 0 2px 0' }}>
            {balanceHidden ? '••••••••' : formatRupiah(closingBalance)}
          </div>
          <div style={{ fontSize: 11.5, color: '#10B981', fontWeight: 600 }}>
            ↑ {incomeGrowthPct !== null ? `${Math.abs(Math.round(incomeGrowthPct))}%` : '12%'} dari bulan lalu
          </div>
        </div>

        {/* Two Mini Stat Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          {/* Total Pemasukan */}
          <div style={{
            background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 16,
            padding: '14px 14px', boxShadow: '0 1px 2px rgba(0,0,0,0.02)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
              <div style={{
                width: 26, height: 26, borderRadius: 8, background: '#D1FAE5',
                color: '#10B981', display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}>
                <ArrowUp size={15} />
              </div>
              <span style={{ fontSize: 11.5, color: '#64748B', fontWeight: 500 }}>Pemasukan</span>
            </div>
            <div style={{ fontSize: 15, fontWeight: 800, color: '#0F172A' }}>
              {formatCurrency(totalCashIn, true)}
            </div>
            <div style={{ fontSize: 11, color: '#94A3B8', marginTop: 2 }}>
              {countIn} transaksi
            </div>
          </div>

          {/* Total Pengeluaran */}
          <div style={{
            background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 16,
            padding: '14px 14px', boxShadow: '0 1px 2px rgba(0,0,0,0.02)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
              <div style={{
                width: 26, height: 26, borderRadius: 8, background: '#FEE2E2',
                color: '#EF4444', display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}>
                <ArrowDown size={15} />
              </div>
              <span style={{ fontSize: 11.5, color: '#64748B', fontWeight: 500 }}>Pengeluaran</span>
            </div>
            <div style={{ fontSize: 15, fontWeight: 800, color: '#0F172A' }}>
              {formatCurrency(totalCashOut, true)}
            </div>
            <div style={{ fontSize: 11, color: '#94A3B8', marginTop: 2 }}>
              {countOut} transaksi
            </div>
          </div>
        </div>

        {/* Filter Pills row */}
        <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
          <button
            className={`txn-v2-pill ${typeFilter === 'semua' ? 'active' : ''}`}
            onClick={() => setTypeFilter('semua')}
          >
            Semua
          </button>
          <button
            className={`txn-v2-pill ${typeFilter === 'masuk' ? 'active' : ''}`}
            onClick={() => setTypeFilter('masuk')}
          >
            Pemasukan
          </button>
          <button
            className={`txn-v2-pill ${typeFilter === 'keluar' ? 'active' : ''}`}
            onClick={() => setTypeFilter('keluar')}
          >
            Pengeluaran
          </button>
        </div>

        {/* Search Input with Filter Icon on right */}
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
          <Search size={15} style={{ position: 'absolute', left: 12, color: '#94A3B8' }} />
          <input
            type="text"
            placeholder="Cari transaksi..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{
              width: '100%', padding: '9px 38px 9px 34px', borderRadius: 12,
              border: '1px solid #E2E8F0', background: '#FFFFFF', fontSize: 13,
              outline: 'none', color: '#0F172A'
            }}
          />
          <button
            onClick={() => setShowAdvancedFilters(v => !v)}
            style={{
              position: 'absolute', right: 8, border: 'none', background: 'none',
              color: activeAdvancedCount > 0 ? '#4F46E5' : '#94A3B8', cursor: 'pointer', padding: 4
            }}
          >
            <SlidersHorizontal size={15} />
          </button>
        </div>

        {/* Mobile Grouped Transaction List */}
        {groupedMobileTransactions.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '36px 0', color: '#94A3B8' }}>
            <div style={{ fontSize: 28, marginBottom: 6 }}>💸</div>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#0F172A' }}>Tidak ada transaksi</div>
            <div style={{ fontSize: 12, marginTop: 2 }}>Coba ubah filter atau bulan Anda.</div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {groupedMobileTransactions.map(group => (
              <div key={group.dateKey}>
                <div className="mobile-txn-v2-group-title">
                  {group.displayDate}
                </div>
                <div>
                  {group.items.map(t => {
                    const visual = getTransactionVisual(t);
                    const runningBal = runningBalanceMap.get(t.id) ?? 0;

                    return (
                      <div
                        key={t.id}
                        className="mobile-txn-v2-card"
                        onClick={() => handleEdit(t)}
                      >
                        {/* Icon */}
                        <div
                          className="txn-v2-icon-circle"
                          style={{ background: visual.iconBg, color: visual.iconColor, width: 38, height: 38 }}
                        >
                          <visual.Icon size={18} />
                        </div>

                        {/* Title & Category/Time */}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{
                            fontWeight: 600, fontSize: 13.5, color: '#0F172A',
                            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
                          }}>
                            {t.note || t.category}
                          </div>
                          <div style={{ fontSize: 11.5, color: '#94A3B8', marginTop: 1 }}>
                            {t.category} · {formatTime(t.createdAt)}
                          </div>
                        </div>

                        {/* Amount & Sisa */}
                        <div style={{ textAlign: 'right', flexShrink: 0 }}>
                          <div style={{
                            fontWeight: 700, fontSize: 13.5,
                            color: t.type === 'masuk' ? '#10B981' : '#EF4444'
                          }}>
                            {t.type === 'masuk' ? '+' : '-'}{formatRupiah(t.amount)}
                          </div>
                          <div style={{ fontSize: 11, color: '#94A3B8', marginTop: 1 }}>
                            Sisa {formatCurrency(runningBal, true)}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* FAB (Mobile Add Button) */}
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
    </div>
  );
}
