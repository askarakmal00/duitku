'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Wallet,
  TrendingUp,
  TrendingDown,
  Plus,
  X,
  Bell,
  MoreHorizontal,
  ArrowUpRight,
  ArrowDownLeft,
  Eye,
  EyeOff,
  ChevronDown,
  ChevronUp,
  BarChart2,
  PiggyBank,
  CreditCard,
  ArrowRight,
  Receipt,
  CheckCircle2,
  RotateCcw,
  Sparkles,
} from 'lucide-react';
import { formatRupiah, formatCurrency, getMonthName, clamp } from '@/lib/helpers';
import {
  getTransactions,
  addTransaction,
  notifyDataChanged,
  getDashboardFinanceSummary,
  getCategoryBreakdown,
  getMonthlyFlowData,
  getBudgetPos,
  getBudgetUsed,
  getSavingGoals,
  getGoalProgress,
  getTotalDebt,
  getFamilyTalanganSummary,
  reimburseTransaction,
  reimburseAllPendingTalangan,
} from '@/lib/store';
import { getFamilyContributions, saveFamilyContribution } from '@/lib/spaceStore';
import { useDataRefresh } from '@/lib/useDataRefresh';
import TransactionModal from '@/components/TransactionModal';
import { Transaction } from '@/lib/types';

// ─── Category colour palette ──────────────────────────────────────────────
const CATEGORY_COLORS = [
  '#6366F1', // indigo
  '#F59E0B', // amber
  '#10B981', // emerald
  '#3B82F6', // blue
  '#EC4899', // pink
  '#8B5CF6', // violet
  '#14B8A6', // teal
  '#F97316', // orange
  '#EF4444', // red
  '#84CC16', // lime
];

const CAT_ICON: Record<string, string> = {
  'Kebutuhan Anak': '🧒',
  'Makanan & Minuman': '🍽️',
  'Makan Bersama': '🍽️',
  'Belanja Dapur': '🛒',
  'Rumah Tangga': '🏠',
  'Operasional Rumah': '🏠',
  'Transportasi': '🚗',
  'Hiburan': '🎬',
  'Kesehatan': '💊',
  'Kesehatan Keluarga': '💊',
  'Pendidikan': '📚',
  'Utilitas Rumah': '💡',
  'Tabungan': '🏦',
  'KPR/Cicilan': '🏗️',
  'Gaji': '💼',
  'Bonus': '🎁',
  'Setoran Kas Bersama': '💰',
  'Lainnya': '📝',
};

function catIcon(name: string) {
  return CAT_ICON[name] || name?.[0]?.toUpperCase() || '📌';
}

function compactRp(n: number): string {
  if (n >= 1_000_000_000) return `Rp ${(n / 1_000_000_000).toFixed(1)}M`;
  if (n >= 1_000_000) return `Rp ${(n / 1_000_000).toFixed(1)}jt`;
  if (n >= 1_000) return `Rp ${(n / 1_000).toFixed(0)}rb`;
  return `Rp ${n}`;
}

// ─── Simple SVG Donut Chart ────────────────────────────────────────────────
interface DonutSlice { name: string; amount: number; pct: number; color: string }

function DonutChart({ slices, size = 130, strokeW = 22, centerText, centerSub }: {
  slices: DonutSlice[];
  size?: number;
  strokeW?: number;
  centerText?: string;
  centerSub?: string;
}) {
  const r = (size - strokeW) / 2;
  const circ = 2 * Math.PI * r;
  let offset = 0;
  return (
    <svg width={size} height={size} style={{ overflow: 'visible', flexShrink: 0 }}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#F1F5F9" strokeWidth={strokeW} />
      {slices.map((s, i) => {
        const len = (s.pct / 100) * circ;
        const dash = `${len} ${circ - len}`;
        const el = (
          <circle
            key={i}
            cx={size / 2} cy={size / 2} r={r}
            fill="none"
            stroke={s.color}
            strokeWidth={strokeW}
            strokeDasharray={dash}
            strokeDashoffset={-offset}
            strokeLinecap="butt"
            style={{ transformOrigin: `${size / 2}px ${size / 2}px`, transform: 'rotate(-90deg)', transition: 'stroke-dasharray 0.5s ease' }}
          />
        );
        offset += len;
        return el;
      })}
      {centerText && (
        <>
          <text x="50%" y="46%" textAnchor="middle" dominantBaseline="middle" fontSize="12" fontWeight="800" fill="#0F172A">
            {centerText}
          </text>
          {centerSub && (
            <text x="50%" y="60%" textAnchor="middle" dominantBaseline="middle" fontSize="9.5" fill="#64748B">
              {centerSub}
            </text>
          )}
        </>
      )}
    </svg>
  );
}

