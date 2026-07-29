'use client';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { formatCurrency } from '@/lib/helpers';

interface SummaryCardProps {
  label: string;
  value: number;
  prevValue?: number;
  prefix?: string;
  isCurrency?: boolean;
  color?: 'default' | 'success' | 'danger' | 'primary';
}

export default function SummaryCard({
  label, value, prevValue, isCurrency = true, color = 'default'
}: SummaryCardProps) {
  const hasChange = prevValue !== undefined;
  let pct = 0;
  if (hasChange && prevValue !== 0) pct = ((value - prevValue) / Math.abs(prevValue)) * 100;
  else if (hasChange && prevValue === 0 && value > 0) pct = 100;

  const isUp = pct >= 0;
  const absLabel = isCurrency ? formatCurrency(value) : value.toLocaleString('id-ID');

  const displayPrimary = isCurrency
    ? new Intl.NumberFormat('id-ID').format(Math.floor(value))
    : value.toLocaleString('id-ID');

  return (
    <div className="summary-card">
      <p className="summary-card-label">{label}</p>
      <div className="summary-card-value">
        {isCurrency && <span style={{ fontSize: 14, opacity: 0.6 }}>Rp </span>}
        {displayPrimary}
      </div>
      {hasChange && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
          <span className={`summary-badge ${isUp ? 'badge-up' : 'badge-down'}`}>
            {isUp ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
            {Math.abs(pct).toFixed(1)}%
          </span>
          <span className="text-sm text-muted">vs bulan lalu</span>
        </div>
      )}
      {!hasChange && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
          <span className="summary-badge badge-neutral">
            <Minus size={12} />
            Total
          </span>
        </div>
      )}
    </div>
  );
}
