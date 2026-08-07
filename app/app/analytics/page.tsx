'use client';
import { useEffect, useRef, useState } from 'react';
import { Chart, registerables } from 'chart.js';
import Header from '@/components/Header';
import { getMonthlyFlowData, getTransactions } from '@/lib/store';
import { formatCurrency, CHART_COLORS } from '@/lib/helpers';
import { Transaction } from '@/lib/types';
import { TrendingUp, TrendingDown, BarChart2, Percent } from 'lucide-react';

Chart.register(...registerables);

function BarChart({ months }: { months: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const inst = useRef<Chart | null>(null);

  useEffect(() => {
    if (!ref.current) return;
    inst.current?.destroy();
    const data = getMonthlyFlowData(months);
    const ctx = ref.current.getContext('2d');
    if (!ctx) return;

    inst.current = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: data.labels,
        datasets: [
          {
            label: 'Pemasukan',
            data: data.income,
            backgroundColor: '#7C3AED',
            borderRadius: 8,
            borderSkipped: false,
            barPercentage: 0.6,
            categoryPercentage: 0.7,
          },
          {
            label: 'Pengeluaran',
            data: data.expense,
            backgroundColor: '#C4B5FD',
            borderRadius: 8,
            borderSkipped: false,
            barPercentage: 0.6,
            categoryPercentage: 0.7,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: {
            position: 'top',
            align: 'end',
            labels: { usePointStyle: true, pointStyle: 'circle', font: { family: 'Inter', size: 12 }, color: '#6B7280', padding: 12 },
          },
          tooltip: {
            backgroundColor: '#1E1B4B',
            titleFont: { family: 'Inter', size: 13, weight: 600 },
            bodyFont: { family: 'Inter', size: 12 },
            padding: 12,
            cornerRadius: 10,
            callbacks: { label: (ctx) => ` ${ctx.dataset.label}: Rp ${(ctx.parsed.y as number).toLocaleString('id-ID')}` },
          },
        },
        scales: {
          x: { grid: { display: false }, border: { display: false }, ticks: { font: { family: 'Inter', size: 11 }, color: '#9CA3AF', maxRotation: 0 } },
          y: {
            border: { display: false },
            grid: { color: 'rgba(124,58,237,0.06)' },
            ticks: { font: { family: 'Inter', size: 11 }, color: '#9CA3AF', callback: (val) => 'Rp ' + (Number(val) / 1_000_000 >= 1 ? (Number(val) / 1_000_000).toFixed(0) + 'jt' : (Number(val) / 1000).toFixed(0) + 'rb') },
          },
        },
      },
    });
    return () => { inst.current?.destroy(); };
  }, [months]);

  // Use chart-responsive-wrap for consistent responsive behavior
  return <div className="chart-responsive-wrap"><canvas ref={ref} /></div>;
}

function PieChart({ data }: { data: { label: string; value: number }[] }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const inst = useRef<Chart | null>(null);

  useEffect(() => {
    if (!ref.current || data.length === 0) return;
    inst.current?.destroy();
    const ctx = ref.current.getContext('2d');
    if (!ctx) return;

    inst.current = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: data.map(d => d.label),
        datasets: [{
          data: data.map(d => d.value),
          backgroundColor: data.map((_, i) => CHART_COLORS[i % CHART_COLORS.length]),
          borderWidth: 3,
          borderColor: 'transparent',
          hoverOffset: 8,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '68%',
        plugins: {
          legend: {
            position: 'bottom',
            labels: { usePointStyle: true, pointStyle: 'circle', font: { family: 'Inter', size: 12 }, color: '#6B7280', padding: 12 },
          },
          tooltip: {
            backgroundColor: '#1E1B4B',
            titleFont: { family: 'Inter', size: 13, weight: 600 as const },
            bodyFont: { family: 'Inter', size: 12 },
            padding: 12,
            cornerRadius: 10,
            callbacks: { label: (ctx) => ` ${formatCurrency(ctx.parsed as number)}` },
          },
        },
      },
    });
    return () => { inst.current?.destroy(); };
  }, [data]);

  return <div className="chart-responsive-wrap"><canvas ref={ref} /></div>;
}

