'use client';
import { useState } from 'react';
import { X, PiggyBank } from 'lucide-react';
import { SavingGoal } from '@/lib/types';

interface GoalModalProps {
  existing?: SavingGoal;
  onSave: (data: Omit<SavingGoal, 'id' | 'createdAt'>) => void;
  onClose: () => void;
}

const PRESET_NAMES = [
  'Dana Darurat 🛡️',
  'Pendidikan Anak 🎓',
  'Tabungan Liburan 🏖️',
  'Tabungan Qurban 🐑',
  'Renovasi Rumah 🏡',
  'Dana Hari Tua ⏳',
  'Uang Dingin ❄️',
];

export default function GoalModal({ existing, onSave, onClose }: GoalModalProps) {
  const [name, setName] = useState(existing?.name || '');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = name.trim();
    if (!cleanName) return;
    onSave({ name: cleanName, targetAmount: 0 });
  };

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 420 }}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{
              width: 32, height: 32, borderRadius: 8,
              background: '#ECFDF5', color: '#059669',
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              <PiggyBank size={18} />
            </div>
            <span className="modal-title">
              {existing ? 'Edit Kantong Tabungan' : 'Tambah Kantong Tabungan'}
            </span>
          </div>
          <button className="modal-close" onClick={onClose}><X size={16} /></button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div className="form-group">
              <label className="form-label">Nama Kantong Tabungan *</label>
              <input
                className="form-input"
                type="text"
                placeholder="cth: Dana Darurat, Tabungan Pendidikan..."
                value={name}
                onChange={e => setName(e.target.value)}
                autoFocus
                required
              />
            </div>

            {/* Quick Presets */}
            <div style={{ marginBottom: 12 }}>
              <span style={{ fontSize: 11, fontWeight: 600, color: '#64748B', display: 'block', marginBottom: 6 }}>
                Pilihan Cepat:
              </span>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {PRESET_NAMES.map(preset => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setName(preset)}
                    style={{
                      fontSize: 11,
                      padding: '4px 8px',
                      borderRadius: 6,
                      background: name === preset ? '#EEF2FF' : '#F8FAFC',
                      border: `1px solid ${name === preset ? '#6366F1' : '#E2E8F0'}`,
                      color: name === preset ? '#4F46E5' : '#475569',
                      cursor: 'pointer',
                      fontWeight: name === preset ? 700 : 500,
                    }}
                  >
                    {preset}
                  </button>
                ))}
              </div>
            </div>

            <div style={{
              background: '#F8FAFC',
              borderRadius: 10,
              padding: '12px 14px',
              fontSize: 12,
              color: '#475569',
              border: '1px solid #E2E8F0',
              lineHeight: 1.5,
            }}>
              💡 <strong>Model Tabungan Bebas:</strong> Tanpa batas nominal target atau deadline. Tabung kapan saja sesuai kesanggupan keluarga, dan tarik kembali jika dibutuhkan.
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-ghost" onClick={onClose}>Batal</button>
            <button type="submit" className="btn btn-primary" style={{ background: '#059669', borderColor: '#059669' }}>
              {existing ? 'Simpan Perubahan' : 'Buat Kantong Tabungan'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
