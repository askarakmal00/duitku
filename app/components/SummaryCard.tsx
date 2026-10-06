'use client';
import {
  TrendingUp, TrendingDown, Wallet, TrendingUp as IncomeIcon, TrendingDown as ExpenseIcon,
  PiggyBank, Sparkles, PieChart, Info
} from 'lucide-react';
import { formatRupiah } from '@/lib/helpers';

type CardVariant = 'hero' | 'income' | 'expense' | 'savings' | 'default';

interface SummaryCardProps {
  label: string;
  value: number;
  prevValue?: number;
  growthPct?: number | null;
  comparisonLabel?: string;
  badgeLabel?: string;
  subtitle?: string;
  isCurrency?: boolean;
  variant?: CardVariant;
  freeMoney?: number;
  remainingBudget?: number | null;
  initialBalance?: number;
  netSurplus?: number;
}

const VARIANT_ICONS: Record<CardVariant, React.ReactNode> = {
  hero:     <Wallet size={18} />,
  income:   <IncomeIcon size={18} />,
  expense:  <ExpenseIcon size={18} />,
  savings:  <PiggyBank size={18} />,
  default:  null,
};

export default function SummaryCard({
  label, value, prevValue, growthPct, comparisonLabel, badgeLabel, subtitle,
  isCurrency = true, variant = 'default',
  freeMoney, remainingBudget, initialBalance, netSurplus
}: SummaryCardProps) {
  // Hitung persentase jika tidak dioper secara eksplisit
  let computedPct: number | null = growthPct !== undefined ? growthPct : null;
  if (computedPct === null && growthPct === undefined && prevValue !== undefined) {
    if (prevValue !== 0) {
      computedPct = ((value - prevValue) / Math.abs(prevValue)) * 100;
    } else {
      computedPct = null; // data bulan lalu 0 -> jangan persentase palsu
    }
  }

  // Makna warna:
  // - Pemasukan naik = Hijau (bagus), turun = Merah
  // - Pengeluaran turun = Hijau (bagus), naik = Merah (waspada)
  const isExpense = variant === 'expense';
  const isGood = computedPct !== null
    ? (isExpense ? computedPct <= 0 : computedPct >= 0)
    : true;

  const displayPrimary = isCurrency
    ? formatRupiah(value)
    : value.toLocaleString('id-ID');

  const icon = VARIANT_ICONS[variant];
  const hasHeroBreakdown = freeMoney !== undefined || remainingBudget !== undefined;
  const isNegative = value < 0;

  return (
    <div className={`summary-card${variant !== 'default' ? ` variant-${variant}` : ''}${isNegative ? ' is-negative-card' : ''}`}>
      {icon && <div className="summary-card-icon">{icon}</div>}
      <p className="summary-card-label">{label}</p>
      
      <div className={`summary-card-value ${isNegative ? 'text-negative-bold' : ''}`}>
        {displayPrimary}
      </div>

      {subtitle && (
        <div className="text-xs text-muted" style={{ fontSize: 11, marginTop: -2, marginBottom: 4 }}>
          {subtitle}
        </div>
      )}

      {hasHeroBreakdown ? (
        <div className="summary-hero-breakdown">
          {initialBalance !== undefined && initialBalance !== 0 && (
            <div className="hero-breakdown-row">
              <span className="hero-breakdown-label">
                Saldo Awal Periode:
              </span>
              <span className={`hero-breakdown-val ${initialBalance < 0 ? 'negative' : 'positive'}`}>
                {formatRupiah(initialBalance)}
              </span>
            </div>
          )}

          {netSurplus !== undefined && (
            <div className="hero-breakdown-row">
              <span className="hero-breakdown-label">
                Arus Kas Bulan Ini:
              </span>
              <span className={`hero-breakdown-val ${netSurplus < 0 ? 'negative' : 'positive'}`}>
                {netSurplus >= 0 ? '+' : ''}{formatRupiah(netSurplus)}
              </span>
            </div>
          )}

          {freeMoney !== undefined && (
            <div className="hero-breakdown-row">
              <span
                className="hero-breakdown-label"
                title="Free Money: Saldo kas dikurangi sisa alokasi anggaran bulan ini. Uang yang benar-benar bebas digunakan."
                style={{ cursor: 'help' }}
              >
                <Sparkles size={11} className="hero-breakdown-icon free" /> Free Money:
                <Info size={10} style={{ opacity: 0.75, marginLeft: 2 }} />
              </span>
              <span className={`hero-breakdown-val ${freeMoney < 0 ? 'negative' : 'positive'}`}>
                {formatRupiah(freeMoney)}
              </span>
            </div>
          )}

          <div className="hero-breakdown-row">
            <span className="hero-breakdown-label">
              <PieChart size={11} className="hero-breakdown-icon budget" /> Sisa Anggaran:
            </span>
            <span className="hero-breakdown-val">
              {remainingBudget === null || remainingBudget === undefined
                ? 'Belum diatur'
                : formatRupiah(remainingBudget)}
            </span>
          </div>
        </div>
      ) : (
        <>
          {computedPct !== null ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
              <span className={`summary-badge ${isGood ? 'badge-up' : 'badge-down'}`}>
                {computedPct >= 0 ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
                {Math.abs(computedPct).toFixed(1)}%
              </span>
              <span className="text-sm text-muted" style={{ fontSize: 11 }}>
                {comparisonLabel || 'vs bulan lalu'}
              </span>
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
              {badgeLabel ? (
                <span className="text-xs text-muted" style={{ fontSize: 11 }}>
                  {badgeLabel}
                </span>
              ) : (
                <>
                  <span className="summary-badge badge-neutral" style={{ padding: '2px 8px' }}>
                    -
                  </span>
                  <span className="text-sm text-muted" style={{ fontSize: 11 }}>
                    {comparisonLabel || 'vs bulan lalu'}
                  </span>
                </>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
