'use client';
import { useState } from 'react';
import { X } from 'lucide-react';
import { SavingGoal } from '@/lib/types';

interface GoalModalProps {
  existing?: SavingGoal;
  onSave: (data: Omit<SavingGoal, 'id' | 'createdAt'>) => void;
  onClose: () => void;
}

export default function GoalModal({ existing, onSave, onClose }: GoalModalProps) {
  const [name, setName] = useState(existing?.name || '');
  const [target, setTarget] = useState(existing?.targetAmount?.toString() || '');

  const handleTargetChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/[^0-9]/g, '');
    setTarget(val);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const num = parseInt(target, 10);
    if (!name || isNaN(num) || num <= 0) return;
    onSave({ name, targetAmount: num });
  };

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 400 }}>
        <div className="modal-header">
          <span className="modal-title">{existing ? 'Edit Target' : 'Tambah Target Tabungan'}</span>
          <button className="modal-close" onClick={onClose}><X size={16} /></button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div className="form-group">
              <label className="form-label">Nama Target *</label>
              <input
                className="form-input"
                type="text"
                placeholder="cth: Dana Darurat, Liburan, Gadget..."
                value={name}
                onChange={e => setName(e.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">Nominal Target (Rp) *</label>
              <input
                className="form-input"
                type="text"
                inputMode="numeric"
                placeholder="0"
                value={target}
                onChange={handleTargetChange}
                required
              />
              {target && (
                <span style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                  Rp {parseInt(target || '0').toLocaleString('id-ID')}
                </span>
              )}
            </div>
            <p className="text-sm text-muted" style={{ marginTop: -8 }}>
              💡 Progress dihitung dari transaksi Pemasukan dengan kategori Tabungan yang dialokasikan ke target ini.
            </p>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-ghost" onClick={onClose}>Batal</button>
            <button type="submit" className="btn btn-primary">
              {existing ? 'Simpan' : 'Buat Target'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
