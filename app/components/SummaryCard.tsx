'use client';
import { TrendingUp, TrendingDown, Minus, Wallet, TrendingUp as IncomeIcon, TrendingDown as ExpenseIcon, PiggyBank, Sparkles, PieChart } from 'lucide-react';
import { formatCurrency } from '@/lib/helpers';

type CardVariant = 'hero' | 'income' | 'expense' | 'savings' | 'default';

interface SummaryCardProps {
  label: string;
  value: number;
  prevValue?: number;
  isCurrency?: boolean;
  variant?: CardVariant;
  freeMoney?: number;
  remainingBudget?: number;
}

const VARIANT_ICONS: Record<CardVariant, React.ReactNode> = {
  hero:     <Wallet size={18} />,
  income:   <IncomeIcon size={18} />,
  expense:  <ExpenseIcon size={18} />,
  savings:  <PiggyBank size={18} />,
  default:  null,
};

export default function SummaryCard({
  label, value, prevValue, isCurrency = true, variant = 'default',
  freeMoney, remainingBudget
}: SummaryCardProps) {
  const hasChange = prevValue !== undefined;
  let pct = 0;
  if (hasChange && prevValue !== 0) pct = ((value - prevValue) / Math.abs(prevValue)) * 100;
  else if (hasChange && prevValue === 0 && value > 0) pct = 100;

  const isUp = pct >= 0;

  const displayPrimary = isCurrency
    ? new Intl.NumberFormat('id-ID').format(Math.floor(value))
    : value.toLocaleString('id-ID');

  const icon = VARIANT_ICONS[variant];

  const hasHeroBreakdown = freeMoney !== undefined && remainingBudget !== undefined;

  return (
    <div className={`summary-card${variant !== 'default' ? ` variant-${variant}` : ''}`}>
      {icon && <div className="summary-card-icon">{icon}</div>}
      <p className="summary-card-label">{label}</p>
      <div className="summary-card-value">
        {isCurrency && <span>Rp </span>}
        {displayPrimary}
      </div>

      {hasHeroBreakdown ? (
        <div className="summary-hero-breakdown">
          <div className="hero-breakdown-row">
            <span className="hero-breakdown-label">
              <Sparkles size={11} className="hero-breakdown-icon free" /> Free Money:
            </span>
            <span className={`hero-breakdown-val ${freeMoney! < 0 ? 'negative' : 'positive'}`}>
              {freeMoney! < 0 ? '-' : ''}{formatCurrency(Math.abs(freeMoney!), true)}
            </span>
          </div>
          <div className="hero-breakdown-row">
            <span className="hero-breakdown-label">
              <PieChart size={11} className="hero-breakdown-icon budget" /> Sisa Anggaran:
            </span>
            <span className="hero-breakdown-val">
              {formatCurrency(remainingBudget!, true)}
            </span>
          </div>
        </div>
      ) : (
        <>
          {hasChange && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
              <span className={`summary-badge ${isUp ? 'badge-up' : 'badge-down'}`}>
                {isUp ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
                {Math.abs(pct).toFixed(1)}%
              </span>
              <span className="text-sm text-muted" style={{ fontSize: 11 }}>vs bulan lalu</span>
            </div>
          )}
          {!hasChange && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
              <span className="summary-badge badge-neutral">
                <Minus size={11} />
                Total
              </span>
            </div>
          )}
        </>
      )}
    </div>
  );
}
