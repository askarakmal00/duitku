'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Wallet,
  TrendingUp,
  TrendingDown,
  Plus,
  X,
  Bell,
  Search,
  MoreHorizontal,
  ArrowUpRight,
  Eye,
  EyeOff,
  ChevronDown,
  BarChart2,
  Target,
  CreditCard,
  ArrowRight,
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
} from '@/lib/store';
import { getFamilyContributions, saveFamilyContribution } from '@/lib/spaceStore';
import { useDataRefresh } from '@/lib/useDataRefresh';
import SpaceSwitcher from '@/components/SpaceSwitcher';
import TransactionModal from '@/components/TransactionModal';
import { Transaction } from '@/lib/types';

// ─── Category colour palette (matches reference donut) ────────────────────
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

// ─── Category icons (emoji shortcuts) ─────────────────────────────────────
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

// ─── Compact rupiah for mobile only ───────────────────────────────────────
function compactRp(n: number): string {
  if (n >= 1_000_000_000) return `Rp ${(n / 1_000_000_000).toFixed(1)}M`;
  if (n >= 1_000_000) return `Rp ${(n / 1_000_000).toFixed(1)}jt`;
  if (n >= 1_000) return `Rp ${(n / 1_000).toFixed(0)}rb`;
  return `Rp ${n}`;
}

// ─── Simple SVG donut chart ────────────────────────────────────────────────
interface DonutSlice { name: string; amount: number; pct: number; color: string }

function DonutChart({ slices, size = 140, strokeW = 28, centerText, centerSub }: {
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
      {/* background ring */}
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
          <text x="50%" y="46%" textAnchor="middle" dominantBaseline="middle" fontSize="13" fontWeight="800" fill="#0F172A">
            {centerText}
          </text>
          {centerSub && (
            <text x="50%" y="60%" textAnchor="middle" dominantBaseline="middle" fontSize="10" fill="#64748B">
              {centerSub}
            </text>
          )}
        </>
      )}
    </svg>
  );
}

// ─── Circular gauge (for Anggaran card) ────────────────────────────────────
function GaugeChart({ pct, size = 130 }: { pct: number; size?: number }) {
  const strokeW = 18;
  const r = (size - strokeW) / 2;
  const circ = 2 * Math.PI * r;
  const filled = clamp(pct / 100, 0, 1) * circ;
  const color = pct >= 90 ? '#EF4444' : pct >= 70 ? '#F59E0B' : '#10B981';
  return (
    <svg width={size} height={size} style={{ flexShrink: 0 }}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#F1F5F9" strokeWidth={strokeW} />
      <circle
        cx={size / 2} cy={size / 2} r={r}
        fill="none" stroke={color} strokeWidth={strokeW}
        strokeDasharray={`${filled} ${circ - filled}`}
        strokeDashoffset={-circ * 0.75 * 0 /* starts from top via transform */}
        strokeLinecap="round"
        style={{ transformOrigin: `${size / 2}px ${size / 2}px`, transform: 'rotate(-90deg)', transition: 'stroke-dasharray 0.5s ease' }}
      />
      <text x="50%" y="44%" textAnchor="middle" dominantBaseline="middle" fontSize="20" fontWeight="800" fill="#0F172A">
        {pct}%
      </text>
      <text x="50%" y="62%" textAnchor="middle" dominantBaseline="middle" fontSize="10" fill="#64748B">
        Terpakai
      </text>
    </svg>
  );
}

