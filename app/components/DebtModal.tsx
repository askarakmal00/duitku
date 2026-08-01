'use client';
import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { DebtParty } from '@/lib/types';
import { getDebtParties } from '@/lib/store';
import { toInputDate } from '@/lib/helpers';

interface DebtModalProps {
  mode: 'tambah' | 'bayar';
  onSave: (partyName: string, amount: number, note: string, date: string) => void;
  onClose: () => void;
  defaultParty?: string;
}

export default function DebtModal({ mode, onSave, onClose, defaultParty }: DebtModalProps) {
  const [partyName, setPartyName] = useState(defaultParty || '');
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [date, setDate] = useState(toInputDate());
  const [parties, setParties] = useState<DebtParty[]>([]);
  const [isNew, setIsNew] = useState(!defaultParty);

  useEffect(() => {
    setParties(getDebtParties());
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!partyName || !amount) return;
    onSave(partyName, parseFloat(amount), note, date);
  };

  const title = mode === 'tambah' ? 'Catat Hutang' : 'Bayar Hutang';
  const amountLabel = mode === 'tambah' ? 'Jumlah Hutang (Rp) *' : 'Jumlah Bayar (Rp) *';
  const btnLabel = mode === 'tambah' ? 'Catat Hutang' : 'Catat Pembayaran';

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 420 }}>
        <div className="modal-header">
          <span className="modal-title">{title}</span>
          <button className="modal-close" onClick={onClose}><X size={16} /></button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div className="form-group">
              <label className="form-label">Pihak *</label>
              {mode === 'tambah' ? (
                <>
                  <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                    <button
                      type="button"
                      className={`btn btn-sm ${!isNew ? 'btn-primary' : 'btn-secondary'}`}
                      onClick={() => setIsNew(false)}
                    >
                      Pilih yang ada
                    </button>
                    <button
                      type="button"
                      className={`btn btn-sm ${isNew ? 'btn-primary' : 'btn-secondary'}`}
                      onClick={() => setIsNew(true)}
                    >
                      + Baru
                    </button>
                  </div>
                  {!isNew && parties.length > 0 ? (
                    <select
                      className="form-select"
                      value={partyName}
                      onChange={e => setPartyName(e.target.value)}
                      required
                    >
                      <option value="">Pilih pihak...</option>
                      {parties.map(p => <option key={p.id} value={p.name}>{p.name}</option>)}
                    </select>
                  ) : (
                    <input
                      className="form-input"
                      type="text"
                      placeholder="Nama pihak (bebas)"
                      value={partyName}
                      onChange={e => setPartyName(e.target.value)}
                      required
                    />
                  )}
                </>
              ) : (
                <select
                  className="form-select"
                  value={partyName}
                  onChange={e => setPartyName(e.target.value)}
                  required
                >
                  <option value="">Pilih pihak...</option>
                  {parties.map(p => <option key={p.id} value={p.name}>{p.name}</option>)}
                </select>
              )}
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">{amountLabel}</label>
                <input
                  className="form-input"
                  type="number"
                  min="0"
                  step="any"
                  placeholder="0"
                  value={amount}
                  onChange={e => setAmount(e.target.value)}
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
            </div>

            <div className="form-group">
              <label className="form-label">Keterangan</label>
              <input
                className="form-input"
                type="text"
                placeholder="Tambah catatan..."
                value={note}
                onChange={e => setNote(e.target.value)}
              />
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-ghost" onClick={onClose}>Batal</button>
            <button type="submit" className={`btn ${mode === 'tambah' ? 'btn-danger' : 'btn-primary'}`}>
              {btnLabel}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
