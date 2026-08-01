'use client';
import { useState } from 'react';
import { X, Target } from 'lucide-react';
import { SavingGoal } from '@/lib/types';
import { toInputDate, formatCurrency, clamp } from '@/lib/helpers';
import { getGoalProgress } from '@/lib/store';

interface GoalDepositModalProps {
  goal: SavingGoal;
  onSave: (amount: number, note: string, date: string) => void;
  onClose: () => void;
}

export default function GoalDepositModal({ goal, onSave, onClose }: GoalDepositModalProps) {
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [date, setDate] = useState(toInputDate());

  const progress = getGoalProgress(goal.id);
  const remaining = Math.max(0, goal.targetAmount - progress);
  const pct = clamp((progress / goal.targetAmount) * 100, 0, 100);

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/[^0-9]/g, '');
    setAmount(val);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const num = parseInt(amount, 10);
    if (!num || num <= 0) return;
    onSave(num, note || `Setor ke: ${goal.name}`, date);
  };

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 420 }}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Target size={18} color="var(--primary)" />
            <span className="modal-title">Setor ke Goal</span>
          </div>
          <button className="modal-close" onClick={onClose}><X size={16} /></button>
        </div>

        <div style={{ background: 'var(--primary-50)', padding: '14px 24px', borderBottom: '1px solid var(--border)' }}>
          <p style={{ fontWeight: 700, fontSize: 15, color: 'var(--text-primary)', marginBottom: 6 }}>{goal.name}</p>
          <div className="progress-bar" style={{ height: 8, marginBottom: 6 }}>
            <div className="progress-fill" style={{ width: `${pct}%` }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
            <span className="text-muted">Terkumpul: <strong style={{ color: 'var(--success)' }}>{formatCurrency(progress)}</strong></span>
            <span className="text-muted">Sisa: <strong style={{ color: 'var(--primary)' }}>{formatCurrency(remaining)}</strong></span>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div className="form-group">
              <label className="form-label">Jumlah Setor (Rp) *</label>
              <input
                className="form-input"
                type="text"
                inputMode="numeric"
                placeholder={`Maks sisa: Rp ${remaining.toLocaleString('id-ID')}`}
                value={amount}
                onChange={handleAmountChange}
                autoFocus
                required
              />
              {amount && (
                <span style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                  Rp {parseInt(amount || '0').toLocaleString('id-ID')}
                </span>
              )}
            </div>
            <div className="form-group">
              <label className="form-label">Tanggal *</label>
              <input
                className="form-input"
                type="date"
                value={date}
                onChange={e => setDate(e.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">Keterangan</label>
              <input
                className="form-input"
                type="text"
                placeholder="Catatan setor..."
                value={note}
                onChange={e => setNote(e.target.value)}
              />
            </div>
            <div style={{
              background: 'var(--primary-50)', borderRadius: 'var(--radius-sm)',
              padding: '10px 14px', fontSize: 13, color: 'var(--text-secondary)',
              border: '1px solid var(--primary-200)'
            }}>
              💡 Setoran ini akan <strong>memotong saldo utama</strong> dan menambah progress target
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-ghost" onClick={onClose}>Batal</button>
            <button type="submit" className="btn btn-primary">
              💰 Setor ke Goal
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
