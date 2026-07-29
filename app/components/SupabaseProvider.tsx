'use client';
import React, { createContext, useContext, useEffect, useState } from 'react';
import { syncWithSupabase } from '@/lib/store';
import { Database, AlertTriangle, RefreshCw, ServerOff, FileText } from 'lucide-react';

interface SupabaseContextType {
  isSynced: boolean;
  syncData: () => Promise<void>;
}

const SupabaseContext = createContext<SupabaseContextType | undefined>(undefined);

export default function SupabaseProvider({ children }: { children: React.ReactNode }) {
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
      console.error('Supabase Sync Error:', err);
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
  }, []);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200 p-6">
        <div className="flex flex-col items-center space-y-4 max-w-md text-center">
          <div className="relative flex items-center justify-center w-16 h-16 rounded-2xl bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 shadow-md">
            <Database size={32} className="animate-pulse" />
          </div>
          <h2 className="text-xl font-semibold tracking-tight">Menghubungkan ke Supabase...</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Sedang mensinkronisasi data keuangan Anda dari database cloud. Mohon tunggu sebentar.
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
          
          <h2 className="text-2xl font-bold tracking-tight mb-2">Tabel Database Belum Dibuat</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-6 max-w-md">
            Koneksi ke Supabase berhasil! Namun, tabel database belum dibuat di proyek Supabase Anda. Anda perlu menjalankan skema SQL terlebih dahulu.
          </p>

          <div className="w-full bg-slate-50 dark:bg-slate-900 rounded-xl p-5 mb-6 text-left border border-slate-100 dark:border-slate-800">
            <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
              <FileText size={16} className="text-indigo-500" /> Langkah-langkah penyelesaian:
            </h3>
            <ol className="list-decimal list-inside text-xs space-y-2 text-slate-600 dark:text-slate-450">
              <li>Buka dashboard proyek Anda di <a href="https://supabase.com" target="_blank" rel="noreferrer" className="text-indigo-600 dark:text-indigo-400 underline font-medium">supabase.com</a>.</li>
              <li>Pilih menu <strong>SQL Editor</strong> di sidebar sebelah kiri.</li>
              <li>Buka file proyek lokal Anda di <span className="font-mono bg-slate-250 dark:bg-slate-800 px-1 py-0.5 rounded text-indigo-600 dark:text-indigo-400">supabase/schema.sql</span> dan salin (Copy) seluruh isinya.</li>
              <li>Tempel (Paste) kode tersebut ke SQL Editor Supabase, lalu klik tombol <strong>Run</strong>.</li>
              <li>Setelah berhasil dijalankan, klik tombol di bawah untuk mencoba kembali.</li>
            </ol>
          </div>

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
            Terjadi masalah saat mencoba terhubung ke API Supabase. Silakan periksa kembali konfigurasi file env Anda.
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
    <SupabaseContext.Provider value={{ isSynced: true, syncData: sync }}>
      {children}
    </SupabaseContext.Provider>
  );
}

export const useSupabase = () => {
  const context = useContext(SupabaseContext);
  if (!context) {
    throw new Error('useSupabase must be used within a SupabaseProvider');
  }
  return context;
};
