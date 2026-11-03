'use client';
import { useState } from 'react';
import { X, PiggyBank, ArrowUpRight } from 'lucide-react';
import { SavingGoal } from '@/lib/types';
import { toInputDate, formatCurrency } from '@/lib/helpers';
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

  const currentBalance = getGoalProgress(goal.id);

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
            <div style={{
              width: 32, height: 32, borderRadius: 8,
              background: '#ECFDF5', color: '#059669',
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              <ArrowUpRight size={18} />
            </div>
            <span className="modal-title">Setor ke Tabungan</span>
          </div>
          <button className="modal-close" onClick={onClose}><X size={16} /></button>
        </div>

        {/* Current Pocket Info */}
        <div style={{ background: '#F8FAFC', padding: '16px 20px', borderBottom: '1px solid #E2E8F0' }}>
          <div style={{ fontSize: 12, color: '#64748B', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Kantong Tabungan
          </div>
          <div style={{ fontSize: 17, fontWeight: 800, color: '#0F172A', marginTop: 2 }}>
            {goal.name}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 8 }}>
            <span style={{ fontSize: 12, color: '#64748B' }}>Saldo saat ini:</span>
            <span style={{ fontSize: 14, fontWeight: 700, color: '#059669' }}>
              {formatCurrency(currentBalance)}
            </span>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div className="form-group">
              <label className="form-label">Nominal Setor (Rp) *</label>
              <input
                className="form-input"
                type="text"
                inputMode="numeric"
                placeholder="0"
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
              <label className="form-label">Catatan</label>
              <input
                className="form-input"
                type="text"
                placeholder="cth: Tabungan rutin bulanan, bonus..."
                value={note}
                onChange={e => setNote(e.target.value)}
              />
            </div>
            <div style={{
              background: '#EEF2FF', borderRadius: 10,
              padding: '10px 14px', fontSize: 12.5, color: '#4338CA',
              border: '1px solid #C7D2FE', lineHeight: 1.5
            }}>
              💡 <strong>Otomatis Terhubung:</strong> Setoran ini akan <strong>memotong saldo Kas Bersama</strong> dan menambah saldo kantong tabungan ini.
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-ghost" onClick={onClose}>Batal</button>
            <button type="submit" className="btn btn-primary" style={{ background: '#059669', borderColor: '#059669' }}>
              💰 Konfirmasi Setor
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
