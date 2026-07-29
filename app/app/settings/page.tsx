'use client';
import { useEffect, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import Header from '@/components/Header';
import { getSettings, saveSettings, getCategories, addCategory, deleteCategory, clearAllData } from '@/lib/store';
import { AppSettings, Category } from '@/lib/types';

export default function SettingsPage() {
  const [settings, setSettings] = useState<AppSettings>({ userName: '', darkMode: false });
  const [categories, setCategories] = useState<Category[]>([]);
  const [newCat, setNewCat] = useState('');
  const [newCatType, setNewCatType] = useState<'masuk' | 'keluar' | 'both'>('both');
  const [saved, setSaved] = useState(false);

  const load = () => {
    setSettings(getSettings());
    setCategories(getCategories());
  };
  useEffect(() => { load(); }, []);

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

          {/* Categories */}
          <div className="card">
            <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 20 }}>Kelola Kategori</h2>

            {/* Add new */}
            <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
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
                        {!cat.isDefault && (
                          <button className="btn btn-danger btn-icon btn-sm" onClick={() => handleDeleteCat(cat.id)}>
                            <Trash2 size={14} />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
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
