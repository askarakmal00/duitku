import type { Metadata, Viewport } from 'next';
import { Suspense } from 'react';
import './globals.css';
import SupabaseProvider from '@/components/SupabaseProvider';
import TopProgressBar from '@/components/TopProgressBar';

export const metadata: Metadata = {
  title: 'FinKu – Manajemen Keuangan Keluarga',
  description: 'Kelola keuangan keluarga Anda dengan mudah: transaksi, anggaran, hutang, tabungan, dan analitik.',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id">
      <body>
        <Suspense fallback={null}>
          <TopProgressBar />
        </Suspense>
        <SupabaseProvider>
          {children}
        </SupabaseProvider>
      </body>
    </html>
  );
}
