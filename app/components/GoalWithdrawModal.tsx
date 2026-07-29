'use client';
import { useState } from 'react';
import { X, ArrowDownRight } from 'lucide-react';
import { SavingGoal } from '@/lib/types';
import { toInputDate, formatCurrency, clamp } from '@/lib/helpers';
import { getGoalProgress } from '@/lib/store';

interface GoalWithdrawModalProps {
  goal: SavingGoal;
  onSave: (amount: number, note: string, date: string) => void;
  onClose: () => void;
}

export default function GoalWithdrawModal({ goal, onSave, onClose }: GoalWithdrawModalProps) {
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [date, setDate] = useState(toInputDate());

  const progress = getGoalProgress(goal.id);
  const pct = clamp((progress / goal.targetAmount) * 100, 0, 100);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const withdrawAmount = parseFloat(amount);
    if (!withdrawAmount || withdrawAmount <= 0) return;
    if (withdrawAmount > progress) {
      alert('Jumlah penarikan melebihi saldo tabungan goal ini!');
      return;
    }
    onSave(withdrawAmount, note || `Tarik dari: ${goal.name}`, date);
  };

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 420 }}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <ArrowDownRight size={18} color="var(--danger)" />
            <span className="modal-title">Tarik dari Goal</span>
          </div>
          <button className="modal-close" onClick={onClose}><X size={16} /></button>
        </div>

        <div style={{ background: 'var(--primary-50)', padding: '14px 24px', borderBottom: '1px solid var(--border)' }}>
          <p style={{ fontWeight: 700, fontSize: 15, color: 'var(--text-primary)', marginBottom: 6 }}>{goal.name}</p>
          <div className="progress-bar" style={{ height: 8, marginBottom: 6 }}>
            <div className="progress-fill" style={{ width: `${pct}%` }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
            <span className="text-muted">Terkumpul saat ini: <strong style={{ color: 'var(--success)' }}>{formatCurrency(progress)}</strong></span>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div className="form-group">
              <label className="form-label">Jumlah Tarik (Rp) *</label>
              <input
                className="form-input"
                type="number"
                min="0"
                step="1000"
                placeholder={`Maks penarikan: Rp ${progress.toLocaleString('id-ID')}`}
                value={amount}
                onChange={e => setAmount(e.target.value)}
                autoFocus
                required
              />
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
                placeholder="Catatan penarikan..."
                value={note}
                onChange={e => setNote(e.target.value)}
              />
            </div>
            <div style={{
              background: 'var(--warning-bg)', borderRadius: 'var(--radius-sm)',
              padding: '10px 14px', fontSize: 13, color: 'var(--warning)',
              border: '1px solid #FCD34D'
            }}>
              💡 Penarikan ini akan <strong>menambahkan ke saldo utama</strong> dan mengurangi progress target
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-ghost" onClick={onClose}>Batal</button>
            <button type="submit" className="btn btn-danger">
              💸 Tarik Uang
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
