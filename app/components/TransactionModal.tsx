'use client';
import { useState, useEffect, useMemo } from 'react';
import { X, Check } from 'lucide-react';
import { Transaction, BudgetPos, SavingGoal, Category, FAMILY_INCOME_CATEGORIES, FAMILY_EXPENSE_CATEGORIES, DEFAULT_INCOME_CATEGORIES, DEFAULT_EXPENSE_CATEGORIES } from '@/lib/types';
import { getCategories, addCategory, getBudgetPos, getSavingGoals } from '@/lib/store';
import { toInputDate } from '@/lib/helpers';
import { useSpace } from '@/lib/useSpace';

interface TransactionModalProps {
  existing?: Transaction;
  onSave: (data: Omit<Transaction, 'id' | 'createdAt'>) => void;
  onClose: () => void;
}

export default function TransactionModal({ existing, onSave, onClose }: TransactionModalProps) {
  const { activeSpace } = useSpace();
  const space = existing?.spaceId || activeSpace || 'pribadi';
  const isFamily = space === 'keluarga';

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
  const [showAddCat, setShowAddCat] = useState(false);
  const [inlineCatName, setInlineCatName] = useState('');

  const loadData = () => {
    setCategories(getCategories());
    setBudgetPosList(getBudgetPos(space));
    setGoals(getSavingGoals(space));
  };

  useEffect(() => {
    loadData();
    const handleDataChanged = () => loadData();
    window.addEventListener('pf_data_changed', handleDataChanged);
    return () => window.removeEventListener('pf_data_changed', handleDataChanged);
  }, [space]);

  // Merge default categories with all user-created categories so nothing is ever missed
  const categoryOptions = useMemo(() => {
    const baseCats = isFamily
      ? (type === 'masuk' ? FAMILY_INCOME_CATEGORIES : FAMILY_EXPENSE_CATEGORIES)
      : (type === 'masuk' ? DEFAULT_INCOME_CATEGORIES : DEFAULT_EXPENSE_CATEGORIES);

    const storeCats = categories
      .filter(c => c.type === type || c.type === 'both')
      .map(c => c.name);

    const existingCat = existing?.category ? [existing.category] : [];

    return Array.from(new Set([...baseCats, ...storeCats, ...existingCat]));
  }, [isFamily, type, categories, existing]);

  const handleCreateInlineCat = async () => {
    const trimmed = inlineCatName.trim();
    if (!trimmed) return;
    const created = await addCategory({ name: trimmed, type });
    setCategories(getCategories());
    setCategory(created.name);
    setInlineCatName('');
    setShowAddCat(false);
  };

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
      spaceId: space,
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
            {existing ? 'Edit Transaksi' : 'Tambah Transaksi'} ({isFamily ? 'Keluarga' : 'Pribadi'})
          </span>
          <button className="modal-close" onClick={onClose}><X size={16} /></button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {/* Ruang Transaksi Indicator (Non-interactive) */}
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '9px 12px', borderRadius: 10, marginBottom: 14,
              background: isFamily ? '#ECFDF5' : '#F1F5F9',
              border: isFamily ? '1px solid #A7F3D0' : '1px solid #E2E8F0'
            }}>
              <span style={{ fontSize: 12, fontWeight: 500, color: '#64748B' }}>Ruang Transaksi:</span>
              <span style={{ fontSize: 12.5, fontWeight: 700, color: isFamily ? '#065F46' : '#1E293B' }}>
                {isFamily ? '🏠 Keluarga (Kas Bersama)' : '👤 Pribadi (Asykar)'}
              </span>
            </div>

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
                  <div style={{ marginTop: 10, background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 10, padding: '10px 12px' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer', color: '#0F172A' }}>
                      <input
                        type="checkbox"
                        checked={reimbursed}
                        onChange={e => setReimbursed(e.target.checked)}
                        style={{ width: 16, height: 16, cursor: 'pointer' }}
                      />
                      <span>Sudah diganti dari Kas Bersama (Reimbursed)</span>
                    </label>
                    <div style={{ fontSize: 11.5, color: '#64748B', marginTop: 4, marginLeft: 24, lineHeight: 1.4 }}>
                      {reimbursed
                        ? '✓ Saldo Kas Bersama langsung dipotong untuk mengganti talangan ini.'
                        : '⏳ Saldo Kas Bersama belum dipotong. Transaksi akan tercatat sebagai talangan aktif yang bisa diganti nanti via dashboard.'}
                    </div>
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
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <label className="form-label" style={{ margin: 0 }}>Kategori *</label>
                <button
                  type="button"
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--primary)',
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: 'pointer',
                    padding: 0,
                  }}
                  onClick={() => setShowAddCat(v => !v)}
                >
                  {showAddCat ? 'Batal' : '+ Kategori Baru'}
                </button>
              </div>

              {showAddCat && (
                <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
                  <input
                    type="text"
                    className="form-input"
                    placeholder={`Nama kategori ${type === 'masuk' ? 'pemasukan' : 'pengeluaran'} baru...`}
                    value={inlineCatName}
                    onChange={e => setInlineCatName(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleCreateInlineCat();
                      }
                    }}
                    autoFocus
                  />
                  <button
                    type="button"
                    className="btn btn-primary"
                    style={{ whiteSpace: 'nowrap', padding: '0 14px', fontSize: 13 }}
                    onClick={handleCreateInlineCat}
                  >
                    Simpan
                  </button>
                </div>
              )}

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
