'use client';
import React, { createContext, useContext, useEffect, useState } from 'react';
import { syncWithSupabase } from '@/lib/store';
import { Database, AlertTriangle, RefreshCw, ServerOff } from 'lucide-react';
import Sidebar from '@/components/Sidebar';
import { SpaceProvider, useSpace } from '@/lib/useSpace';
import SpaceSelectModal from '@/components/SpaceSelectModal';
import AiChatDrawer from '@/components/AiChatDrawer';

interface AppContextType {
  isSynced: boolean;
  syncData: () => Promise<void>;
}

export interface MobileMenuContextType {
  openSidebar: () => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);
export const MobileMenuContext = createContext<MobileMenuContextType>({ openSidebar: () => {} });

function MainLayoutContent({ children }: { children: React.ReactNode }) {
  const { isUnlocked, setSpace } = useSpace();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Close sidebar with Escape key
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSidebarOpen(false);
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, []);

  // Prevent body scroll when sidebar is open on mobile
  useEffect(() => {
    if (sidebarOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [sidebarOpen]);

  if (!isUnlocked) {
    return (
      <SpaceSelectModal
        isOpen={true}
        onSelectSpace={(space) => setSpace(space)}
      />
    );
  }

  return (
    <MobileMenuContext.Provider value={{ openSidebar: () => setSidebarOpen(true) }}>
      <div className="app-layout">
        <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        <main className="main-content">
          {children}
        </main>
        <AiChatDrawer />
      </div>
    </MobileMenuContext.Provider>
  );
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [isLoading, setIsLoading] = useState(true);
  const [errorType, setErrorType] = useState<'schema_missing' | 'connection_failed' | null>(null);
  const [errorMessage, setErrorMessage] = useState('');

  const sync = async () => {
    setIsLoading(true);
    setErrorType(null);
    try {
      await syncWithSupabase();
      setIsLoading(false);
    } catch (err: any) {
      console.error('Database Sync Error:', err);
      if (err.message === 'SCHEMA_MISSING') {
        setErrorType('schema_missing');
      } else {
        setErrorType('connection_failed');
        setErrorMessage(err.message || 'Gagal terhubung ke database.');
      }
      setIsLoading(false);
    }
  };

  useEffect(() => {
    sync();

    // Auto-sync when window receives focus or tab becomes visible
    const handleFocusSync = async () => {
      try {
        await syncWithSupabase();
      } catch (e) {
        console.warn('Focus sync exception:', e);
      }
    };

    window.addEventListener('focus', handleFocusSync);
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        handleFocusSync();
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);

    // Auto-sync on local changes
    const handleLocalChange = () => {
      handleFocusSync();
    };
    window.addEventListener('pf_data_changed', handleLocalChange);

    return () => {
      window.removeEventListener('focus', handleFocusSync);
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('pf_data_changed', handleLocalChange);
    };
  }, []);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200 p-6">
        <div className="flex flex-col items-center space-y-4 max-w-md text-center">
          <div className="relative flex items-center justify-center w-16 h-16 rounded-2xl bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 shadow-md">
            <Database size={32} className="animate-pulse" />
          </div>
          <h2 className="text-xl font-semibold tracking-tight">Memuat Data Keuangan...</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Sedang mensinkronisasi data keuangan dari database. Mohon tunggu sebentar.
          </p>
          <div className="flex items-center justify-center pt-2">
            <RefreshCw size={24} className="animate-spin text-indigo-600 dark:text-indigo-400" />
          </div>
        </div>
      </div>
    );
  }

  if (errorType === 'schema_missing') {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200 p-6">
        <div className="w-full max-w-xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-2xl shadow-xl p-8 flex flex-col items-center text-center">
          <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-amber-50 dark:bg-amber-950 text-amber-500 dark:text-amber-400 mb-6 shadow-sm">
            <AlertTriangle size={32} />
          </div>
          
          <h2 className="text-2xl font-bold tracking-tight mb-2">Inisialisasi Database Diperlukan</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-6 max-w-md">
            Koneksi ke server database berhasil, namun skema tabel belum lengkap. Silakan jalankan migrasi database di server PostgreSQL.
          </p>

          <button 
            onClick={sync} 
            className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white font-medium text-sm rounded-xl shadow-md transition-all cursor-pointer"
          >
            <RefreshCw size={16} /> Coba Hubungkan Kembali
          </button>
        </div>
      </div>
    );
  }

  if (errorType === 'connection_failed') {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200 p-6">
        <div className="w-full max-w-md bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-2xl shadow-xl p-8 flex flex-col items-center text-center">
          <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-rose-50 dark:bg-rose-950 text-rose-500 dark:text-rose-400 mb-6 shadow-sm">
            <ServerOff size={32} />
          </div>
          
          <h2 className="text-2xl font-bold tracking-tight mb-2">Gagal Menghubungkan Database</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
            Terjadi masalah saat mencoba terhubung ke API database. Silakan periksa koneksi PostgreSQL dan DATABASE_URL.
          </p>

          <div className="text-xs text-rose-600 dark:text-rose-400 font-mono bg-rose-50 dark:bg-rose-950/30 border border-rose-100 dark:border-rose-900/50 rounded-lg p-3 w-full text-left mb-6 overflow-x-auto whitespace-pre-wrap">
            {errorMessage}
          </div>

          <button 
            onClick={sync} 
            className="flex items-center gap-2 px-5 py-2.5 bg-slate-900 hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100 active:scale-95 text-white font-medium text-sm rounded-xl shadow-md transition-all cursor-pointer"
          >
            <RefreshCw size={16} /> Coba Lagi
          </button>
        </div>
      </div>
    );
  }

  return (
    <AppContext.Provider value={{ isSynced: true, syncData: sync }}>
      <SpaceProvider>
        <MainLayoutContent>{children}</MainLayoutContent>
      </SpaceProvider>
    </AppContext.Provider>
  );
}

export default AppProvider;

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};

// Backward-compatible alias
export const useSupabase = useApp;
export const SupabaseProvider = AppProvider;
export const useMobileMenu = () => useContext(MobileMenuContext);
