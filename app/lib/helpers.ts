export function formatCurrency(amount: number, compact = false): string {
  if (compact && Math.abs(amount) >= 1_000_000) {
    return 'Rp ' + (amount / 1_000_000).toFixed(1) + 'jt';
  }
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatDate(dateStr: string, style: 'short' | 'medium' | 'long' = 'medium'): string {
  const d = new Date(dateStr);
  if (style === 'short') return d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short' });
  if (style === 'long') return d.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  return d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function toInputDate(dateStr?: string): string {
  const d = dateStr ? new Date(dateStr) : new Date();
  return d.toISOString().split('T')[0];
}

export function getPercentChange(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0;
  return ((current - previous) / previous) * 100;
}

export function getCurrentMonth(): { year: number; month: number } {
  const d = new Date();
  return { year: d.getFullYear(), month: d.getMonth() + 1 };
}

export function getPreviousMonth(): { year: number; month: number } {
  const d = new Date();
  d.setMonth(d.getMonth() - 1);
  return { year: d.getFullYear(), month: d.getMonth() + 1 };
}

export function getProgressColor(percent: number): string {
  if (percent >= 100) return '#EF4444';
  if (percent >= 80) return '#F59E0B';
  return '#7C3AED';
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export function getMonthName(year: number, month: number): string {
  return new Date(year, month - 1, 1).toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
}

export const CHART_COLORS = [
  '#7C3AED', '#8B5CF6', '#A78BFA', '#C4B5FD',
  '#10B981', '#34D399', '#6EE7B7',
  '#F59E0B', '#FBBF24', '#FCD34D',
  '#EF4444', '#F87171',
];
