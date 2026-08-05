'use client';
import { useEffect, useRef } from 'react';
import { Chart, registerables } from 'chart.js';
import { formatCurrency, CHART_COLORS } from '@/lib/helpers';

Chart.register(...registerables);

interface BudgetDonutProps {
  items: { name: string; used: number; allocated: number }[];
}

export default function BudgetDonut({ items }: BudgetDonutProps) {
  const chartRef = useRef<HTMLCanvasElement>(null);
  const chartInstanceRef = useRef<Chart | null>(null);

  const totalUsed = items.reduce((s, i) => s + i.used, 0);
  const totalAlloc = items.reduce((s, i) => s + i.allocated, 0);

  useEffect(() => {
    if (!chartRef.current || items.length === 0) return;
    if (chartInstanceRef.current) chartInstanceRef.current.destroy();

    const ctx = chartRef.current.getContext('2d');
    if (!ctx) return;

    const data = items.map(i => i.used || 0.001);
    const colors = items.map((_, i) => CHART_COLORS[i % CHART_COLORS.length]);

    chartInstanceRef.current = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: items.map(i => i.name),
        datasets: [{
          data,
          backgroundColor: colors,
          borderWidth: 3,
          borderColor: 'transparent',
          hoverBorderColor: 'white',
          hoverOffset: 6,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '72%',
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: '#1E1B4B',
            titleFont: { family: 'Inter', size: 12, weight: 600 as const },
            bodyFont: { family: 'Inter', size: 12 },
            padding: 10,
            cornerRadius: 10,
            callbacks: {
              label: (ctx) => ` ${formatCurrency(ctx.parsed as number)}`,
            },
          },
        },
      },
    });

    return () => { chartInstanceRef.current?.destroy(); };
  }, [items]);

  if (items.length === 0) {
    return (
      <div className="empty-state">
        <div className="empty-state-icon">
          💰
        </div>
        <h3>Belum ada pos anggaran</h3>
        <p>Tambahkan pos anggaran untuk mulai memantau pengeluaranmu 🎯</p>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* Donut chart centered */}
      <div style={{ display: 'flex', justifyContent: 'center' }}>
        <div className="donut-wrap" style={{ width: 160, height: 160 }}>
          <canvas ref={chartRef} />
          <div className="donut-center">
            <div className="donut-center-value" style={{ fontSize: 14 }}>
              {formatCurrency(totalUsed, true)}
            </div>
            <div className="donut-center-label">Terpakai</div>
          </div>
        </div>
      </div>

      {/* Legend list — clean grid layout */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
        {items.map((item, i) => {
          const pct = item.allocated > 0 ? Math.min((item.used / item.allocated) * 100, 100) : 0;
          const isOver = item.allocated > 0 && item.used > item.allocated;
          const barColor = isOver ? 'var(--danger)' : CHART_COLORS[i % CHART_COLORS.length];

          return (
            <div key={i} style={{
              padding: '8px 0',
              borderBottom: i < items.length - 1 ? '1px solid var(--divider)' : 'none',
            }}>
              {/* Name row */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5 }}>
                <div style={{
                  width: 10, height: 10, borderRadius: '50%',
                  background: CHART_COLORS[i % CHART_COLORS.length],
                  flexShrink: 0,
                }} />
                <span style={{
                  fontSize: 13, fontWeight: 600, color: 'var(--text-primary)',
                  flex: 1, minWidth: 0,
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>
                  {item.name}
                </span>
                <span style={{ fontSize: 12, fontWeight: 700, color: barColor, flexShrink: 0 }}>
                  {pct.toFixed(0)}%
                </span>
              </div>

              {/* Progress bar */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 10, flexShrink: 0 }} /> {/* dot spacer */}
                <div className="progress-bar" style={{ flex: 1, height: 5 }}>
                  <div className="progress-fill" style={{ width: `${pct}%`, background: barColor, transition: 'width 0.5s ease' }} />
                </div>
              </div>

              {/* Amount row */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
                <div style={{ width: 10, flexShrink: 0 }} /> {/* dot spacer */}
                <span style={{ fontSize: 11, color: 'var(--text-muted)', flex: 1 }}>
                  Terpakai: <strong style={{ color: barColor }}>{formatCurrency(item.used, true)}</strong>
                </span>
                <span style={{ fontSize: 11, color: 'var(--text-muted)', flexShrink: 0 }}>
                  / {formatCurrency(item.allocated, true)}
                </span>
              </div>
            </div>
          );
        })}

        {/* Total row */}
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '10px 0 0',
          marginTop: 4,
          borderTop: '1.5px solid var(--border)',
        }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)' }}>
            Total terpakai
          </span>
          <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--primary)' }}>
            {formatCurrency(totalUsed, true)}
            <span style={{ color: 'var(--text-muted)', fontWeight: 500 }}>
              {' '}/ {formatCurrency(totalAlloc, true)}
            </span>
          </span>
        </div>
      </div>
    </div>
  );
}
