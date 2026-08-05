'use client';
import Header from '@/components/Header';
import SpendingCalendar from '@/components/SpendingCalendar';

export default function CalendarPage() {
  return (
    <>
      <Header
        title="Kalender Pengeluaran"
        subtitle="Lihat pola pengeluaran harian Anda dalam satu pandangan"
      />
      <div className="page-container">
        <SpendingCalendar />
      </div>
    </>
  );
}
