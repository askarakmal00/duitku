'use client';
import { useEffect, useState } from 'react';
import { Plus, ChevronDown, ChevronUp, Trash2 } from 'lucide-react';
import Header from '@/components/Header';
import DebtModal from '@/components/DebtModal';
import {
  getDebtParties, getDebtTransactions, addDebtParty, addDebtTransaction, updateDebtTransaction,
  deleteDebtTransaction, deleteDebtParty, getDebtBalance, getTotalDebt, addTransaction
} from '@/lib/store';
import { DebtParty, DebtTransaction } from '@/lib/types';
import { formatCurrency, formatDate } from '@/lib/helpers';

import { useDataRefresh } from '@/lib/useDataRefresh';
import { useCallback } from 'react';

export default function WalletPage() {
  const [parties, setParties] = useState<DebtParty[]>([]);
  const [debtTxns, setDebtTxns] = useState<DebtTransaction[]>([]);
  const [expanded, setExpanded] = useState<string[]>([]);
  const [showModal, setShowModal] = useState<'tambah' | 'bayar' | null>(null);
  const [defaultParty, setDefaultParty] = useState('');

  const load = useCallback(() => {
    setParties(getDebtParties());
    setDebtTxns(getDebtTransactions());
  }, []);
  useDataRefresh(load);

  const handleSave = async (partyName: string, amount: number, note: string, date: string) => {
    const party = await addDebtParty(partyName);
    const debtType = showModal === 'tambah' ? 'tambah' : 'bayar';
    const newDebtTxn = await addDebtTransaction({ partyId: party.id, type: debtType, amount, note, date });

    // Bayar hutang → potong saldo utama secara otomatis
    if (debtType === 'bayar') {
      const newTxn = await addTransaction({
        type: 'keluar',
        category: 'Hutang',
        debtTxnId: newDebtTxn.id,
        amount,
        note: note || `Bayar hutang ke ${partyName}`,
        date,
      });
      await updateDebtTransaction(newDebtTxn.id, { txnId: newTxn.id });
    }

    setShowModal(null);
    load();
  };

  const handleDeleteTxn = async (id: string) => {
    if (confirm('Hapus catatan ini?')) { await deleteDebtTransaction(id); load(); }
  };

  const handleDeleteParty = async (id: string) => {
    if (confirm('Hapus pihak ini dan semua catatannya?')) { await deleteDebtParty(id); load(); }
  };

  const toggleExpand = (id: string) => {
    setExpanded(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const totalDebt = getTotalDebt();

  return (
    <>
      <Header title="Hutang" subtitle="Kelola hutang ke berbagai pihak" />

      <div className="page-container">
        {/* Total Summary */}
        <div className="stats-row-3">
          <div className="card" style={{ padding: '16px 20px' }}>
            <p className="text-sm text-muted">Total Hutang</p>
            <p className="font-700 amount-negative" style={{ fontSize: 24, marginTop: 4 }}>
              {formatCurrency(totalDebt)}
            </p>
          </div>
          <div className="card" style={{ padding: '16px 20px' }}>
            <p className="text-sm text-muted">Jumlah Pihak</p>
            <p className="font-700" style={{ fontSize: 24, marginTop: 4, color: 'var(--text-primary)' }}>
              {parties.length}
            </p>
          </div>
          <div className="card" style={{ padding: '16px 20px' }}>
            <p className="text-sm text-muted">Pihak Lunas</p>
            <p className="font-700 amount-positive" style={{ fontSize: 24, marginTop: 4 }}>
              {parties.filter(p => getDebtBalance(p.id) <= 0).length}
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="debt-actions-row">
          <button className="btn btn-danger" onClick={() => { setDefaultParty(''); setShowModal('tambah'); }}>
            <Plus size={16} /> Catat Hutang
          </button>
          <button className="btn btn-primary" onClick={() => { setDefaultParty(''); setShowModal('bayar'); }}
            disabled={parties.length === 0}>
            ✓ Bayar Hutang
          </button>
        </div>

        {/* Party List */}
        {parties.length === 0 ? (
          <div className="card">
            <div className="empty-state">
              <div className="empty-state-icon"><span style={{ fontSize: 28 }}>🤝</span></div>
              <h3>Belum ada catatan hutang</h3>
              <p>Catat hutang ke berbagai pihak untuk memantau saldo</p>
              <button className="btn btn-primary" onClick={() => setShowModal('tambah')}>
                <Plus size={16} /> Catat Hutang Pertama
              </button>
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {parties.map(party => {
              const balance = getDebtBalance(party.id);
              const isExpanded = expanded.includes(party.id);
              const partyTxns = debtTxns.filter(t => t.partyId === party.id);
              let running = 0;

              return (
                <div key={party.id} className="debt-party-card">
                  <div className="debt-header">
                    <div>
                      <div className="debt-name">{party.name}</div>
                      <span className="text-xs text-muted">{partyTxns.length} catatan</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span className={`debt-balance ${balance <= 0 ? 'zero' : ''}`}>
                        {balance <= 0 ? '✓ Lunas' : formatCurrency(balance)}
                      </span>
                      <button
                        className="btn btn-secondary btn-sm"
                        onClick={() => { setDefaultParty(party.name); setShowModal('bayar'); }}
                        disabled={balance <= 0}
                      >
                        Bayar
                      </button>
                      <button className="btn btn-ghost btn-icon btn-sm" onClick={() => toggleExpand(party.id)}>
                        {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                      </button>
                      <button className="btn btn-danger btn-icon btn-sm" onClick={() => handleDeleteParty(party.id)}>
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="debt-history">
                      <p className="text-xs text-muted font-600" style={{ marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.8 }}>
                        Riwayat Transaksi
                      </p>
                      {[...partyTxns].reverse().map(txn => {
                        running += txn.type === 'tambah' ? txn.amount : -txn.amount;
                        return (
                          <div key={txn.id} className="debt-txn-item">
                            <span className="text-muted" style={{ fontSize: 12, minWidth: 80 }}>{formatDate(txn.date, 'short')}</span>
                            <span className={txn.type === 'tambah' ? 'amount-negative' : 'amount-positive'} style={{ fontWeight: 600, minWidth: 120 }}>
                              {txn.type === 'tambah' ? '+' : '-'}{formatCurrency(txn.amount)}
                            </span>
                            <span className="text-secondary" style={{ flex: 1, fontSize: 13 }}>{txn.note || '-'}</span>
                            <span className="font-600" style={{ minWidth: 100, textAlign: 'right', color: running <= 0 ? 'var(--success)' : 'var(--danger)' }}>
                              Sisa: {formatCurrency(running)}
                            </span>
                            <button className="btn btn-danger btn-icon btn-sm" onClick={() => handleDeleteTxn(txn.id)}>
                              <Trash2 size={12} />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {showModal && (
        <DebtModal
          mode={showModal}
          defaultParty={defaultParty}
          onSave={handleSave}
          onClose={() => { setShowModal(null); setDefaultParty(''); }}
        />
      )}
    </>
  );
}