// ─── Bar Chart (Money Flow) ─────────────────────────────────────────────────
function BarFlowChart({ labels, income, expense }: { labels: string[]; income: number[]; expense: number[] }) {
  const maxVal = Math.max(...income, ...expense, 1);
  const barH = 120;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, width: '100%' }}>
      <div style={{ display: 'flex', gap: 16, fontSize: 11, color: '#64748B' }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <span style={{ width: 8, height: 8, borderRadius: 2, background: '#10B981', display: 'inline-block' }} />
          Pemasukan
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <span style={{ width: 8, height: 8, borderRadius: 2, background: '#6366F1', display: 'inline-block' }} />
          Pengeluaran
        </span>
      </div>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, height: barH, width: '100%', paddingTop: 10 }}>
        {labels.map((label, i) => {
          const inH = Math.max(4, Math.round((income[i] / maxVal) * barH));
          const exH = Math.max(4, Math.round((expense[i] / maxVal) * barH));
          return (
            <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 3, height: barH }}>
                <div style={{ width: 10, height: inH, background: '#10B981', borderRadius: '4px 4px 0 0' }} title={`Pemasukan: ${formatRupiah(income[i])}`} />
                <div style={{ width: 10, height: exH, background: '#6366F1', borderRadius: '4px 4px 0 0' }} title={`Pengeluaran: ${formatRupiah(expense[i])}`} />
              </div>
              <span style={{ fontSize: 10, color: '#94A3B8' }}>{label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Props ─────────────────────────────────────────────────────────────────
interface FamilyDashboardRedesignProps {
  year: number;
  month: number;
  userName?: string;
  isMobile?: boolean;
}

export default function FamilyDashboardRedesign({
  year,
  month,
  isMobile = false,
}: FamilyDashboardRedesignProps) {
  const router = useRouter();
  const monthLabel = getMonthName(year, month);

  const [asykarAmount, setAsykarAmount] = useState(0);
  const [istriAmount, setIstriAmount] = useState(0);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [showTalanganDetail, setShowTalanganDetail] = useState(false);
  const [person, setPerson] = useState<'asykar' | 'istri'>('asykar');
  const [amountInput, setAmountInput] = useState('');
  const [noteInput, setNoteInput] = useState('');
  const [balanceHidden, setBalanceHidden] = useState(false);
  const monthKey = `${year}-${String(month).padStart(2, '0')}`;

  // ─── Data Queries ────────────────────────────────────────────────────────
  const summary = getDashboardFinanceSummary(year, month, 'keluarga');
  const rawBreakdown = getCategoryBreakdown(year, month, 'keluarga');
  
  const topN = 4;
  let catSlices: DonutSlice[];
  if (rawBreakdown.length <= topN) {
    catSlices = rawBreakdown.map((c, i) => ({ ...c, color: CATEGORY_COLORS[i % CATEGORY_COLORS.length] }));
  } else {
    const top = rawBreakdown.slice(0, topN);
    const rest = rawBreakdown.slice(topN);
    const otherAmt = rest.reduce((s, c) => s + c.amount, 0);
    const otherPct = rest.reduce((s, c) => s + c.pct, 0);

    const existingLainnyaIdx = top.findIndex(c => c.name.toLowerCase() === 'lainnya');
    if (existingLainnyaIdx !== -1) {
      top[existingLainnyaIdx] = {
        ...top[existingLainnyaIdx],
        amount: top[existingLainnyaIdx].amount + otherAmt,
        pct: top[existingLainnyaIdx].pct + otherPct,
      };
      catSlices = top.map((c, i) => ({ ...c, color: CATEGORY_COLORS[i % CATEGORY_COLORS.length] }));
    } else {
      catSlices = [
        ...top.map((c, i) => ({ ...c, color: CATEGORY_COLORS[i % CATEGORY_COLORS.length] })),
        { name: 'Lainnya', amount: otherAmt, pct: otherPct, color: '#94A3B8' },
      ];
    }
  }

  // Budget
  const budgetPos = getBudgetPos('keluarga');
  const totalBudget = budgetPos.reduce((s, p) => s + p.monthlyAllocation, 0);
  const totalBudgetUsed = budgetPos.reduce((s, p) => s + getBudgetUsed(p.id, year, month, 'keluarga'), 0);
  const budgetPct = totalBudget > 0 ? Math.round(clamp((totalBudgetUsed / totalBudget) * 100, 0, 100)) : 0;
  const remainingBudget = Math.max(0, totalBudget - totalBudgetUsed);

  // Tabungan Pockets
  const goals = getSavingGoals('keluarga');
  const totalGoalProgress = goals.reduce((s, g) => s + Math.max(0, getGoalProgress(g.id, 'keluarga')), 0);

  // Debt
  const totalDebt = getTotalDebt('keluarga');

  // Money flow
  const flowData = getMonthlyFlowData(6, 'keluarga');

  // Recent transactions
  const recentTxns = getTransactions('keluarga')
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 5);

  // Contributions
  const loadContributions = useCallback(() => {
    const txns = getTransactions('keluarga').filter(t => {
      if (t.type !== 'masuk') return false;
      const d = new Date(t.date);
      return d.getFullYear() === year && d.getMonth() + 1 === month;
    });

    const asykarTxn = txns.filter(t => {
      const cat = (t.category || '').toLowerCase();
      const note = (t.note || '').toLowerCase();
      return cat.includes('asykar') || note.includes('asykar');
    }).reduce((sum, t) => sum + t.amount, 0);

    const istriTxn = txns.filter(t => {
      const cat = (t.category || '').toLowerCase();
      const note = (t.note || '').toLowerCase();
      return cat.includes('istri') || note.includes('istri') || note.includes('riska');
    }).reduce((sum, t) => sum + t.amount, 0);

    const list = getFamilyContributions();
    const item = list.find(c => c.month === monthKey);
    const manualAsykar = item?.asykarAmount || 0;
    const manualIstri = item?.istriAmount || 0;

    let finalAsykar = asykarTxn > 0 ? asykarTxn : manualAsykar;
    let finalIstri = istriTxn > 0 ? istriTxn : manualIstri;

    if (finalAsykar === 0 && finalIstri === 0 && summary.totalCashIn > 0) {
      finalAsykar = Math.round(summary.totalCashIn * (2 / 3));
      finalIstri = summary.totalCashIn - finalAsykar;
    }

    setAsykarAmount(finalAsykar);
    setIstriAmount(finalIstri);
  }, [year, month, monthKey, summary.totalCashIn]);

  useEffect(() => { loadContributions(); }, [loadContributions]);
  useDataRefresh(loadContributions);

  const totalSetoran = asykarAmount + istriAmount > 0 ? asykarAmount + istriAmount : summary.totalCashIn;
  const asykarPct = totalSetoran > 0 ? Math.round((asykarAmount / totalSetoran) * 100) : 67;
  const istriPct = totalSetoran > 0 ? (100 - asykarPct) : 33;

  // Talangan & Reimbursement Handlers
  const talanganSummary = getFamilyTalanganSummary(year, month);
  const [reimbursingId, setReimbursingId] = useState<string | null>(null);
  const [reimbursingAll, setReimbursingAll] = useState(false);
  const [reimburseFeedback, setReimburseFeedback] = useState<string | null>(null);

  const handleReimburse = async (t: Transaction) => {
    setReimbursingId(t.id);
    try {
      await reimburseTransaction(t.id);
      notifyDataChanged();
      setReimburseFeedback(`✓ Talangan "${t.note || t.category}" (${formatRupiah(t.amount)}) berhasil diganti dari Kas.`);
      setTimeout(() => setReimburseFeedback(null), 4000);
    } finally {
      setReimbursingId(null);
    }
  };

  const handleReimburseAll = async () => {
    setReimbursingAll(true);
    try {
      await reimburseAllPendingTalangan();
      notifyDataChanged();
      setReimburseFeedback('✓ Semua talangan berhasil diganti dari Kas Bersama.');
      setTimeout(() => setReimburseFeedback(null), 4000);
    } finally {
      setReimbursingAll(false);
    }
  };

  const handleSaveSetoran = async (e: React.FormEvent) => {
    e.preventDefault();
    const val = Number(amountInput);
    if (!val || val <= 0) return;
    const isAsykar = person === 'asykar';
    await addTransaction({
      type: 'masuk',
      amount: val,
      category: isAsykar ? 'Setoran Asykar' : 'Setoran Istri',
      note: noteInput.trim() || (isAsykar ? 'Setoran Asykar' : 'Setoran Riska'),
      date: new Date().toISOString(),
      spaceId: 'keluarga',
    });
    saveFamilyContribution({
      month: monthKey,
      asykarAmount: isAsykar ? asykarAmount + val : asykarAmount,
      istriAmount: !isAsykar ? istriAmount + val : istriAmount,
    });
    setAmountInput('');
    setNoteInput('');
    setShowAddModal(false);
    notifyDataChanged();
  };

  const handleSaveExpense = async (data: Omit<Transaction, 'id' | 'createdAt'>) => {
    await addTransaction({
      ...data,
      spaceId: 'keluarga',
    });
    setShowExpenseModal(false);
    notifyDataChanged();
  };

  const fmtDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return `${String(d.getDate()).padStart(2, '0')} ${d.toLocaleDateString('id-ID', { month: 'short' })}`;
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // ─── MOBILE RENDER ────────────────────────────────────────────────────────
  // ═══════════════════════════════════════════════════════════════════════════
  if (isMobile) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14, paddingBottom: 16 }}>
        {/* Mobile Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1.2 }}>
              Halo, Keluarga 👋
            </div>
            <div style={{ fontSize: 11.5, color: 'var(--text-secondary)', marginTop: 2 }}>
              {monthLabel} · Ringkasan Keuangan
            </div>
          </div>
        </div>

        {/* Hero Card Mobile */}
        <div style={{
          background: 'linear-gradient(135deg, #0F172A 0%, #1E1B4B 50%, #312E81 100%)',
          borderRadius: 20,
          padding: '20px 18px',
          color: '#FFFFFF',
          boxShadow: '0 8px 24px rgba(15, 23, 42, 0.25)',
          position: 'relative',
          overflow: 'hidden',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontSize: 10.5, color: '#A5B4FC', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>
                Saldo Kas Bersama
              </div>
              <div style={{ fontSize: 28, fontWeight: 800, letterSpacing: '-0.02em', lineHeight: 1.1 }}>
                {balanceHidden ? '••••••••' : formatRupiah(summary.closingBalance)}
              </div>
            </div>
            <button
              onClick={() => setBalanceHidden(v => !v)}
              style={{ background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: 8, padding: 6, color: '#A5B4FC', cursor: 'pointer' }}
            >
              {balanceHidden ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>

          {/* Flow Pill Row */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 14 }}>
            <div style={{ background: 'rgba(255,255,255,0.08)', borderRadius: 12, padding: '10px 12px' }}>
              <div style={{ fontSize: 10, color: '#A5B4FC', fontWeight: 600 }}>Pemasukan</div>
              <div style={{ fontSize: 14, fontWeight: 800, color: '#34D399', marginTop: 2 }}>
                +{compactRp(summary.totalCashIn)}
              </div>
            </div>
            <div style={{ background: 'rgba(255,255,255,0.08)', borderRadius: 12, padding: '10px 12px' }}>
              <div style={{ fontSize: 10, color: '#A5B4FC', fontWeight: 600 }}>Pengeluaran</div>
              <div style={{ fontSize: 14, fontWeight: 800, color: '#F87171', marginTop: 2 }}>
                -{compactRp(summary.totalCashOut)}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
            <button
              onClick={() => setShowAddModal(true)}
              style={{
                flex: 1, padding: '10px', borderRadius: 10, border: 'none',
                background: '#FFFFFF', color: '#0F172A', fontSize: 12.5, fontWeight: 700,
                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              }}
            >
              <Plus size={15} /> Setor Kas
            </button>
            <button
              onClick={() => setShowExpenseModal(true)}
              style={{
                flex: 1, padding: '10px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.2)',
                background: 'rgba(255,255,255,0.12)', color: '#FFFFFF', fontSize: 12.5, fontWeight: 700,
                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              }}
            >
              <ArrowUpRight size={15} /> Catat Belanja
            </button>
          </div>
        </div>

        {/* Talangan Notification Banner (Mobile) */}
        {talanganSummary.pendingCount > 0 && (
          <div style={{
            background: '#FFFBEB',
            border: '1px solid #FDE68A',
            borderRadius: 16,
            padding: '12px 14px',
            boxShadow: '0 2px 6px rgba(245,158,11,0.08)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Receipt size={16} color="#D97706" />
                <span style={{ fontSize: 12, fontWeight: 700, color: '#92400E' }}>
                  {talanganSummary.pendingCount} Talangan Perlu Diganti
                </span>
              </div>
              <span style={{ fontSize: 13, fontWeight: 800, color: '#B45309' }}>
                {formatRupiah(talanganSummary.totalPending)}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 10 }}>
              <button
                onClick={handleReimburseAll}
                disabled={reimbursingAll}
                style={{
                  background: '#4F46E5', color: '#fff', border: 'none', borderRadius: 8,
                  padding: '6px 14px', fontSize: 11.5, fontWeight: 700, cursor: 'pointer',
                  opacity: reimbursingAll ? 0.6 : 1
                }}
              >
                Ganti Semua dari Kas
              </button>
            </div>
          </div>
        )}

        {/* Quick Links Row (Tabungan, Anggaran, Hutang) */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
          <Link href="/savings" style={{ textDecoration: 'none' }}>
            <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 14, padding: '12px 10px', textAlign: 'center' }}>
              <PiggyBank size={18} color="#059669" style={{ margin: '0 auto 4px' }} />
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-primary)' }}>Tabungan</div>
              <div style={{ fontSize: 12.5, fontWeight: 800, color: '#059669', marginTop: 2 }}>{compactRp(totalGoalProgress)}</div>
              <div style={{ fontSize: 9.5, color: 'var(--text-secondary)', marginTop: 2 }}>{goals.length} kantong</div>
            </div>
          </Link>
          <Link href="/budget" style={{ textDecoration: 'none' }}>
            <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 14, padding: '12px 10px', textAlign: 'center' }}>
              <BarChart2 size={18} color="#6366F1" style={{ margin: '0 auto 4px' }} />
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-primary)' }}>Anggaran</div>
              <div style={{ fontSize: 12.5, fontWeight: 800, color: budgetPct >= 90 ? '#DC2626' : '#6366F1', marginTop: 2 }}>{budgetPct}%</div>
              <div style={{ fontSize: 9.5, color: 'var(--text-secondary)', marginTop: 2 }}>terpakai</div>
            </div>
          </Link>
          <Link href="/wallet" style={{ textDecoration: 'none' }}>
            <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 14, padding: '12px 10px', textAlign: 'center' }}>
              <CreditCard size={18} color="#F59E0B" style={{ margin: '0 auto 4px' }} />
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-primary)' }}>Hutang</div>
              <div style={{ fontSize: 12.5, fontWeight: 800, color: totalDebt > 0 ? '#DC2626' : '#059669', marginTop: 2 }}>{compactRp(totalDebt)}</div>
              <div style={{ fontSize: 9.5, color: 'var(--text-secondary)', marginTop: 2 }}>kewajiban</div>
            </div>
          </Link>
        </div>

        {/* Pengeluaran per Kategori (Mobile) */}
        <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 18, padding: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>Pengeluaran per Kategori</span>
            <span style={{ fontSize: 11, color: 'var(--primary)', fontWeight: 600 }}>{monthLabel}</span>
          </div>
          {catSlices.length === 0 ? (
            <div style={{ textAlign: 'center', color: 'var(--text-secondary)', fontSize: 12, padding: '16px 0' }}>Belum ada pengeluaran</div>
          ) : (
            <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
              <DonutChart slices={catSlices} size={90} strokeW={16} centerText={compactRp(summary.totalCashOut)} />
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
                {catSlices.slice(0, 4).map((s, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <div style={{ width: 8, height: 8, borderRadius: 2, background: s.color, flexShrink: 0 }} />
                    <span style={{ flex: 1, fontSize: 11, color: 'var(--text-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.name}</span>
                    <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-primary)' }}>{s.pct}%</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Transaksi Terbaru (Mobile) */}
        <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 18, padding: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>Transaksi Terbaru</span>
            <Link href="/transactions" prefetch={true} style={{ fontSize: 11, color: 'var(--primary)', fontWeight: 600, textDecoration: 'none' }}>
              Lihat Semua →
            </Link>
          </div>
          {recentTxns.length === 0 ? (
            <div style={{ textAlign: 'center', color: 'var(--text-secondary)', fontSize: 12, padding: '16px 0' }}>Belum ada transaksi</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {recentTxns.map(t => (
                <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{
                    width: 34, height: 34, borderRadius: 10,
                    background: t.type === 'masuk' ? '#ECFDF5' : '#FEF2F2',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 14, flexShrink: 0,
                  }}>
                    {catIcon(t.category)}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {t.note || t.category}
                    </div>
                    <div style={{ fontSize: 10, color: 'var(--text-secondary)' }}>{t.category}</div>
                  </div>
                  <div style={{ fontSize: 12.5, fontWeight: 700, color: t.type === 'masuk' ? '#059669' : '#DC2626', flexShrink: 0 }}>
                    {t.type === 'masuk' ? '+' : '-'}{formatRupiah(t.amount)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {showAddModal && (
          <SetoranModal
            person={person} setPerson={setPerson}
            amountInput={amountInput} setAmountInput={setAmountInput}
            noteInput={noteInput} setNoteInput={setNoteInput}
            onClose={() => setShowAddModal(false)} onSubmit={handleSaveSetoran}
          />
        )}
        {showExpenseModal && (
          <TransactionModal onClose={() => setShowExpenseModal(false)} onSave={handleSaveExpense} />
        )}
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // ─── DESKTOP / TABLET RENDER ───────────────────────────────────────────
  // ═══════════════════════════════════════════════════════════════════════════
  return (
    <div style={{ width: '100%', maxWidth: '100%', minWidth: 0, boxSizing: 'border-box' }}>
      {/* ── TOP HEADER BAR ── */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 16,
        marginBottom: 20,
      }}>
        <div>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: '#EEF2FF', color: '#4F46E5', padding: '4px 10px', borderRadius: 9999, fontSize: 11.5, fontWeight: 700, marginBottom: 6 }}>
            <Sparkles size={13} />
            <span>Keuangan Keluarga · {monthLabel} {year}</span>
          </div>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: 'var(--text-primary)', margin: 0, letterSpacing: '-0.02em' }}>
            Dashboard Keuangan Keluarga
          </h1>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--text-secondary)' }}>
            Pantau arus kas bersama, pos simpanan, dan pertanggungjawaban talangan keluarga
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button
            onClick={() => setShowAddModal(true)}
            className="btn btn-primary"
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 16px' }}
          >
            <Plus size={15} /> Setor Kas
          </button>
          <button
            onClick={() => setShowExpenseModal(true)}
            className="btn btn-secondary"
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 16px' }}
          >
            <ArrowUpRight size={15} /> Catat Pengeluaran
          </button>
        </div>
      </div>

      {/* ── HERO COMMAND CENTER: 2 Columns (60% Balance Hero, 40% Side Pillars) ── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'minmax(0, 1.4fr) minmax(0, 1fr)',
        gap: 16,
        marginBottom: 16,
      }}>
        {/* HERO CARD (Dark Indigo Deep Slate) */}
        <div style={{
          background: 'linear-gradient(135deg, #0F172A 0%, #1E1B4B 45%, #312E81 100%)',
          borderRadius: 22,
          padding: '24px 28px',
          color: '#FFFFFF',
          boxShadow: '0 10px 30px -5px rgba(15, 23, 42, 0.25)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          minHeight: 220,
          position: 'relative',
          overflow: 'hidden',
        }}>
          {/* Subtle decorative glow */}
          <div style={{ position: 'absolute', top: -40, right: -40, width: 160, height: 160, borderRadius: '50%', background: 'rgba(99, 102, 241, 0.15)', filter: 'blur(30px)' }} />

          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Wallet size={16} color="#A5B4FC" />
                </div>
                <span style={{ fontSize: 11.5, color: '#A5B4FC', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  Saldo Kas Bersama
                </span>
              </div>
              <button
                onClick={() => setBalanceHidden(v => !v)}
                style={{ background: 'rgba(255,255,255,0.08)', border: 'none', borderRadius: 8, padding: '5px 8px', color: '#A5B4FC', cursor: 'pointer' }}
                title="Sembunyikan / Tampilkan Saldo"
              >
                {balanceHidden ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>

            <div style={{ fontSize: 'clamp(28px, 3.5vw, 40px)', fontWeight: 800, letterSpacing: '-0.03em', lineHeight: 1.1, marginBottom: 14 }}>
              {balanceHidden ? '••••••••' : formatRupiah(summary.closingBalance)}
            </div>

            {/* 3 Metric Pills inside Hero */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <div style={{
                background: 'rgba(16, 185, 129, 0.15)', border: '1px solid rgba(16, 185, 129, 0.3)',
                padding: '4px 10px', borderRadius: 8, display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, fontWeight: 700, color: '#34D399'
              }}>
                <ArrowDownLeft size={13} />
                <span>Masuk: +{compactRp(summary.totalCashIn)}</span>
              </div>
              <div style={{
                background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.3)',
                padding: '4px 10px', borderRadius: 8, display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, fontWeight: 700, color: '#F87171'
              }}>
                <ArrowUpRight size={13} />
                <span>Keluar: -{compactRp(summary.totalCashOut)}</span>
              </div>
              <div style={{
                background: summary.netCashFlow >= 0 ? 'rgba(99, 102, 241, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                border: `1px solid ${summary.netCashFlow >= 0 ? 'rgba(165, 180, 252, 0.3)' : 'rgba(248, 113, 113, 0.3)'}`,
                padding: '4px 10px', borderRadius: 8, display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, fontWeight: 700,
                color: summary.netCashFlow >= 0 ? '#C7D2FE' : '#FCA5A5'
              }}>
                <span>Arus Bersih: {summary.netCashFlow >= 0 ? '+' : ''}{compactRp(summary.netCashFlow)}</span>
              </div>
            </div>
          </div>

          {/* Hero Action Row */}
          <div style={{ display: 'flex', gap: 10, marginTop: 20, alignItems: 'center' }}>
            <button
              onClick={() => setShowAddModal(true)}
              style={{
                background: '#FFFFFF', color: '#0F172A', border: 'none', borderRadius: 10,
                padding: '9px 18px', fontSize: 13, fontWeight: 700, cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: 6, boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
              }}
            >
              <Plus size={15} /> Setor Kas
            </button>
            <button
              onClick={() => setShowExpenseModal(true)}
              style={{
                background: 'rgba(255,255,255,0.12)', color: '#FFFFFF', border: '1px solid rgba(255,255,255,0.2)',
                borderRadius: 10, padding: '9px 18px', fontSize: 13, fontWeight: 700, cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: 6
              }}
            >
              <ArrowUpRight size={15} /> Catat Pengeluaran
            </button>
            <Link
              href="/transactions"
              prefetch={true}
              style={{
                marginLeft: 'auto', color: '#C7D2FE', fontSize: 12.5, fontWeight: 600,
                textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4
              }}
            >
              Buku Kas →
            </Link>
          </div>
        </div>

        {/* SIDE PILLAR CARDS (Stacked) */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Card 1: Tabungan Keluarga */}
          <div style={{
            background: 'var(--card)',
            borderRadius: 18,
            padding: '18px 20px',
            border: '1px solid var(--border)',
            boxShadow: 'var(--shadow)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            flex: 1,
          }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 34, height: 34, borderRadius: 10, background: '#ECFDF5', color: '#059669', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <PiggyBank size={18} />
                </div>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Tabungan Keluarga
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
                    {goals.length} kantong aktif
                  </div>
                </div>
              </div>
              <span style={{ fontSize: 10.5, fontWeight: 700, background: '#ECFDF5', color: '#059669', padding: '2px 8px', borderRadius: 9999 }}>
                Pos Simpanan
              </span>
            </div>

            <div style={{ margin: '10px 0' }}>
              <div style={{ fontSize: 24, fontWeight: 800, color: '#0F172A', lineHeight: 1.1 }}>
                {formatRupiah(totalGoalProgress)}
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border)', paddingTop: 10 }}>
              <span style={{ fontSize: 11.5, color: 'var(--text-secondary)' }}>
                {goals.length > 0 ? goals.map(g => g.name).slice(0, 2).join(', ') : 'Belum ada kantong'}
              </span>
              <button
                onClick={() => router.push('/savings')}
                style={{
                  background: 'none', border: 'none', color: '#059669', fontSize: 12.5,
                  fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, padding: 0
                }}
              >
                Kelola Tabungan →
              </button>
            </div>
          </div>

          {/* Card 2: Anggaran Bulanan */}
          <div style={{
            background: 'var(--card)',
            borderRadius: 18,
            padding: '18px 20px',
            border: '1px solid var(--border)',
            boxShadow: 'var(--shadow)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            flex: 1,
          }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 34, height: 34, borderRadius: 10, background: '#EEF2FF', color: '#6366F1', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <BarChart2 size={18} />
                </div>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Kesehatan Anggaran
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
                    Alokasi belanja bulan ini
                  </div>
                </div>
              </div>
              <span style={{
                fontSize: 10.5, fontWeight: 700,
                background: budgetPct >= 90 ? '#FEF2F2' : '#EEF2FF',
                color: budgetPct >= 90 ? '#DC2626' : '#4F46E5',
                padding: '2px 8px', borderRadius: 9999
              }}>
                {budgetPct}% Terpakai
              </span>
            </div>

            <div style={{ margin: '8px 0' }}>
              <div style={{ height: 7, borderRadius: 9999, background: '#F1F5F9', overflow: 'hidden' }}>
                <div style={{
                  height: '100%', width: `${budgetPct}%`,
                  background: budgetPct >= 90 ? '#DC2626' : budgetPct >= 75 ? '#F59E0B' : '#6366F1',
                  borderRadius: 9999, transition: 'width 0.4s ease'
                }} />
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border)', paddingTop: 10 }}>
              <span style={{ fontSize: 11.5, color: 'var(--text-secondary)' }}>
                Sisa: <strong style={{ color: remainingBudget < 0 ? '#DC2626' : '#059669' }}>{formatRupiah(remainingBudget)}</strong>
              </span>
              <button
                onClick={() => router.push('/budget')}
                style={{
                  background: 'none', border: 'none', color: '#4F46E5', fontSize: 12.5,
                  fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, padding: 0
                }}
              >
                Atur Anggaran →
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── TALANGAN & REIMBURSEMENT BANNER (CLEAN COLLAPSIBLE WIDGET) ── */}
      {talanganSummary.pendingCount > 0 ? (
        <div style={{
          background: 'linear-gradient(135deg, #FFFBEB 0%, #FEF3C7 100%)',
          borderRadius: 18,
          border: '1px solid #FDE68A',
          padding: '16px 20px',
          marginBottom: 16,
          boxShadow: '0 2px 8px rgba(245, 158, 11, 0.08)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{
                width: 38, height: 38, borderRadius: 10,
                background: '#F59E0B', color: '#FFFFFF',
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
              }}>
                <Receipt size={20} />
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 14, fontWeight: 800, color: '#92400E' }}>
                    {talanganSummary.pendingCount} Transaksi Talangan Perlu Diganti
                  </span>
                  <span style={{ fontSize: 11, fontWeight: 700, background: '#FDE68A', color: '#78350F', padding: '2px 8px', borderRadius: 9999 }}>
                    Total {formatRupiah(talanganSummary.totalPending)}
                  </span>
                </div>
                <div style={{ fontSize: 12, color: '#78350F', marginTop: 2 }}>
                  Asykar: {formatRupiah(talanganSummary.asykarPending)} · Riska (Istri): {formatRupiah(talanganSummary.istriPending)}
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <button
                onClick={() => setShowTalanganDetail(v => !v)}
                style={{
                  background: 'rgba(255,255,255,0.7)', border: '1px solid #FCD34D',
                  borderRadius: 10, padding: '7px 12px', fontSize: 12, fontWeight: 700,
                  color: '#92400E', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4
                }}
              >
                <span>{showTalanganDetail ? 'Tutup Rincian' : 'Lihat Rincian'}</span>
                {showTalanganDetail ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              </button>

              <button
                onClick={handleReimburseAll}
                disabled={reimbursingAll}
                style={{
                  background: '#D97706', color: '#FFFFFF', border: 'none',
                  borderRadius: 10, padding: '7px 14px', fontSize: 12, fontWeight: 700,
                  cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
                  boxShadow: '0 2px 6px rgba(217, 119, 6, 0.25)',
                  opacity: reimbursingAll ? 0.6 : 1
                }}
              >
                <RotateCcw size={13} />
                <span>Ganti Semua Sekarang</span>
              </button>
            </div>
          </div>

          {/* Collapsible Items List */}
          {showTalanganDetail && (
            <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid #FDE68A', display: 'flex', flexDirection: 'column', gap: 8 }}>
              {talanganSummary.pendingItems.map(t => (
                <div
                  key={t.id}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '10px 14px', background: '#FFFFFF', borderRadius: 10,
                    border: '1px solid #FDE68A', gap: 12
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                    <div style={{
                      width: 26, height: 26, borderRadius: '50%',
                      background: t.paidBy === 'asykar' ? '#4F46E5' : '#BE185D',
                      color: '#fff', fontSize: 11, fontWeight: 700,
                      display: 'flex', alignItems: 'center', justifyContent: 'center'
                    }}>
                      {t.paidBy === 'asykar' ? 'A' : 'R'}
                    </div>
                    <div>
                      <div style={{ fontSize: 12.5, fontWeight: 700, color: '#0F172A' }}>
                        {t.note || t.category}
                      </div>
                      <div style={{ fontSize: 11, color: '#64748B' }}>
                        {fmtDate(t.date)} · Ditalangi {t.paidBy === 'asykar' ? 'Asykar' : 'Riska'}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontSize: 13, fontWeight: 800, color: '#DC2626' }}>
                      -{formatRupiah(t.amount)}
                    </span>
                    <button
                      onClick={() => handleReimburse(t)}
                      disabled={reimbursingId === t.id}
                      style={{
                        background: '#059669', color: '#fff', border: 'none',
                        borderRadius: 8, padding: '5px 10px', fontSize: 11, fontWeight: 700,
                        cursor: 'pointer', opacity: reimbursingId === t.id ? 0.6 : 1
                      }}
                    >
                      Ganti
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : talanganSummary.reimbursedCountThisMonth > 0 ? (
        <div style={{
          background: '#ECFDF5', border: '1px solid #A7F3D0', borderRadius: 14,
          padding: '10px 16px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8,
          fontSize: 12, color: '#065F46', fontWeight: 600
        }}>
          <CheckCircle2 size={16} color="#059669" />
          <span>Semua talangan anggota lunas ({talanganSummary.reimbursedCountThisMonth} transaksi telah diganti bulan ini).</span>
        </div>
      ) : null}

      {reimburseFeedback && (
        <div style={{
          background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: 10,
          padding: '8px 14px', marginBottom: 14, color: '#15803D', fontSize: 12.5, fontWeight: 600,
          display: 'flex', alignItems: 'center', gap: 8
        }}>
          <CheckCircle2 size={15} />
          <span>{reimburseFeedback}</span>
        </div>
      )}

      {/* ── CORE INSIGHTS GRID: 2 Balanced Columns ── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: 16,
      }}>
        {/* LEFT COLUMN: Spending by Category + Arus Kas (Money Flow) */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Card: Pengeluaran per Kategori */}
          <div style={{
            background: 'var(--card)',
            borderRadius: 18,
            padding: '20px',
            border: '1px solid var(--border)',
            boxShadow: 'var(--shadow)',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div>
                <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', display: 'block' }}>
                  Pengeluaran per Kategori
                </span>
                <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
                  Total {formatRupiah(summary.totalCashOut)}
                </span>
              </div>
              <Link href="/analytics" style={{ fontSize: 12, color: '#4F46E5', fontWeight: 600, textDecoration: 'none' }}>
                Analitik Lengkap →
              </Link>
            </div>

            {catSlices.length === 0 ? (
              <div style={{ textAlign: 'center', color: 'var(--text-secondary)', fontSize: 12, padding: '24px 0' }}>
                Belum ada pengeluaran tercatat bulan ini
              </div>
            ) : (
              <div style={{ display: 'flex', gap: 18, alignItems: 'center' }}>
                <DonutChart slices={catSlices} size={110} strokeW={18} centerText={compactRp(summary.totalCashOut)} />
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {catSlices.map((s, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ width: 8, height: 8, borderRadius: '50%', background: s.color, flexShrink: 0 }} />
                      <span style={{ flex: 1, fontSize: 12, color: 'var(--text-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {s.name}
                      </span>
                      <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)' }}>
                        {s.pct}%
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Card: Money Flow 6 Bulan */}
          <div style={{
            background: 'var(--card)',
            borderRadius: 18,
            padding: '20px',
            border: '1px solid var(--border)',
            boxShadow: 'var(--shadow)',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>
                Arus Uang (Money Flow 6 Bulan)
              </span>
              <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>Tren Kas Masuk vs Keluar</span>
            </div>
            <BarFlowChart labels={flowData.labels} income={flowData.income} expense={flowData.expense} />
          </div>
        </div>

        {/* RIGHT COLUMN: Recent Transactions + Kontribusi Anggota */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Card: Transaksi Kas Terbaru */}
          <div style={{
            background: 'var(--card)',
            borderRadius: 18,
            padding: '20px',
            border: '1px solid var(--border)',
            boxShadow: 'var(--shadow)',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>
                Transaksi Kas Terbaru
              </span>
              <Link href="/transactions" prefetch={true} style={{ fontSize: 12, color: '#4F46E5', fontWeight: 600, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4 }}>
                Semua Transaksi <ArrowRight size={12} />
              </Link>
            </div>

            {recentTxns.length === 0 ? (
              <div style={{ textAlign: 'center', color: 'var(--text-secondary)', fontSize: 12, padding: '24px 0' }}>
                Belum ada transaksi di bulan ini
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {recentTxns.map(t => (
                  <div
                    key={t.id}
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '8px 10px', borderRadius: 10, background: 'var(--bg-secondary)',
                      gap: 10,
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0, flex: 1 }}>
                      <div style={{
                        width: 32, height: 32, borderRadius: 8,
                        background: t.type === 'masuk' ? '#ECFDF5' : '#FEF2F2',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 14, flexShrink: 0
                      }}>
                        {catIcon(t.category)}
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {t.note || t.category}
                        </div>
                        <div style={{ fontSize: 10.5, color: 'var(--text-secondary)' }}>
                          {fmtDate(t.date)} · {t.category}
                        </div>
                      </div>
                    </div>

                    <div style={{
                      fontSize: 13, fontWeight: 800,
                      color: t.type === 'masuk' ? '#059669' : '#DC2626',
                      textAlign: 'right', flexShrink: 0
                    }}>
                      {t.type === 'masuk' ? '+' : '-'}{formatRupiah(t.amount)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Card: Kontribusi Setoran Anggota */}
          <div style={{
            background: 'var(--card)',
            borderRadius: 18,
            padding: '20px',
            border: '1px solid var(--border)',
            boxShadow: 'var(--shadow)',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>
                Setoran Kas Anggota ({monthLabel})
              </span>
              <span style={{ fontSize: 12, fontWeight: 800, color: '#059669' }}>
                Total {formatRupiah(totalSetoran)}
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {/* Asykar */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, fontWeight: 700, marginBottom: 4 }}>
                  <span style={{ color: 'var(--text-primary)' }}>Asykar (Suami)</span>
                  <span style={{ color: '#4F46E5' }}>{formatRupiah(asykarAmount)} ({asykarPct}%)</span>
                </div>
                <div style={{ height: 7, borderRadius: 9999, background: '#F1F5F9', overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${asykarPct}%`, background: '#4F46E5', borderRadius: 9999 }} />
                </div>
              </div>

              {/* Riska */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, fontWeight: 700, marginBottom: 4 }}>
                  <span style={{ color: 'var(--text-primary)' }}>Riska (Istri)</span>
                  <span style={{ color: '#BE185D' }}>{formatRupiah(istriAmount)} ({istriPct}%)</span>
                </div>
                <div style={{ height: 7, borderRadius: 9999, background: '#F1F5F9', overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${istriPct}%`, background: '#BE185D', borderRadius: 9999 }} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── MODALS ── */}
      {showAddModal && (
        <SetoranModal
          person={person} setPerson={setPerson}
          amountInput={amountInput} setAmountInput={setAmountInput}
          noteInput={noteInput} setNoteInput={setNoteInput}
          onClose={() => setShowAddModal(false)} onSubmit={handleSaveSetoran}
        />
      )}

      {showExpenseModal && (
        <TransactionModal
          onClose={() => setShowExpenseModal(false)}
          onSave={handleSaveExpense}
        />
      )}
    </div>
  );
}

// ─── Setoran Modal (Shared) ─────────────────────────────────────────────────
function SetoranModal({
  person, setPerson, amountInput, setAmountInput, noteInput, setNoteInput, onClose, onSubmit,
}: {
  person: 'asykar' | 'istri';
  setPerson: (p: 'asykar' | 'istri') => void;
  amountInput: string;
  setAmountInput: (v: string) => void;
  noteInput: string;
  setNoteInput: (v: string) => void;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
}) {
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.5)', backdropFilter: 'blur(4px)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{ background: 'var(--card)', borderRadius: 20, padding: 24, width: '100%', maxWidth: 440, boxShadow: '0 20px 25px -5px rgba(0,0,0,0.15)', border: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h3 style={{ fontSize: 17, fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>Tambah Setoran Kas Bersama</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', padding: 4 }}><X size={18} /></button>
        </div>
        <form onSubmit={onSubmit}>
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 12.5, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 8 }}>Disetor Oleh:</label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              {[{ id: 'asykar' as const, label: 'Asykar (Suami)', color: '#4F46E5', bg: '#EEF2FF' }, { id: 'istri' as const, label: 'Riska (Istri)', color: '#BE185D', bg: '#FDF2F8' }].map(opt => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setPerson(opt.id)}
                  style={{
                    padding: '10px 14px', borderRadius: 12,
                    border: person === opt.id ? `2px solid ${opt.color}` : '1px solid var(--border)',
                    background: person === opt.id ? opt.bg : 'var(--card)',
                    color: person === opt.id ? opt.color : 'var(--text-secondary)',
                    fontWeight: 700, cursor: 'pointer', fontSize: 13
                  }}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 12.5, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>Nominal Setoran (Rp) *</label>
            <input
              type="number"
              value={amountInput}
              onChange={e => setAmountInput(e.target.value)}
              placeholder="0"
              required
              autoFocus
              className="form-input"
            />
          </div>
          <div style={{ marginBottom: 20 }}>
            <label style={{ display: 'block', fontSize: 12.5, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>Catatan (Opsional)</label>
            <input
              type="text"
              value={noteInput}
              onChange={e => setNoteInput(e.target.value)}
              placeholder={`Setoran ${person === 'asykar' ? 'Asykar' : 'Riska'}`}
              className="form-input"
            />
          </div>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <button type="button" onClick={onClose} className="btn btn-ghost">Batal</button>
            <button type="submit" className="btn btn-primary">Simpan Setoran</button>
          </div>
        </form>
      </div>
    </div>
  );
}
