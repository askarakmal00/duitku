'use client';
import { useState, useEffect } from 'react';
import { X, Check } from 'lucide-react';
import { Transaction, BudgetPos, SavingGoal, Category, FAMILY_INCOME_CATEGORIES, FAMILY_EXPENSE_CATEGORIES } from '@/lib/types';
import { getCategories, getBudgetPos, getSavingGoals } from '@/lib/store';
import { toInputDate } from '@/lib/helpers';
import { useSpace } from '@/lib/useSpace';

interface TransactionModalProps {
  existing?: Transaction;
  onSave: (data: Omit<Transaction, 'id' | 'createdAt'>) => void;
  onClose: () => void;
}

export default function TransactionModal({ existing, onSave, onClose }: TransactionModalProps) {
  const { activeSpace } = useSpace();
  const isFamily = activeSpace === 'keluarga';

  const [type, setType] = useState<'masuk' | 'keluar'>(existing?.type || 'keluar');
  const [category, setCategory] = useState(existing?.category || '');
  const [budgetPosId, setBudgetPosId] = useState(existing?.budgetPosId || '');
  const [goalId, setGoalId] = useState(existing?.goalId || '');
  const [amount, setAmount] = useState(existing?.amount?.toString() || '');
  const [amountDisplay, setAmountDisplay] = useState(
    existing?.amount ? new Intl.NumberFormat('id-ID').format(existing.amount) : ''
  );
  const [note, setNote] = useState(existing?.note || '');
  const [date, setDate] = useState(existing?.date || toInputDate());
  const [paidBy, setPaidBy] = useState<'asykar' | 'istri' | 'bersama'>(existing?.paidBy || 'bersama');
  const [reimbursed, setReimbursed] = useState<boolean>(existing?.reimbursed ?? false);

  const [categories, setCategories] = useState<Category[]>([]);
  const [budgetPosList, setBudgetPosList] = useState<BudgetPos[]>([]);
  const [goals, setGoals] = useState<SavingGoal[]>([]);

  useEffect(() => {
    setCategories(getCategories());
    setBudgetPosList(getBudgetPos(activeSpace || undefined));
    setGoals(getSavingGoals(activeSpace || undefined));
  }, [activeSpace]);

  // Use tailored categories for family space
  const categoryOptions = isFamily
    ? (type === 'masuk' ? FAMILY_INCOME_CATEGORIES : FAMILY_EXPENSE_CATEGORIES)
    : categories.filter(c => c.type === type || c.type === 'both').map(c => c.name);

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
    
    const dataToSave: any = {
      spaceId: activeSpace || 'pribadi',
      type,
      category,
      budgetPosId: budgetPosId || undefined,
      goalId: goalId || undefined,
      amount: numAmount,
      note,
      date,
    };

    if (isFamily) {
      dataToSave.paidBy = paidBy;
      if (paidBy !== 'bersama') {
        dataToSave.reimbursed = reimbursed;
      }
    }

    onSave(dataToSave);
  };

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <span className="modal-title">
            {existing ? 'Edit Transaksi' : 'Tambah Transaksi'} {isFamily ? '(Keluarga)' : ''}
          </span>
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

            {/* Family Space Paid By Selector */}
            {isFamily && (
              <div className="form-group">
                <label className="form-label">Sumber Dana / Pelaku Transaksi</label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                  <button
                    type="button"
                    className={`budget-btn ${paidBy === 'bersama' ? 'selected' : ''}`}
                    onClick={() => setPaidBy('bersama')}
                    style={{ textAlign: 'center', justifyContent: 'center' }}
                  >
                    <span>Kas Bersama</span>
                  </button>
                  <button
                    type="button"
                    className={`budget-btn ${paidBy === 'asykar' ? 'selected' : ''}`}
                    onClick={() => setPaidBy('asykar')}
                    style={{ textAlign: 'center', justifyContent: 'center' }}
                  >
                    <span>Talangan Asykar</span>
                  </button>
                  <button
                    type="button"
                    className={`budget-btn ${paidBy === 'istri' ? 'selected' : ''}`}
                    onClick={() => setPaidBy('istri')}
                    style={{ textAlign: 'center', justifyContent: 'center' }}
                  >
                    <span>Talangan Istri</span>
                  </button>
                </div>
                {paidBy !== 'bersama' && (
                  <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, cursor: 'pointer', color: 'var(--text-secondary)' }}>
                      <input
                        type="checkbox"
                        checked={reimbursed}
                        onChange={e => setReimbursed(e.target.checked)}
                      />
                      Sudah diganti dari Kas Bersama (Reimbursed)
                    </label>
                  </div>
                )}
              </div>
            )}

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
                {categoryOptions.map(catName => (
                  <option key={catName} value={catName}>{catName}</option>
                ))}
              </select>
            </div>

            {type === 'keluar' && (
              <div className="form-group">
                <label className="form-label">Pos Anggaran</label>
                <div className="budget-selector">
                  <button
                    type="button"
                    className={`budget-btn ${!budgetPosId ? 'selected' : ''}`}
                    onClick={() => setBudgetPosId('')}
                  >
                    {!budgetPosId && <Check size={14} className="budget-btn-check" />}
                    <span>Tanpa Anggaran / Umum</span>
                  </button>
                  {budgetPosList.map(p => (
                    <button
                      key={p.id}
                      type="button"
                      className={`budget-btn ${budgetPosId === p.id ? 'selected' : ''}`}
                      onClick={() => setBudgetPosId(p.id)}
                    >
                      {budgetPosId === p.id && <Check size={14} className="budget-btn-check" />}
                      <span>{p.name}</span>
                    </button>
                  ))}
                </div>
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
