'use client';
import { useEffect, useRef } from 'react';
import { Chart, registerables } from 'chart.js';
import { getMonthlyFlowData } from '@/lib/store';

Chart.register(...registerables);

interface MoneyFlowChartProps {
  months?: number;
}

export default function MoneyFlowChart({ months = 7 }: MoneyFlowChartProps) {
  const chartRef = useRef<HTMLCanvasElement>(null);
  const chartInstanceRef = useRef<Chart | null>(null);

  useEffect(() => {
    if (!chartRef.current) return;
    const data = getMonthlyFlowData(months);

    if (chartInstanceRef.current) chartInstanceRef.current.destroy();

    const ctx = chartRef.current.getContext('2d');
    if (!ctx) return;

    chartInstanceRef.current = new Chart(ctx, {
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
            align: typeof window !== 'undefined' && window.innerWidth < 640 ? 'center' : 'end',
            labels: {
              usePointStyle: true,
              pointStyle: 'circle',
              boxWidth: 8,
              boxHeight: 8,
              font: { family: 'Inter', size: 11, weight: 500 as const },
              color: '#6B7280',
              padding: 8,
            },
          },
          tooltip: {
            backgroundColor: '#1E1B4B',
            titleFont: { family: 'Inter', size: 13, weight: 600 as const },
            bodyFont: { family: 'Inter', size: 12 },
            padding: 12,
            cornerRadius: 10,
            callbacks: {
              label: (ctx) => ` ${ctx.dataset.label}: Rp ${(ctx.parsed.y as number).toLocaleString('id-ID')}`,
            },
          },
        },
        scales: {
          x: {
            grid: { display: false },
            border: { display: false },
            ticks: { font: { family: 'Inter', size: 12 }, color: '#9CA3AF' },
          },
          y: {
            border: { display: false },
            grid: { color: 'rgba(124,58,237,0.06)' },
            ticks: {
              font: { family: 'Inter', size: 11 },
              color: '#9CA3AF',
              callback: (val) => 'Rp ' + (Number(val) / 1_000_000 >= 1
                ? (Number(val) / 1_000_000).toFixed(0) + 'jt'
                : (Number(val) / 1000).toFixed(0) + 'rb'),
            },
          },
        },
      },
    });

    return () => { chartInstanceRef.current?.destroy(); };
  }, [months]);

  return (
    <div className="chart-responsive-wrap">
      <canvas ref={chartRef} />
    </div>
  );
}