export default function AnalyticsPage() {
  const [period, setPeriod] = useState<6 | 12>(12);
  const [transactions, setTransactions] = useState<Transaction[]>([]);

  useEffect(() => { setTransactions(getTransactions()); }, []);

  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;

  // Category breakdown for current month
  const monthExpenses = transactions.filter(t => {
    if (t.type !== 'keluar') return false;
    const d = new Date(t.date);
    return d.getFullYear() === year && d.getMonth() + 1 === month;
  });

  const catMap: Record<string, number> = {};
  monthExpenses.forEach(t => {
    const key = t.subCategory || t.category;
    catMap[key] = (catMap[key] || 0) + t.amount;
  });

  const catData = Object.entries(catMap)
    .sort(([, a], [, b]) => b - a)
    .map(([label, value]) => ({ label, value }));

  // Monthly stats
  const flowData = getMonthlyFlowData(period);
  const totalIncome = flowData.income.reduce((s, v) => s + v, 0);
  const totalExpense = flowData.expense.reduce((s, v) => s + v, 0);
  const avgIncome = totalIncome / period;
  const avgExpense = totalExpense / period;
  const savingRate = totalIncome > 0 ? ((totalIncome - totalExpense) / totalIncome) * 100 : 0;

  const stats = [
    { label: 'Total Pemasukan', value: formatCurrency(totalIncome), icon: <TrendingUp size={16} />, color: '#0F766E' },
    { label: 'Total Pengeluaran', value: formatCurrency(totalExpense), icon: <TrendingDown size={16} />, color: '#0F766E' },
    { label: 'Rata-rata / Bulan', value: formatCurrency(avgIncome), icon: <BarChart2 size={16} />, color: '#0F766E' },
    { label: `Saving Rate ${period}bln`, value: `${savingRate.toFixed(1)}%`, icon: <Percent size={16} />, color: savingRate >= 20 ? 'var(--success)' : 'var(--warning)' },
  ];

  return (
    <>
      <Header title="Analitik" subtitle="Tren keuangan jangka panjang" />

      <div className="page-container">
        {/* Unified Analytics Stat Card — 2x2 grid */}
        <div className="page-stat-card analytics-grid" style={{ marginBottom: 24, padding: 0, border: '1px solid #99F6E4', borderRadius: 'var(--radius)', boxShadow: 'var(--shadow)', overflow: 'hidden' }}>
          {stats.map((item, i) => (
            <div key={i} className="psc-grid-item">
              <div className="psc-header">
                <div className="psc-icon" style={{ background: 'rgba(13,148,136,0.12)', color: '#0D9488' }}>
                  {item.icon}
                </div>
                <span className="psc-label" style={{ color: '#0F766E' }}>{item.label}</span>
              </div>
              <div className="psc-value" style={{ color: item.color, fontSize: 16 }}>{item.value}</div>
            </div>
          ))}
        </div>

        <div className="analytics-grid">
          {/* Main Chart */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20, minWidth: 0 }}>
            <div className="card" style={{ overflow: 'hidden' }}>
              <div className="card-header">
                <span className="card-title">Arus Uang (Money Flow)</span>
                <div style={{ display: 'flex', gap: 8 }}>
                  {([6, 12] as const).map(p => (
                    <button
                      key={p}
                      className={`filter-chip ${period === p ? 'active' : ''}`}
                      style={{ padding: '5px 14px' }}
                      onClick={() => setPeriod(p)}
                    >
                      {p} bulan
                    </button>
                  ))}
                </div>
              </div>
              <BarChart months={period} />
            </div>

            {/* Monthly Table */}
            <div className="card">
              <div className="card-header">
                <span className="card-title">Tabel Bulanan</span>
              </div>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Bulan</th>
                      <th style={{ textAlign: 'right' }}>Pemasukan</th>
                      <th style={{ textAlign: 'right' }}>Pengeluaran</th>
                      <th style={{ textAlign: 'right' }}>Selisih</th>
                    </tr>
                  </thead>
                  <tbody>
                    {flowData.labels.map((label, i) => {
                      const diff = flowData.income[i] - flowData.expense[i];
                      return (
                        <tr key={i}>
                          <td style={{ fontWeight: 500 }}>{label}</td>
                          <td style={{ textAlign: 'right' }} className="amount-positive">
                            {flowData.income[i] > 0 ? formatCurrency(flowData.income[i]) : '-'}
                          </td>
                          <td style={{ textAlign: 'right' }} className="amount-negative">
                            {flowData.expense[i] > 0 ? formatCurrency(flowData.expense[i]) : '-'}
                          </td>
                          <td style={{ textAlign: 'right', fontWeight: 600, color: diff >= 0 ? 'var(--success)' : 'var(--danger)' }}>
                            {diff !== 0 ? (diff >= 0 ? '+' : '') + formatCurrency(diff) : '-'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Right: Category Breakdown */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20, minWidth: 0 }}>
            <div className="card" style={{ overflow: 'hidden' }}>
              <div className="card-header">
                <span className="card-title">Pengeluaran per Kategori</span>
                <span className="text-xs text-muted">Bulan ini</span>
              </div>
              {catData.length > 0 ? (
                <>
                  <PieChart data={catData} />
                  <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {catData.slice(0, 6).map((d, i) => (
                      <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0, flex: 1, overflow: 'hidden' }}>
                          <div style={{ width: 10, height: 10, borderRadius: '50%', background: CHART_COLORS[i % CHART_COLORS.length], flexShrink: 0 }} />
                          <span className="text-sm" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.label}</span>
                        </div>
                        <span className="font-600 text-sm" style={{ flexShrink: 0, marginLeft: 8 }}>{formatCurrency(d.value, true)}</span>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div className="empty-state">
                  <span style={{ fontSize: 32 }}>📊</span>
                  <h3>Belum ada data</h3>
                  <p>Tambahkan transaksi keluar untuk melihat breakdown</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
