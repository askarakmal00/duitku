'use client';
import { useState, useEffect, useCallback } from 'react';
import { ChevronLeft, ChevronRight, X, ArrowUpRight, ArrowDownLeft, Calendar as CalendarIcon } from 'lucide-react';
import { getDailyExpenseMap, getTransactionsByDate, getMonthlyExpense } from '@/lib/store';
import { Transaction } from '@/lib/types';
import { formatCurrency, formatDate, getCurrentMonth } from '@/lib/helpers';

const DAY_HEADERS = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'];

/** Compact amount formatter for calendar cells (e.g. 45000 → "45rb", 1500000 → "1,5jt") */
function compactAmount(amount: number): string {
  if (amount >= 1_000_000) return (amount / 1_000_000).toFixed(1).replace('.0', '') + 'jt';
  if (amount >= 1_000) return Math.round(amount / 1_000) + 'rb';
  return String(amount);
}

/** Determine heatmap level based on amount */
function heatLevel(amount: number, maxAmount: number): 0 | 1 | 2 | 3 {
  if (amount <= 0) return 0;
  if (maxAmount <= 0) return 1;
  const ratio = amount / maxAmount;
  if (ratio < 0.25) return 1;
  if (ratio < 0.65) return 2;
  return 3;
}

/** Get day-of-week index for the 1st of month, adjusted so Monday=0 */
function getStartOffset(year: number, month: number): number {
  const day = new Date(year, month - 1, 1).getDay(); // 0=Sun, 1=Mon, ...
  return (day + 6) % 7; // shift so Mon=0
}

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

interface SpendingCalendarProps {
  onDateClick?: (dateStr: string, txns: Transaction[]) => void;
}

