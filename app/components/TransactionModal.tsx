'use client';
import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { Transaction, SUB_CATEGORIES } from '@/lib/types';
import { getCategories, getBudgetPos, getSavingGoals } from '@/lib/store';
import { toInputDate } from '@/lib/helpers';
import { BudgetPos, SavingGoal, Category } from '@/lib/types';

interface TransactionModalProps {
  existing?: Transaction;
  onSave: (data: Omit<Transaction, 'id' | 'createdAt'>) => void;
  onClose: () => void;
}

export default function TransactionModal({ existing, onSave, onClose }: TransactionModalProps) {
  const [type, setType] = useState<'masuk' | 'keluar'>(existing?.type || 'keluar');
  const [category, setCategory] = useState(existing?.category || '');
  const [subCategory, setSubCategory] = useState(existing?.subCategory || '');
  const [budgetPosId, setBudgetPosId] = useState(existing?.budgetPosId || '');
  const [goalId, setGoalId] = useState(existing?.goalId || '');
  const [amount, setAmount] = useState(existing?.amount?.toString() || '');
  const [amountDisplay, setAmountDisplay] = useState(
    existing?.amount ? new Intl.NumberFormat('id-ID').format(existing.amount) : ''
  );
  const [note, setNote] = useState(existing?.note || '');
  const [date, setDate] = useState(existing?.date || toInputDate());
  const [categories, setCategories] = useState<Category[]>([]);
  const [budgetPosList, setBudgetPosList] = useState<BudgetPos[]>([]);
  const [goals, setGoals] = useState<SavingGoal[]>([]);

  useEffect(() => {
    setCategories(getCategories());
    setBudgetPosList(getBudgetPos());
    setGoals(getSavingGoals());
  }, []);

  const filteredCats = categories.filter(c => c.type === type || c.type === 'both');

  // Format number with thousand separators as user types
  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, ''); // digits only
    setAmount(raw);
    if (raw) {
      setAmountDisplay(new Intl.NumberFormat('id-ID').format(Number(raw)));
    } else {
      setAmountDisplay('');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = Number(amount);
    if (!category || !amount || !date || numAmount <= 0) return;
    onSave({
      type,
      category,
      subCategory: category === 'Pengeluaran' ? subCategory : undefined,
      budgetPosId: budgetPosId || undefined,
      goalId: goalId || undefined,
      amount: numAmount,
      note,
      date,
    });
  };

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <span className="modal-title">{existing ? 'Edit Transaksi' : 'Tambah Transaksi'}</span>
          <button className="modal-close" onClick={onClose}><X size={16} /></button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {/* Type Selector */}
            <div className="type-selector">
              <div
                className={`type-option masuk ${type === 'masuk' ? 'selected' : ''}`}
                onClick={() => { setType('masuk'); setCategory(''); setBudgetPosId(''); }}
              >
                ↑ Pemasukan
              </div>
              <div
                className={`type-option keluar ${type === 'keluar' ? 'selected' : ''}`}
                onClick={() => { setType('keluar'); setCategory(''); }}
              >
                ↓ Pengeluaran
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Jumlah (Rp) *</label>
                <input
                  className="form-input"
                  type="text"
                  inputMode="numeric"
                  placeholder="0"
                  value={amountDisplay}
                  onChange={handleAmountChange}
                  required
                  autoComplete="off"
                />
                {amountDisplay && (
                  <span style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                    Rp {amountDisplay}
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
            </div>

            <div className="form-group">
              <label className="form-label">Kategori *</label>
              <select
                className="form-select"
                value={category}
                onChange={e => setCategory(e.target.value)}
                required
              >
                <option value="">Pilih kategori...</option>
                {filteredCats.map(c => (
                  <option key={c.id} value={c.name}>{c.name}</option>
                ))}
              </select>
            </div>

            {category === 'Pengeluaran' && (
              <div className="form-group">
                <label className="form-label">Sub-kategori</label>
                <select
                  className="form-select"
                  value={subCategory}
                  onChange={e => setSubCategory(e.target.value)}
                >
                  <option value="">Pilih sub-kategori...</option>
                  {SUB_CATEGORIES.map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
            )}

            {type === 'keluar' && budgetPosList.length > 0 && (
              <div className="form-group">
                <label className="form-label">Pos Anggaran</label>
                <select
                  className="form-select"
                  value={budgetPosId}
                  onChange={e => setBudgetPosId(e.target.value)}
                >
                  <option value="">Tidak ada / Umum</option>
                  {budgetPosList.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
            )}

            {type === 'keluar' && category === 'Tabungan' && goals.length > 0 && (
              <div className="form-group">
                <label className="form-label">Alokasikan ke Target Tabungan</label>
                <select
                  className="form-select"
                  value={goalId}
                  onChange={e => setGoalId(e.target.value)}
                >
                  <option value="">Tidak dialokasikan</option>
                  {goals.map(g => (
                    <option key={g.id} value={g.id}>{g.name}</option>
                  ))}
                </select>
                {goalId && (
                  <p className="text-xs text-muted" style={{ marginTop: 4 }}>
                    💡 Jumlah ini akan memotong saldo utama dan menambah progress goal
                  </p>
                )}
              </div>
            )}

            <div className="form-group">
              <label className="form-label">Keterangan</label>
              <input
                className="form-input"
                type="text"
                placeholder="Deskripsi transaksi..."
                value={note}
                onChange={e => setNote(e.target.value)}
              />
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-ghost" onClick={onClose}>Batal</button>
            <button type="submit" className="btn btn-primary">
              {existing ? 'Simpan' : 'Tambah Transaksi'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
