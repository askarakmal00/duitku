import type { Metadata } from 'next';
import './globals.css';
import Sidebar from '@/components/Sidebar';
import SupabaseProvider from '@/components/SupabaseProvider';

export const metadata: Metadata = {
  title: 'FinKu – Manajemen Keuangan Pribadi',
  description: 'Kelola keuangan pribadi Anda dengan mudah: transaksi, anggaran, hutang, tabungan, dan analitik.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id">
      <body>
        <SupabaseProvider>
          <div className="app-layout">
            <Sidebar />
            <main className="main-content">
              {children}
            </main>
          </div>
        </SupabaseProvider>
      </body>
    </html>
  );
}
