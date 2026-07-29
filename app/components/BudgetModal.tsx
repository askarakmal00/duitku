'use client';
import { useState } from 'react';
import { X } from 'lucide-react';
import { BudgetPos } from '@/lib/types';

interface BudgetModalProps {
  existing?: BudgetPos;
  onSave: (data: Omit<BudgetPos, 'id' | 'createdAt'>) => void;
  onClose: () => void;
}

export default function BudgetModal({ existing, onSave, onClose }: BudgetModalProps) {
  const [name, setName] = useState(existing?.name || '');
  const [allocation, setAllocation] = useState(existing?.monthlyAllocation?.toString() || '');
  const [rollover, setRollover] = useState(existing?.rollover || false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !allocation) return;
    onSave({ name, monthlyAllocation: parseFloat(allocation), rollover });
  };

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 420 }}>
        <div className="modal-header">
          <span className="modal-title">{existing ? 'Edit Pos Anggaran' : 'Tambah Pos Anggaran'}</span>
          <button className="modal-close" onClick={onClose}><X size={16} /></button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div className="form-group">
              <label className="form-label">Nama Pos *</label>
              <input
                className="form-input"
                type="text"
                placeholder="cth: Operasional, Rumah Tangga..."
                value={name}
                onChange={e => setName(e.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">Alokasi Bulanan (Rp) *</label>
              <input
                className="form-input"
                type="number"
                min="0"
                step="1000"
                placeholder="0"
                value={allocation}
                onChange={e => setAllocation(e.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">Rollover Sisa</label>
              <div className="toggle-group">
                <label className="toggle">
                  <input
                    type="checkbox"
                    checked={rollover}
                    onChange={e => setRollover(e.target.checked)}
                  />
                  <span className="toggle-slider" />
                </label>
                <span className="text-sm text-secondary">
                  {rollover ? 'Sisa bulan lalu ditambahkan ke bulan ini' : 'Anggaran reset tiap bulan'}
                </span>
              </div>
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-ghost" onClick={onClose}>Batal</button>
            <button type="submit" className="btn btn-primary">
              {existing ? 'Simpan' : 'Tambah Pos'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