export default function SpendingCalendar({ onDateClick }: SpendingCalendarProps) {
  const now = getCurrentMonth();
  const [viewYear, setViewYear] = useState(now.year);
  const [viewMonth, setViewMonth] = useState(now.month);
  const [expenseMap, setExpenseMap] = useState<Record<string, number>>({});
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedTxns, setSelectedTxns] = useState<Transaction[]>([]);

  const loadData = useCallback(() => {
    setExpenseMap(getDailyExpenseMap(viewYear, viewMonth));
  }, [viewYear, viewMonth]);

  useEffect(() => {
    loadData();
    const handler = () => loadData();
    window.addEventListener('pf_data_changed', handler);
    return () => window.removeEventListener('pf_data_changed', handler);
  }, [loadData]);

  const maxExpense = Math.max(0, ...Object.values(expenseMap));
  const monthlyTotal = getMonthlyExpense(viewYear, viewMonth);
  const daysInMonth = getDaysInMonth(viewYear, viewMonth);
  const daysWithExpense = Object.values(expenseMap).filter(v => v > 0).length;
  const avgDaily = daysWithExpense > 0 ? monthlyTotal / daysWithExpense : 0;

  // Today's expense
  const todayStr = new Date().toISOString().slice(0, 10);
  const todayExpense = new Date().getFullYear() === viewYear && (new Date().getMonth() + 1) === viewMonth
    ? (expenseMap[todayStr] || 0)
    : null;

  const monthLabel = new Date(viewYear, viewMonth - 1, 1)
    .toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });

  const prevMonth = () => {
    if (viewMonth === 1) { setViewYear(y => y - 1); setViewMonth(12); }
    else setViewMonth(m => m - 1);
    setSelectedDate(null);
  };

  const nextMonth = () => {
    if (viewMonth === 12) { setViewYear(y => y + 1); setViewMonth(1); }
    else setViewMonth(m => m + 1);
    setSelectedDate(null);
  };

  const handleCellClick = (day: number) => {
    const dateStr = `${viewYear}-${String(viewMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    if (selectedDate === dateStr) {
      setSelectedDate(null);
      setSelectedTxns([]);
      return;
    }
    setSelectedDate(dateStr);
    const txns = getTransactionsByDate(dateStr);
    setSelectedTxns(txns);
    onDateClick?.(dateStr, txns);
  };

  const startOffset = getStartOffset(viewYear, viewMonth);
  const cells: (number | null)[] = [
    ...Array(startOffset).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  const todayDay = new Date().getDate();
  const isCurrentMonth = now.year === viewYear && now.month === viewMonth;

  return (
    <div className="calendar-page-wrap">
      {/* Unified Stat Card — Calendar (blue accent) */}
      <div className="page-stat-card" style={{
        background: 'linear-gradient(135deg, #EFF6FF 0%, #DBEAFE 100%)',
        border: '1px solid #BFDBFE',
        marginBottom: 16,
        position: 'relative',
      }}>
        <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 4, background: '#2563EB', borderRadius: '4px 0 0 4px' }} />
        <div className="psc-item">
          <div className="psc-header">
            <div className="psc-icon" style={{ background: 'rgba(37,99,235,0.12)', color: '#2563EB' }}>
              <CalendarIcon size={16} />
            </div>
            <span className="psc-label" style={{ color: '#1D4ED8' }}>
              {todayExpense !== null ? 'Hari ini keluar' : 'Total bulan ini'}
            </span>
          </div>
          <div className="psc-value" style={{ color: (todayExpense ?? monthlyTotal) > 0 ? 'var(--danger)' : 'var(--text-primary)' }}>
            {formatCurrency(todayExpense !== null ? todayExpense : monthlyTotal)}
          </div>
          <div className="psc-sub">{monthLabel}</div>
        </div>

        <div className="psc-divider" />

        <div className="psc-item">
          <div className="psc-header">
            <div className="psc-icon" style={{ background: 'rgba(37,99,235,0.12)', color: '#2563EB' }}>
              <ChevronRight size={16} />
            </div>
            <span className="psc-label" style={{ color: '#1D4ED8' }}>Rata-rata Harian</span>
          </div>
          <div className="psc-value" style={{ color: avgDaily > 0 ? 'var(--danger)' : 'var(--text-primary)' }}>
            {avgDaily > 0 ? formatCurrency(avgDaily) : 'Rp 0'}
          </div>
          <div className="psc-sub">{daysWithExpense} hari ada pengeluaran</div>
        </div>
      </div>

      {/* Main Grid: Calendar Left, Detail Right (Desktop) */}
      <div className="calendar-main-grid" style={{ width: '100%', maxWidth: '100%', minWidth: 0, boxSizing: 'border-box' }}>
        {/* Left Column: Calendar Card */}
        <div className="card calendar-card-mobile" style={{ padding: '20px', overflow: 'hidden', minWidth: 0, width: '100%', maxWidth: '100%', boxSizing: 'border-box' }}>
          {/* Month Navigation */}
          <div className="calendar-nav" style={{ marginBottom: 16 }}>
            <button className="calendar-nav-btn" onClick={prevMonth} aria-label="Bulan sebelumnya">
              <ChevronLeft size={18} />
            </button>
            <span className="calendar-nav-title">{monthLabel}</span>
            <button className="calendar-nav-btn" onClick={nextMonth} aria-label="Bulan berikutnya">
              <ChevronRight size={18} />
            </button>
          </div>

          {/* Heatmap Legend */}
          <div className="calendar-legend" style={{ marginBottom: 12 }}>
            <span style={{ fontSize: 11, color: 'var(--text-muted)', marginRight: 4 }}>Intensitas:</span>
            {[
              { cls: 'heat-0', bg: 'var(--bg-secondary)', label: 'Tidak ada' },
              { cls: 'heat-1', bg: '#F5F3FF', label: 'Kecil' },
              { cls: 'heat-2', bg: '#EDE9FE', label: 'Sedang' },
              { cls: 'heat-3', bg: '#7C3AED', label: 'Besar' },
            ].map(({ bg, label }) => (
              <div key={label} className="calendar-legend-item">
                <div className="calendar-legend-dot" style={{ background: bg, border: '1px solid var(--border)' }} />
                {label}
              </div>
            ))}
          </div>

          {/* Day Headers */}
          <div className="calendar-grid">
            {DAY_HEADERS.map(d => (
              <div key={d} className="calendar-day-header">{d}</div>
            ))}

            {/* Calendar Cells */}
            {cells.map((day, idx) => {
              if (day === null) {
                return <div key={`empty-${idx}`} className="calendar-cell empty" />;
              }
              const dateStr = `${viewYear}-${String(viewMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
              const amount = expenseMap[dateStr] || 0;
              const heat = heatLevel(amount, maxExpense);
              const isToday = isCurrentMonth && day === todayDay;
              const isSelected = selectedDate === dateStr;

              let cls = `calendar-cell heat-${heat}`;
              if (isToday) cls += ' today';
              if (isSelected) cls += ' selected';

              return (
                <div key={dateStr} className={cls} onClick={() => handleCellClick(day)}>
                  <span className="calendar-date-num">{day}</span>
                  {amount > 0 && (
                    <span className="calendar-cell-amount">{compactAmount(amount)}</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: Detail Panel (Desktop: side, Mobile: stacked) */}
        <div className="calendar-detail-col">
          {selectedDate ? (
            <div className="calendar-detail-panel">
              <div className="calendar-detail-header">
                <span className="calendar-detail-title">
                  {formatDate(selectedDate, 'long')}
                </span>
                <button
                  className="calendar-detail-close"
                  onClick={() => { setSelectedDate(null); setSelectedTxns([]); }}
                  aria-label="Tutup detail"
                >
                  <X size={14} />
                </button>
              </div>
              <div className="calendar-detail-body">
                {selectedTxns.length === 0 ? (
                  <div className="empty-state" style={{ padding: '32px 12px', gap: 8 }}>
                    <div className="empty-state-icon" style={{ width: 48, height: 48, fontSize: 22 }}>🎉</div>
                    <h3 style={{ fontSize: 14 }}>Tidak ada transaksi</h3>
                    <p style={{ fontSize: 12 }}>Hari yang hemat, bagus!</p>
                  </div>
                ) : (
                  <>
                    {/* Expense total for selected day */}
                    {(() => {
                      const dayExpense = selectedTxns.filter(t => t.type === 'keluar').reduce((s, t) => s + t.amount, 0);
                      const dayIncome = selectedTxns.filter(t => t.type === 'masuk').reduce((s, t) => s + t.amount, 0);
                      return (
                        <div style={{ display: 'flex', gap: 12, marginBottom: 8, paddingBottom: 8, borderBottom: '1px solid var(--divider)' }}>
                          {dayIncome > 0 && (
                            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--success)' }}>
                              +{formatCurrency(dayIncome)}
                            </span>
                          )}
                          {dayExpense > 0 && (
                            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--danger)' }}>
                              -{formatCurrency(dayExpense)}
                            </span>
                          )}
                        </div>
                      );
                    })()}
                    {selectedTxns.map(t => (
                      <div key={t.id} className="mobile-txn-item" style={{ minWidth: 0, width: '100%', maxWidth: '100%', boxSizing: 'border-box', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexShrink: 0 }}>
                        <div className="mobile-txn-left" style={{ minWidth: 0, flex: 1, overflow: 'hidden', display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div className={`mobile-txn-icon ${t.type}`} style={{ flexShrink: 0 }}>
                            {t.type === 'masuk' ? <ArrowDownLeft size={16} /> : <ArrowUpRight size={16} />}
                          </div>
                          <div className="mobile-txn-info" style={{ minWidth: 0, flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                            <span className="mobile-txn-title" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', display: 'block', maxWidth: '100%', fontSize: 13, fontWeight: 600 }}>
                              {t.note || t.category}
                            </span>
                            <span className="mobile-txn-meta" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', display: 'block', maxWidth: '100%', fontSize: 11, color: 'var(--text-muted)' }}>
                              {t.category}{t.subCategory ? ` · ${t.subCategory}` : ''}
                            </span>
                          </div>
                        </div>
                        <div className="mobile-txn-right" style={{ flexShrink: 0, minWidth: 0, display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                          <span className={`mobile-txn-amount ${t.type === 'masuk' ? 'amount-positive' : 'amount-negative'}`} style={{ fontSize: 12, fontWeight: 700, whiteSpace: 'nowrap' }}>
                            {t.type === 'masuk' ? '+' : '-'}{formatCurrency(t.amount)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </>
                )}
              </div>
            </div>
          ) : (
            <div className="calendar-detail-placeholder desktop-only-card">
              <div className="empty-state" style={{ padding: '40px 20px', gap: 12 }}>
                <div className="empty-state-icon" style={{ width: 56, height: 56, fontSize: 26 }}>
                  📅
                </div>
                <h3 style={{ fontSize: 15 }}>Rincian Transaksi Harian</h3>
                <p style={{ fontSize: 13, lineHeight: 1.5 }}>
                  Klik salah satu tanggal pada kalender di sebelah kiri untuk melihat rincian transaksi pengeluaran & pemasukan hari tersebut.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