// ─── Bar chart (Money Flow) ─────────────────────────────────────────────────
function BarFlowChart({ labels, income, expense }: { labels: string[]; income: number[]; expense: number[] }) {
  const maxVal = Math.max(...income, ...expense, 1);
  const barH = 120;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, width: '100%' }}>
      {/* Legend */}
      <div style={{ display: 'flex', gap: 16, fontSize: 11, color: '#64748B' }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <span style={{ width: 8, height: 8, borderRadius: 2, background: '#10B981', display: 'inline-block' }} />
          Pemasukan
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <span style={{ width: 8, height: 8, borderRadius: 2, background: '#F87171', display: 'inline-block' }} />
          Pengeluaran
        </span>
      </div>
      {/* Chart */}
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: barH, width: '100%' }}>
        {labels.map((label, i) => {
          const inH = Math.round((income[i] / maxVal) * barH);
          const exH = Math.round((expense[i] / maxVal) * barH);
          return (
            <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 2, height: barH }}>
                <div style={{ width: 10, height: inH, background: '#10B981', borderRadius: '3px 3px 0 0', minHeight: 2 }} title={`Pemasukan: ${formatRupiah(income[i])}`} />
                <div style={{ width: 10, height: exH, background: '#F87171', borderRadius: '3px 3px 0 0', minHeight: 2 }} title={`Pengeluaran: ${formatRupiah(expense[i])}`} />
              </div>
              <span style={{ fontSize: 10, color: '#94A3B8', marginTop: 4 }}>{label}</span>
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
  onOpenAddGoal?: () => void;
}

export default function FamilyDashboardRedesign({
  year,
  month,
  userName = 'Keluarga',
  isMobile = false,
  onOpenAddGoal,
}: FamilyDashboardRedesignProps) {
  const router = useRouter();
  const monthLabel = getMonthName(year, month);

  const [asykarAmount, setAsykarAmount] = useState(0);
  const [istriAmount, setIstriAmount] = useState(0);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [person, setPerson] = useState<'asykar' | 'istri'>('asykar');
  const [amountInput, setAmountInput] = useState('');
  const [noteInput, setNoteInput] = useState('');
  const [balanceHidden, setBalanceHidden] = useState(false);
  const monthKey = `${year}-${String(month).padStart(2, '0')}`;

  // ─── Data ─────────────────────────────────────────────────────────────
  const summary = getDashboardFinanceSummary(year, month, 'keluarga');
  const rawBreakdown = getCategoryBreakdown(year, month, 'keluarga');
  // Cleanly merge categories into top-4 plus single Lainnya without duplication
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

  // Budget gauge
  const budgetPos = getBudgetPos('keluarga');
  const totalBudget = budgetPos.reduce((s, p) => s + p.monthlyAllocation, 0);
  const totalBudgetUsed = budgetPos.reduce((s, p) => s + getBudgetUsed(p.id, year, month, 'keluarga'), 0);
  const budgetPct = totalBudget > 0 ? Math.round(clamp((totalBudgetUsed / totalBudget) * 100, 0, 100)) : 0;

  // Savings / Goals
  const goals = getSavingGoals('keluarga');
  const totalGoalProgress = goals.reduce((s, g) => s + getGoalProgress(g.id, 'keluarga'), 0);
  const totalGoalTarget = goals.reduce((s, g) => s + g.targetAmount, 0);
  const goalPct = totalGoalTarget > 0 ? Math.round(clamp((totalGoalProgress / totalGoalTarget) * 100, 0, 100)) : 0;

  // Debt
  const totalDebt = getTotalDebt('keluarga');

  // Money flow chart
  const flowData = getMonthlyFlowData(6, 'keluarga');

  // Recent transactions
  const recentTxns = getTransactions('keluarga')
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 5);

  // ─── Contributions ────────────────────────────────────────────────────
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

  // ─── Contribution ratios ───────────────────────────────────────────────
  const totalSetoran = asykarAmount + istriAmount > 0 ? asykarAmount + istriAmount : summary.totalCashIn;
  const asykarPct = totalSetoran > 0 ? Math.round((asykarAmount / totalSetoran) * 100) : 67;
  const istriPct = totalSetoran > 0 ? (100 - asykarPct) : 33;

  // Growth badges
  const incomeGrowth = summary.incomeGrowthPct;
  const expenseGrowth = summary.expenseGrowthPct;

  // ─── Save setoran modal ────────────────────────────────────────────────
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

  // ─── Helper: format date for table ────────────────────────────────────
  const fmtDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return `${String(d.getDate()).padStart(2, '0')} ${d.toLocaleDateString('id-ID', { month: 'short' })}`;
  };

  // ─── Growth badge helper ───────────────────────────────────────────────
  const GrowthBadge = ({ pct, inverse = false }: { pct: number | null; inverse?: boolean }) => {
    if (pct === null) return null;
    const isPositive = inverse ? pct < 0 : pct >= 0;
    return (
      <span style={{
        display: 'inline-flex', alignItems: 'center', gap: 2,
        fontSize: 11, fontWeight: 700,
        color: isPositive ? '#059669' : '#DC2626',
        background: isPositive ? '#D1FAE5' : '#FEE2E2',
        padding: '2px 8px', borderRadius: 9999,
      }}>
        {isPositive ? '↑' : '↓'}{Math.abs(Math.round(pct))}%
      </span>
    );
  };

  // ─── MOBILE RENDER ─────────────────────────────────────────────────────
  if (isMobile) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16, paddingBottom: 8 }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: 22, fontWeight: 800, color: '#0F172A', lineHeight: 1.2 }}>
              Halo, Keluarga 👋
            </div>
            <div style={{ fontSize: 12, color: '#64748B', marginTop: 2 }}>{monthLabel} · Ringkasan keuangan</div>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <SpaceSwitcher />
            <div style={{
              width: 36, height: 36, borderRadius: '50%', background: '#4F46E5', color: '#fff',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontWeight: 700, fontSize: 14,
            }}>K</div>
          </div>
        </div>

        {/* Dark Balance Card */}
        <div style={{
          background: 'linear-gradient(135deg, #3730A3 0%, #1E1B4B 100%)',
          borderRadius: 20, padding: '20px 20px 16px',
          color: '#fff', position: 'relative', overflow: 'hidden',
        }}>
          {/* decorative circle */}
          <div style={{ position: 'absolute', top: -30, right: -30, width: 120, height: 120, borderRadius: '50%', background: 'rgba(255,255,255,0.06)' }} />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontSize: 11, color: '#A5B4FC', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: 6 }}>
                Saldo Kas Bersama
              </div>
              <div style={{ fontSize: 28, fontWeight: 800, letterSpacing: '-0.02em', lineHeight: 1.1 }}>
                {balanceHidden ? '••••••••' : formatRupiah(summary.closingBalance)}
              </div>
              {incomeGrowth !== null && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 4 }}>
                  <ArrowUpRight size={12} color="#34D399" />
                  <span style={{ fontSize: 11, color: '#34D399', fontWeight: 600 }}>
                    {Math.abs(Math.round(incomeGrowth))}% dari bulan lalu
                  </span>
                </div>
              )}
            </div>
            <button onClick={() => setBalanceHidden(v => !v)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#A5B4FC', padding: 4, marginTop: -4 }}>
              {balanceHidden ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>

          {/* 2 mini stat */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 16 }}>
            <div style={{ background: 'rgba(255,255,255,0.08)', borderRadius: 12, padding: '10px 12px' }}>
              <div style={{ fontSize: 10, color: '#A5B4FC', marginBottom: 4, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Pengeluaran</div>
              <div style={{ fontSize: 14, fontWeight: 800 }}>{compactRp(summary.totalCashOut)}</div>
              {expenseGrowth !== null && (
                <div style={{ fontSize: 10, color: expenseGrowth < 0 ? '#34D399' : '#F87171', marginTop: 2 }}>
                  {expenseGrowth >= 0 ? '↑' : '↓'}{Math.abs(Math.round(expenseGrowth))}%
                </div>
              )}
            </div>
            <div style={{ background: 'rgba(255,255,255,0.08)', borderRadius: 12, padding: '10px 12px' }}>
              <div style={{ fontSize: 10, color: '#A5B4FC', marginBottom: 4, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Setoran Masuk</div>
              <div style={{ fontSize: 14, fontWeight: 800 }}>{compactRp(summary.totalCashIn)}</div>
              {incomeGrowth !== null && (
                <div style={{ fontSize: 10, color: incomeGrowth >= 0 ? '#34D399' : '#F87171', marginTop: 2 }}>
                  {incomeGrowth >= 0 ? '+' : ''}{Math.round(incomeGrowth)}%
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Quick links grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
          {/* Anggaran */}
          <Link href="/budget" style={{ textDecoration: 'none' }}>
            <div style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: 16, padding: '14px 12px', textAlign: 'center' }}>
              <BarChart2 size={20} color="#6366F1" style={{ marginBottom: 6 }} />
              <div style={{ fontSize: 11, fontWeight: 700, color: '#0F172A', marginBottom: 4 }}>Anggaran</div>
              <div style={{ fontSize: 10, color: '#64748B', marginBottom: 6 }}>{budgetPct}% terpakai</div>
              <div style={{ height: 4, background: '#F1F5F9', borderRadius: 9999, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${budgetPct}%`, background: budgetPct >= 90 ? '#EF4444' : '#6366F1', borderRadius: 9999 }} />
              </div>
            </div>
          </Link>
          {/* Tabungan */}
          <Link href="/goals" style={{ textDecoration: 'none' }}>
            <div style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: 16, padding: '14px 12px', textAlign: 'center' }}>
              <Target size={20} color="#10B981" style={{ marginBottom: 6 }} />
              <div style={{ fontSize: 11, fontWeight: 700, color: '#0F172A', marginBottom: 4 }}>Tabungan</div>
              <div style={{ fontSize: 10, color: '#64748B', marginBottom: 6 }}>{compactRp(totalGoalProgress)}</div>
              <div style={{ height: 4, background: '#F1F5F9', borderRadius: 9999, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${goalPct}%`, background: '#10B981', borderRadius: 9999 }} />
              </div>
            </div>
          </Link>
          {/* Hutang */}
          <Link href="/debts" style={{ textDecoration: 'none' }}>
            <div style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: 16, padding: '14px 12px', textAlign: 'center' }}>
              <CreditCard size={20} color="#F59E0B" style={{ marginBottom: 6 }} />
              <div style={{ fontSize: 11, fontWeight: 700, color: '#0F172A', marginBottom: 4 }}>Hutang</div>
              <div style={{ fontSize: 10, color: '#64748B' }}>{compactRp(totalDebt)}</div>
            </div>
          </Link>
        </div>

        {/* Pengeluaran per Kategori */}
        <div style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: 20, padding: '18px 16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: '#0F172A' }}>Pengeluaran per Kategori</span>
            <span style={{ fontSize: 11, color: '#6366F1', fontWeight: 600 }}>{monthLabel}</span>
          </div>
          {catSlices.length === 0 ? (
            <div style={{ textAlign: 'center', color: '#94A3B8', fontSize: 12, padding: '16px 0' }}>Belum ada pengeluaran bulan ini</div>
          ) : (
            <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
              <DonutChart
                slices={catSlices}
                size={100}
                strokeW={20}
                centerText={compactRp(summary.totalCashOut)}
              />
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
                {catSlices.slice(0, 5).map((s, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 8, height: 8, borderRadius: 2, background: s.color, flexShrink: 0 }} />
                    <span style={{ flex: 1, fontSize: 11, color: '#475569', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.name}</span>
                    <span style={{ fontSize: 11, fontWeight: 700, color: '#0F172A' }}>{s.pct}%</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Recent transactions (mobile) */}
        <div style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: 20, padding: '18px 16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: '#0F172A' }}>Transaksi Terbaru</span>
            <Link href="/transactions" style={{ fontSize: 11, color: '#6366F1', fontWeight: 600, textDecoration: 'none' }}>Lihat Semua →</Link>
          </div>
          {recentTxns.length === 0 ? (
            <div style={{ textAlign: 'center', color: '#94A3B8', fontSize: 12, padding: '16px 0' }}>Belum ada transaksi</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {recentTxns.map(t => (
                <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{
                    width: 36, height: 36, borderRadius: 10,
                    background: t.type === 'masuk' ? '#D1FAE5' : '#FEE2E2',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 16, flexShrink: 0,
                  }}>
                    {catIcon(t.category)}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: '#0F172A', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{t.note || t.category}</div>
                    <div style={{ fontSize: 10, color: '#94A3B8' }}>{t.category}</div>
                  </div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: t.type === 'masuk' ? '#059669' : '#DC2626', flexShrink: 0 }}>
                    {t.type === 'masuk' ? '+' : '-'}{formatRupiah(t.amount)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Setor Kas FAB-like button */}
        <button
          onClick={() => setShowAddModal(true)}
          style={{
            background: '#4F46E5', color: '#fff', border: 'none',
            borderRadius: 14, padding: '14px 0', fontWeight: 700, fontSize: 15,
            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            boxShadow: '0 4px 12px rgba(79,70,229,0.35)',
          }}
        >
          <Plus size={18} /> Setor Kas
        </button>

        {/* Modal */}
        {showAddModal && <SetoranModal person={person} setPerson={setPerson} amountInput={amountInput} setAmountInput={setAmountInput} noteInput={noteInput} setNoteInput={setNoteInput} onClose={() => setShowAddModal(false)} onSubmit={handleSaveSetoran} />}
      </div>
    );
  }

  // ─── DESKTOP / TABLET RENDER ───────────────────────────────────────────
  return (
    <div style={{ width: '100%', maxWidth: '100%', minWidth: 0, boxSizing: 'border-box' }}>

      {/* ── PAGE HEADER ─────────────────────────────────────────────── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28, flexWrap: 'wrap', gap: 12 }}>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ fontSize: 12, color: '#6366F1', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 2 }}>
            {monthLabel.toUpperCase()}
          </div>
          <h1 style={{ fontSize: 32, fontWeight: 800, color: '#0F172A', margin: 0, letterSpacing: '-0.02em', lineHeight: 1.15 }}>
            Halo, Keluarga 👋
          </h1>
          <p style={{ fontSize: 13, color: '#64748B', margin: '4px 0 0' }}>
            Ringkasan keuangan Anda bulan ini
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          {/* Search bar */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 12, padding: '8px 14px', color: '#94A3B8', fontSize: 13 }}>
            <Search size={15} />
            <span>Cari transaksi, kategori...</span>
            <span style={{ marginLeft: 8, fontSize: 11, background: '#E2E8F0', borderRadius: 6, padding: '1px 6px', color: '#64748B' }}>⌘K</span>
          </div>
          {/* Bell */}
          <button style={{ width: 40, height: 40, borderRadius: '50%', background: '#fff', border: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#475569', boxShadow: '0 1px 2px rgba(0,0,0,0.04)' }}>
            <Bell size={18} />
          </button>
          {/* Avatar */}
          <div style={{ width: 40, height: 40, borderRadius: '50%', background: '#4F46E5', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 15, boxShadow: '0 2px 4px rgba(79,70,229,0.25)' }}>K</div>
        </div>
      </div>

      {/* ── HERO ROW: 2 cards ───────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>

        {/* CARD 1: SALDO KAS BERSAMA (white) */}
        <div style={{
          background: '#FFFFFF', borderRadius: 24, padding: '24px 26px',
          border: '1px solid #E2E8F0', boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
          display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: 200,
        }}>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 38, height: 38, borderRadius: 12, background: '#D1FAE5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Wallet size={20} color="#059669" />
                </div>
                <span style={{ fontSize: 14, fontWeight: 700, color: '#475569' }}>Saldo Kas Bersama</span>
              </div>
              <button onClick={() => setBalanceHidden(v => !v)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94A3B8', padding: 4 }}>
                {balanceHidden ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>

            <div style={{ fontSize: 'clamp(26px, 4vw, 36px)', fontWeight: 800, color: '#0F172A', letterSpacing: '-0.02em', lineHeight: 1.1, marginBottom: 6 }}>
              {balanceHidden ? '••••••••' : formatRupiah(summary.closingBalance)}
            </div>
            {incomeGrowth !== null && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                <ArrowUpRight size={14} color="#059669" />
                <span style={{ fontSize: 12, color: '#059669', fontWeight: 600 }}>
                  {Math.abs(Math.round(incomeGrowth))}% dari bulan lalu
                </span>
              </div>
            )}
          </div>

          {/* Buttons */}
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 20 }}>
            <button
              onClick={() => setShowAddModal(true)}
              style={{
                background: '#0F172A', color: '#fff', border: 'none', borderRadius: 10,
                padding: '9px 18px', fontSize: 13, fontWeight: 600, cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: 6,
              }}
              title="Tambah setoran kas bersama (Asykar / Riska)"
            >
              <Plus size={14} /> Setor Kas
            </button>
            <button
              onClick={() => setShowExpenseModal(true)}
              style={{
                background: '#F8FAFC', color: '#0F172A', border: '1px solid #E2E8F0', borderRadius: 10,
                padding: '9px 18px', fontSize: 13, fontWeight: 600, cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: 6,
              }}
              title="Catat pengeluaran atau belanja menggunakan kas bersama"
            >
              <ArrowUpRight size={14} /> Catat Pengeluaran
            </button>
            <Link
              href="/transactions"
              style={{
                background: '#F8FAFC', color: '#64748B', border: '1px solid #E2E8F0', borderRadius: 10,
                padding: '9px 12px', cursor: 'pointer', fontSize: 13, display: 'flex', alignItems: 'center',
                textDecoration: 'none'
              }}
              title="Lihat riwayat transaksi kas bersama"
            >
              <MoreHorizontal size={16} />
            </Link>
          </div>
        </div>

        {/* CARD 2: TARGET TABUNGAN (light green) */}
        <div style={{
          background: '#F0FDF4', borderRadius: 24, padding: '24px 26px',
          border: '1px solid #BBF7D0', boxShadow: '0 2px 8px rgba(16,185,129,0.08)',
          display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: 200,
          position: 'relative', overflow: 'hidden',
        }}>
          {/* decorative plant SVG */}
          <div style={{ position: 'absolute', right: 20, bottom: 20, opacity: 0.3, fontSize: 60, lineHeight: 1 }}>🌱</div>
          <div style={{ position: 'absolute', top: 16, right: 16 }}>
            <span style={{ background: '#10B981', color: '#fff', borderRadius: 9999, padding: '4px 10px', fontSize: 11, fontWeight: 700 }}>Target Tabungan ⭐</span>
          </div>

          <div>
            <div style={{ fontSize: 12, color: '#059669', fontWeight: 600, marginBottom: 8, marginTop: 4 }}>Terkumpul</div>
            <div style={{ fontSize: 'clamp(26px, 4vw, 36px)', fontWeight: 800, color: '#0F172A', letterSpacing: '-0.02em', lineHeight: 1.1, marginBottom: 10 }}>
              {formatRupiah(totalGoalProgress)}
            </div>

            {/* Progress bar */}
            <div style={{ height: 8, background: '#BBF7D0', borderRadius: 9999, overflow: 'hidden', marginBottom: 8 }}>
              <div style={{ height: '100%', width: `${goalPct}%`, background: '#10B981', borderRadius: 9999, transition: 'width 0.4s ease' }} />
            </div>
            <div style={{ fontSize: 12, color: '#059669', fontWeight: 500 }}>
              {goalPct}% dari target {formatRupiah(totalGoalTarget)}
            </div>
          </div>

          <button
            onClick={() => router.push('/goals')}
            style={{ background: '#10B981', color: '#fff', border: 'none', borderRadius: 10, padding: '9px 18px', fontSize: 13, fontWeight: 600, cursor: 'pointer', alignSelf: 'flex-start', marginTop: 16 }}
          >
            Lihat Detail →
          </button>
        </div>
      </div>

      {/* ── 3 METRIC CARDS ROW ──────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 20, marginBottom: 20 }}>

        {/* METRIC 1: PENGELUARAN BULAN INI (donut) */}
        <div style={{ background: '#fff', borderRadius: 20, padding: '20px 22px', border: '1px solid #E2E8F0', boxShadow: '0 1px 4px rgba(0,0,0,0.04)', display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Header without redundant month button */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 28, height: 28, borderRadius: 8, background: '#FFEDD5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <TrendingDown size={15} color="#EA580C" />
            </div>
            <span style={{ fontSize: 12, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Pengeluaran Bulan Ini</span>
          </div>

          <div>
            <div style={{ fontSize: 'clamp(22px, 3.5vw, 30px)', fontWeight: 800, color: '#0F172A', letterSpacing: '-0.02em', lineHeight: 1.1, marginBottom: 4 }}>
              {formatRupiah(summary.totalCashOut)}
            </div>
            {expenseGrowth !== null && (
              <div style={{ fontSize: 12, color: '#64748B' }}>
                <GrowthBadge pct={expenseGrowth} inverse /> dari bulan lalu
              </div>
            )}
          </div>

          {catSlices.length === 0 ? (
            <div style={{ textAlign: 'center', color: '#94A3B8', fontSize: 12, padding: '16px 0' }}>Belum ada pengeluaran</div>
          ) : (
            <div style={{ display: 'flex', gap: 18, alignItems: 'center', marginTop: 4 }}>
              <DonutChart
                slices={catSlices}
                size={96}
                strokeW={18}
              />
              {/* Clean Legend without duplicate Lainnya and with breathable spacing */}
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 7, minWidth: 0 }}>
                {catSlices.map((s, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: s.color, flexShrink: 0 }} />
                    <span style={{ flex: 1, fontSize: 11.5, color: '#475569', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontWeight: 500 }}>{s.name}</span>
                    <span style={{ fontSize: 11.5, fontWeight: 700, color: '#0F172A', flexShrink: 0 }}>{s.pct}%</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* METRIC 2: SETORAN MASUK */}
        <div style={{ background: '#fff', borderRadius: 20, padding: '20px 22px', border: '1px solid #E2E8F0', boxShadow: '0 1px 4px rgba(0,0,0,0.04)', display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 28, height: 28, borderRadius: 8, background: '#D1FAE5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <TrendingUp size={15} color="#059669" />
            </div>
            <span style={{ fontSize: 12, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Setoran Masuk</span>
          </div>

          <div>
            <div style={{ fontSize: 'clamp(22px, 3.5vw, 30px)', fontWeight: 800, color: '#059669', letterSpacing: '-0.02em', lineHeight: 1.1, marginBottom: 4 }}>
              {formatRupiah(summary.totalCashIn)}
            </div>
            {incomeGrowth !== null && (
              <div style={{ fontSize: 12, color: '#64748B' }}>
                <GrowthBadge pct={incomeGrowth} /> dari bulan lalu
              </div>
            )}
          </div>

          {/* Member contribution bars */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 4 }}>
            {/* Asykar */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5 }}>
                <div style={{ width: 30, height: 30, borderRadius: '50%', background: '#4F46E5', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 12, flexShrink: 0 }}>A</div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 3 }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: '#0F172A' }}>Asykar <span style={{ color: '#94A3B8', fontWeight: 400, fontSize: 11 }}>Suami</span></span>
                    <span style={{ fontSize: 12, fontWeight: 700, color: '#4F46E5' }}>{asykarPct}%</span>
                  </div>
                  <div style={{ height: 6, background: '#F1F5F9', borderRadius: 9999, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${asykarPct}%`, background: '#4F46E5', borderRadius: 9999, transition: 'width 0.4s' }} />
                  </div>
                  <div style={{ fontSize: 11, color: '#64748B', marginTop: 3 }}>{formatRupiah(asykarAmount)}</div>
                </div>
              </div>
            </div>
            {/* Riska */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5 }}>
                <div style={{ width: 30, height: 30, borderRadius: '50%', background: '#BE185D', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 12, flexShrink: 0 }}>R</div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 3 }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: '#0F172A' }}>Riska <span style={{ color: '#94A3B8', fontWeight: 400, fontSize: 11 }}>Istri</span></span>
                    <span style={{ fontSize: 12, fontWeight: 700, color: '#BE185D' }}>{istriPct}%</span>
                  </div>
                  <div style={{ height: 6, background: '#F1F5F9', borderRadius: 9999, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${istriPct}%`, background: '#BE185D', borderRadius: 9999, transition: 'width 0.4s' }} />
                  </div>
                  <div style={{ fontSize: 11, color: '#64748B', marginTop: 3 }}>{formatRupiah(istriAmount)}</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* METRIC 3: ANGGARAN (gauge) */}
        <div style={{ background: '#fff', borderRadius: 20, padding: '20px 22px', border: '1px solid #E2E8F0', boxShadow: '0 1px 4px rgba(0,0,0,0.04)', display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Header without redundant month button */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 28, height: 28, borderRadius: 8, background: '#EDE9FE', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <BarChart2 size={15} color="#7C3AED" />
            </div>
            <span style={{ fontSize: 12, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Anggaran Bulan Ini</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
            <GaugeChart pct={budgetPct} size={130} />
            {/* Bullets */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#6366F1', flexShrink: 0 }} />
                <div>
                  <div style={{ fontSize: 10, color: '#94A3B8', fontWeight: 600 }}>Total Anggaran</div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#0F172A' }}>{totalBudget > 0 ? formatRupiah(totalBudget) : 'Belum diatur'}</div>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#F59E0B', flexShrink: 0 }} />
                <div>
                  <div style={{ fontSize: 10, color: '#94A3B8', fontWeight: 600 }}>Terpakai</div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#0F172A' }}>{formatRupiah(totalBudgetUsed)}</div>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#10B981', flexShrink: 0 }} />
                <div>
                  <div style={{ fontSize: 10, color: '#94A3B8', fontWeight: 600 }}>Sisa</div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#0F172A' }}>{formatRupiah(Math.max(0, totalBudget - totalBudgetUsed))}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── BOTTOM ROW: Recent Txns + Money Flow ─────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 20 }}>

        {/* Recent Transactions table */}
        <div style={{ background: '#fff', borderRadius: 20, padding: '20px 22px', border: '1px solid #E2E8F0', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: '#0F172A' }}>Transaksi Terbaru</span>
            <Link href="/transactions" style={{ fontSize: 12, color: '#6366F1', fontWeight: 600, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4 }}>
              Lihat Semua <ArrowRight size={12} />
            </Link>
          </div>

          {/* Table header */}
          <div style={{ display: 'grid', gridTemplateColumns: '70px 1fr 110px 110px', gap: 8, paddingBottom: 8, borderBottom: '1px solid #F1F5F9', marginBottom: 8 }}>
            {['TANGGAL', 'KETERANGAN', 'KATEGORI', 'JUMLAH'].map(h => (
              <span key={h} style={{ fontSize: 10, fontWeight: 700, color: '#94A3B8', letterSpacing: '0.06em' }}>{h}</span>
            ))}
          </div>

          {recentTxns.length === 0 ? (
            <div style={{ textAlign: 'center', color: '#94A3B8', fontSize: 12, padding: '24px 0' }}>Belum ada transaksi bulan ini</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {recentTxns.map(t => (
                <div key={t.id} style={{ display: 'grid', gridTemplateColumns: '70px 1fr 110px 110px', gap: 8, padding: '9px 0', borderBottom: '1px solid #F8FAFC', alignItems: 'center' }}>
                  <span style={{ fontSize: 12, color: '#64748B' }}>{fmtDate(t.date)}</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                    <div style={{
                      width: 30, height: 30, borderRadius: 8, flexShrink: 0,
                      background: t.type === 'masuk' ? '#D1FAE5' : '#FEE2E2',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14,
                    }}>{catIcon(t.category)}</div>
                    <span style={{ fontSize: 12, fontWeight: 600, color: '#0F172A', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {t.note || t.category}
                    </span>
                  </div>
                  <div>
                    <span style={{
                      fontSize: 11, fontWeight: 600, borderRadius: 9999, padding: '3px 8px',
                      background: t.type === 'masuk' ? '#D1FAE5' : '#F1F5F9',
                      color: t.type === 'masuk' ? '#059669' : '#475569',
                      display: 'inline-block', maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>
                      {t.category}
                    </span>
                  </div>
                  <span style={{ fontSize: 13, fontWeight: 700, color: t.type === 'masuk' ? '#059669' : '#DC2626', textAlign: 'right' }}>
                    {t.type === 'masuk' ? '+' : '-'}{formatRupiah(t.amount)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Money Flow chart */}
        <div style={{ background: '#fff', borderRadius: 20, padding: '20px 22px', border: '1px solid #E2E8F0', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: '#0F172A' }}>Arus Uang (Money Flow)</span>
            <button style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 8, padding: '4px 10px', fontSize: 11, color: '#475569', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
              6 bulan terakhir <ChevronDown size={12} />
            </button>
          </div>
          <BarFlowChart labels={flowData.labels} income={flowData.income} expense={flowData.expense} />
        </div>
      </div>

      {/* ── SETORAN MODAL ──────────────────────────────────────────── */}
      {showAddModal && <SetoranModal person={person} setPerson={setPerson} amountInput={amountInput} setAmountInput={setAmountInput} noteInput={noteInput} setNoteInput={setNoteInput} onClose={() => setShowAddModal(false)} onSubmit={handleSaveSetoran} />}

      {/* ── EXPENSE MODAL ─────────────────────────────────────────── */}
      {showExpenseModal && (
        <TransactionModal
          onClose={() => setShowExpenseModal(false)}
          onSave={handleSaveExpense}
        />
      )}
    </div>
  );
}

// ─── Setoran Modal (shared) ─────────────────────────────────────────────────
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
      <div style={{ background: '#fff', borderRadius: 20, padding: 24, width: '100%', maxWidth: 440, boxShadow: '0 20px 25px -5px rgba(0,0,0,0.15)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h3 style={{ fontSize: 18, fontWeight: 700, margin: 0, color: '#0F172A' }}>Tambah Setoran Kas Bersama</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748B', padding: 4 }}><X size={20} /></button>
        </div>
        <form onSubmit={onSubmit}>
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#475569', marginBottom: 8 }}>Disetor Oleh:</label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              {[{ id: 'asykar' as const, label: 'Asykar (Suami)', color: '#4F46E5', bg: '#EEF2FF' }, { id: 'istri' as const, label: 'Riska (Istri)', color: '#BE185D', bg: '#FDF2F8' }].map(opt => (
                <button key={opt.id} type="button" onClick={() => setPerson(opt.id)} style={{ padding: '10px 14px', borderRadius: 12, border: person === opt.id ? `2px solid ${opt.color}` : '1px solid #E2E8F0', background: person === opt.id ? opt.bg : '#fff', color: person === opt.id ? opt.color : '#475569', fontWeight: 700, cursor: 'pointer', fontSize: 13 }}>
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#475569', marginBottom: 6 }}>Nominal Setoran (Rp)</label>
            <input type="number" value={amountInput} onChange={e => setAmountInput(e.target.value)} placeholder="Contoh: 3000000" required autoFocus style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '1px solid #CBD5E1', fontSize: 15, boxSizing: 'border-box', outline: 'none' }} />
          </div>
          <div style={{ marginBottom: 20 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#475569', marginBottom: 6 }}>Keterangan (Opsional)</label>
            <input type="text" value={noteInput} onChange={e => setNoteInput(e.target.value)} placeholder={`Setoran ${person === 'asykar' ? 'Asykar' : 'Riska'}`} style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '1px solid #CBD5E1', fontSize: 14, boxSizing: 'border-box', outline: 'none' }} />
          </div>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <button type="button" onClick={onClose} style={{ padding: '9px 16px', borderRadius: 10, border: '1px solid #E2E8F0', background: '#fff', color: '#64748B', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>Batal</button>
            <button type="submit" style={{ padding: '9px 18px', borderRadius: 10, border: 'none', background: '#4F46E5', color: '#fff', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>Simpan Setoran</button>
          </div>
        </form>
      </div>
    </div>
  );
}
