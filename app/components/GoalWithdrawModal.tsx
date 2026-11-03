'use client';
import { useState } from 'react';
import { X, ArrowDownRight, AlertCircle } from 'lucide-react';
import { SavingGoal } from '@/lib/types';
import { toInputDate, formatCurrency } from '@/lib/helpers';
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
  const [error, setError] = useState<string | null>(null);

  const currentBalance = getGoalProgress(goal.id);

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/[^0-9]/g, '');
    setAmount(val);
    setError(null);
  };

  const handleSetMax = () => {
    if (currentBalance > 0) {
      setAmount(currentBalance.toString());
      setError(null);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const withdrawAmount = parseInt(amount, 10);
    if (!withdrawAmount || withdrawAmount <= 0) return;
    if (withdrawAmount > currentBalance) {
      setError(`Jumlah penarikan melebihi saldo tersedia (${formatCurrency(currentBalance)})!`);
      return;
    }
    onSave(withdrawAmount, note || `Tarik dari: ${goal.name}`, date);
  };

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 420 }}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{
              width: 32, height: 32, borderRadius: 8,
              background: '#FEF2F2', color: '#DC2626',
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              <ArrowDownRight size={18} />
            </div>
            <span className="modal-title">Tarik dari Tabungan</span>
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
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: 12, color: '#64748B' }}>Saldo tersedia:</span>
              <span style={{ fontSize: 14, fontWeight: 700, color: currentBalance > 0 ? '#059669' : '#DC2626' }}>
                {formatCurrency(currentBalance)}
              </span>
            </div>
            {currentBalance > 0 && (
              <button
                type="button"
                onClick={handleSetMax}
                style={{
                  background: '#EEF2FF', border: '1px solid #C7D2FE',
                  borderRadius: 6, padding: '3px 8px', fontSize: 11,
                  color: '#4F46E5', fontWeight: 700, cursor: 'pointer'
                }}
              >
                Tarik Semua
              </button>
            )}
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div className="form-group">
              <label className="form-label">Nominal Tarik (Rp) *</label>
              <input
                className="form-input"
                type="text"
                inputMode="numeric"
                placeholder={`Maks: Rp ${currentBalance.toLocaleString('id-ID')}`}
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
              {error && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#DC2626', fontSize: 12, marginTop: 4 }}>
                  <AlertCircle size={13} />
                  <span>{error}</span>
                </div>
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
              <label className="form-label">Keterangan Penarikan</label>
              <input
                className="form-input"
                type="text"
                placeholder="cth: Keperluan darurat, belanja kebutuhan..."
                value={note}
                onChange={e => setNote(e.target.value)}
              />
            </div>
            <div style={{
              background: '#FFFBEB', borderRadius: 10,
              padding: '10px 14px', fontSize: 12.5, color: '#B45309',
              border: '1px solid #FDE68A', lineHeight: 1.5
            }}>
              💡 <strong>Otomatis Terhubung:</strong> Dana yang ditarik akan <strong>langsung kembali ke saldo Kas Bersama</strong> dan memotong saldo kantong tabungan ini.
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-ghost" onClick={onClose}>Batal</button>
            <button
              type="submit"
              className="btn btn-danger"
              disabled={currentBalance <= 0}
            >
              💸 Konfirmasi Penarikan
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
