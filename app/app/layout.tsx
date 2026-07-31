import type { Metadata, Viewport } from 'next';
import './globals.css';
import SupabaseProvider from '@/components/SupabaseProvider';

export const metadata: Metadata = {
  title: 'FinKu – Manajemen Keuangan Pribadi',
  description: 'Kelola keuangan pribadi Anda dengan mudah: transaksi, anggaran, hutang, tabungan, dan analitik.',
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
        <SupabaseProvider>
          {children}
        </SupabaseProvider>
      </body>
    </html>
  );
}
