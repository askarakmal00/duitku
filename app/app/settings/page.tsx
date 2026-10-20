'use client';
import { useEffect, useState } from 'react';
import { Plus, Trash2, Database, ArrowDownCircle, CheckCircle2, Loader2 } from 'lucide-react';
import Header from '@/components/Header';
import { getSettings, saveSettings, getCategories, addCategory, deleteCategory, clearAllData } from '@/lib/store';
import { AppSettings, Category } from '@/lib/types';

export default function SettingsPage() {
  const [settings, setSettings] = useState<AppSettings>({ userName: '', darkMode: false });
  const [categories, setCategories] = useState<Category[]>([]);
  const [newCat, setNewCat] = useState('');
  const [newCatType, setNewCatType] = useState<'masuk' | 'keluar' | 'both'>('both');
  const [saved, setSaved] = useState(false);
  const [migrating, setMigrating] = useState(false);
  const [migrationResult, setMigrationResult] = useState<any>(null);
  const [supaUrl, setSupaUrl] = useState('');
  const [supaKey, setSupaKey] = useState('');

  const handleMigrateFromSupabase = async () => {
    if (!supaUrl.trim() || !supaKey.trim()) {
      alert('Harap masukkan Supabase URL dan Anon Key terlebih dahulu.');
      return;
    }
    setMigrating(true);
    setMigrationResult(null);
    try {
      const res = await fetch('/api/migrate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ supabaseUrl: supaUrl.trim(), supabaseKey: supaKey.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Gagal melakukan migrasi.');
      }
      setMigrationResult(data);
      setTimeout(() => {
        window.location.reload();
      }, 3000);
    } catch (err: any) {
      alert('Gagal migrasi: ' + err.message);
    } finally {
      setMigrating(false);
    }
  };

  const load = () => {
    setSettings(getSettings());
    setCategories(getCategories());
  };
  useEffect(() => {
    load();
    window.addEventListener('pf_data_changed', load);
    return () => window.removeEventListener('pf_data_changed', load);
  }, []);

  const handleSaveSettings = async () => {
    await saveSettings(settings);
    if (settings.darkMode) document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleAddCat = async () => {
    if (!newCat.trim()) return;
    await addCategory({ name: newCat.trim(), type: newCatType });
    setNewCat('');
    load();
  };

  const handleDeleteCat = async (id: string) => {
    await deleteCategory(id);
    load();
  };

  const handleClearData = async () => {
    if (confirm('⚠️ Ini akan menghapus SEMUA data (transaksi, anggaran, hutang, goals). Tidak bisa dibatalkan. Lanjutkan?')) {
      await clearAllData();
      window.location.reload();
    }
  };

  return (
    <>
      <Header title="Pengaturan" subtitle="Konfigurasi aplikasi dan preferensi Anda" />

      <div className="page-container">
        <div style={{ maxWidth: 720, display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* Profile */}
          <div className="card">
            <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 20 }}>Profil Pengguna</h2>
            <div className="form-group">
              <label className="form-label">Nama Pengguna</label>
              <input
                className="form-input"
                type="text"
                value={settings.userName}
                onChange={e => setSettings({ ...settings, userName: e.target.value })}
                placeholder="Nama Anda"
              />
            </div>
            <div className="form-group">
              <label className="form-label">Tema</label>
              <div className="toggle-group">
                <label className="toggle">
                  <input
                    type="checkbox"
                    checked={settings.darkMode}
                    onChange={e => setSettings({ ...settings, darkMode: e.target.checked })}
                  />
                  <span className="toggle-slider" />
                </label>
                <span className="text-sm text-secondary">
                  {settings.darkMode ? '🌙 Dark Mode aktif' : '☀️ Light Mode aktif'}
                </span>
              </div>
            </div>
            <button className="btn btn-primary" onClick={handleSaveSettings}>
              {saved ? '✓ Tersimpan!' : 'Simpan Pengaturan'}
            </button>
          </div>

          {/* PIN Security Management */}
          <div className="card">
            <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>Keamanan & PIN Ruang</h2>
            <p className="text-sm text-secondary" style={{ marginBottom: 16 }}>
              Aplikasi Duitku dilindungi 6 digit PIN untuk masing-masing ruang finansial.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 14 }}>
              {/* Pribadi PIN Card */}
              <div style={{
                padding: 16,
                borderRadius: 12,
                border: '1px solid var(--border)',
                background: 'var(--bg-secondary)',
                display: 'flex',
                flexDirection: 'column',
                gap: 8,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontWeight: 600, fontSize: 14 }}>👤 Duitku Pribadi (Asykar)</span>
                  <span style={{ fontSize: 11, background: '#EEF2FF', color: '#4F46E5', padding: '2px 8px', borderRadius: 6, fontWeight: 700 }}>
                    Default: 235689
                  </span>
                </div>
                <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: 0 }}>
                  PIN digunakan saat membuka aplikasi atau beralih ke ruang pribadi Asykar.
                </p>
              </div>

              {/* Keluarga PIN Card */}
              <div style={{
                padding: 16,
                borderRadius: 12,
                border: '1px solid var(--border)',
                background: 'var(--bg-secondary)',
                display: 'flex',
                flexDirection: 'column',
                gap: 8,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontWeight: 600, fontSize: 14 }}>🏠 Duitku Keluarga</span>
                  <span style={{ fontSize: 11, background: '#ECFDF5', color: '#059669', padding: '2px 8px', borderRadius: 6, fontWeight: 700 }}>
                    Default: 080808
                  </span>
                </div>
                <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: 0 }}>
                  PIN bersama untuk Asykar & Istri saat mengelola kas bersama.
                </p>
              </div>
            </div>
          </div>


          {/* Categories */}
          <div className="card">
            <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 20 }}>Kelola Kategori</h2>

            {/* Add new */}
            <div className="settings-cat-add-row">
              <input
                className="form-input"
                style={{ flex: 1 }}
                type="text"
                placeholder="Nama kategori baru..."
                value={newCat}
                onChange={e => setNewCat(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleAddCat()}
              />
              <select
                className="form-select"
                style={{ width: 140 }}
                value={newCatType}
                onChange={e => setNewCatType(e.target.value as 'masuk' | 'keluar' | 'both')}
              >
                <option value="both">Keduanya</option>
                <option value="masuk">Pemasukan</option>
                <option value="keluar">Pengeluaran</option>
              </select>
              <button className="btn btn-primary" onClick={handleAddCat}>
                <Plus size={16} /> Tambah
              </button>
            </div>

            {/* List */}
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Nama Kategori</th>
                    <th>Tipe</th>
                    <th>Status</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {categories.map(cat => (
                    <tr key={cat.id}>
                      <td style={{ fontWeight: 500 }}>{cat.name}</td>
                      <td>
                        <span className={`chip ${cat.type === 'masuk' ? 'chip-success' : cat.type === 'keluar' ? 'chip-danger' : ''}`}>
                          {cat.type === 'masuk' ? 'Pemasukan' : cat.type === 'keluar' ? 'Pengeluaran' : 'Keduanya'}
                        </span>
                      </td>
                      <td>
                        {cat.isDefault ? (
                          <span className="chip">Default</span>
                        ) : (
                          <span className="chip" style={{ background: 'var(--primary-50)', color: 'var(--primary)' }}>Custom</span>
                        )}
                      </td>
                      <td>
                        <button className="btn btn-danger btn-icon btn-sm" onClick={() => handleDeleteCat(cat.id)} title="Hapus Kategori">
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Supabase Migration */}
          <div className="card" style={{ border: '1px solid #C7D2FE', background: '#F8FAFC' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: '#EEF2FF', color: '#4F46E5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Database size={20} />
              </div>
              <div>
                <h2 style={{ fontSize: 16, fontWeight: 700, margin: 0, color: '#0F172A' }}>Migrasi Data dari Supabase</h2>
                <p className="text-sm text-secondary" style={{ margin: 0 }}>
                  Pindahkan seluruh transaksi, anggaran, hutang, dan goals dari Supabase Cloud ke PostgreSQL VPS ini.
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 16 }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" style={{ fontSize: 12.5 }}>Supabase Project URL</label>
                <input
                  className="form-input"
                  type="text"
                  placeholder="https://xxxxxxxxxxxx.supabase.co"
                  value={supaUrl}
                  onChange={e => setSupaUrl(e.target.value)}
                  disabled={migrating}
                />
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" style={{ fontSize: 12.5 }}>Supabase Anon / Public Key</label>
                <input
                  className="form-input"
                  type="password"
                  placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                  value={supaKey}
                  onChange={e => setSupaKey(e.target.value)}
                  disabled={migrating}
                />
              </div>

              {migrationResult && (
                <div style={{ padding: 12, borderRadius: 10, background: '#ECFDF5', border: '1px solid #A7F3D0', color: '#065F46', fontSize: 13 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700, marginBottom: 4 }}>
                    <CheckCircle2 size={16} /> {migrationResult.message}
                  </div>
                  <div style={{ fontSize: 12 }}>
                    Transaksi: {migrationResult.summary?.transactions ?? 0} | Anggaran: {migrationResult.summary?.budget_pos ?? 0} | Goals: {migrationResult.summary?.saving_goals ?? 0} | Kategori: {migrationResult.summary?.categories ?? 0}
                  </div>
                  <div style={{ fontSize: 11, marginTop: 4, color: '#047857' }}>Halaman akan otomatis dimuat ulang...</div>
                </div>
              )}

              <div>
                <button
                  className="btn btn-primary"
                  onClick={handleMigrateFromSupabase}
                  disabled={migrating}
                  style={{ display: 'flex', alignItems: 'center', gap: 8 }}
                >
                  {migrating ? (
                    <>
                      <Loader2 size={16} className="animate-spin" /> Sedang Menarik Data...
                    </>
                  ) : (
                    <>
                      <ArrowDownCircle size={16} /> Tarik Data dari Supabase Sekarang
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Danger Zone */}
          <div className="card" style={{ borderColor: 'var(--danger)', border: '1px solid' }}>
            <h2 style={{ fontSize: 16, fontWeight: 700, color: 'var(--danger)', marginBottom: 12 }}>⚠️ Zona Berbahaya</h2>
            <p className="text-sm text-secondary" style={{ marginBottom: 16 }}>
              Tindakan ini tidak dapat dibatalkan. Semua data transaksi, anggaran, hutang, dan target akan dihapus permanen.
            </p>
            <button className="btn btn-danger" onClick={handleClearData}>
              🗑️ Hapus Semua Data
            </button>
          </div>

          {/* About */}
          <div className="card">
            <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 12 }}>Tentang FinKu</h2>
            <p className="text-sm text-secondary">
              FinKu adalah aplikasi manajemen keuangan pribadi yang menyimpan data secara lokal di browser Anda.
              Data tidak dikirim ke server manapun — sepenuhnya privat.
            </p>
            <div className="separator" />
            <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
              <span className="text-sm text-muted">Versi: 1.0.0</span>
              <span className="text-sm text-muted">Penyimpanan: localStorage</span>
              <span className="text-sm text-muted">© 2026 FinKu</span>
            </div>
          </div>

        </div>
      </div>
    </>
  );
}
