'use client';
import { useEffect, useState } from 'react';
import { Plus, ChevronDown, ChevronUp, Trash2, CreditCard, Users, CheckCircle2, ChevronLeft, ChevronRight, MoreVertical } from 'lucide-react';
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
  const [selectedPartyId, setSelectedPartyId] = useState<string | null>(null);
  const [activePartyMenu, setActivePartyMenu] = useState(false);

  const load = useCallback(() => {
    setParties(getDebtParties());
    setDebtTxns(getDebtTransactions());
  }, []);
  useDataRefresh(load);

  const handleSave = async (partyName: string, amount: number, note: string, date: string) => {
    const party = await addDebtParty(partyName);
    const debtType = showModal === 'tambah' ? 'tambah' : 'bayar';
    const newDebtTxn = await addDebtTransaction({ partyId: party.id, type: debtType, amount, note, date });

    if (debtType === 'tambah') {
      // Catat hutang (pinjam uang) → tambah ke saldo utama (uang masuk)
      const newTxn = await addTransaction({
        type: 'masuk',
        category: 'Hutang',
        debtTxnId: newDebtTxn.id,
        amount,
        note: note || `Hutang dari ${partyName}`,
        date,
      });
      await updateDebtTransaction(newDebtTxn.id, { txnId: newTxn.id });
    } else if (debtType === 'bayar') {
      // Bayar hutang → potong saldo utama secara otomatis (uang keluar)
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

  const selectedParty = parties.find(p => p.id === selectedPartyId);
  const selectedPartyTxns = selectedParty ? debtTxns.filter(t => t.partyId === selectedParty.id) : [];
  const selectedPartyBalance = selectedParty ? getDebtBalance(selectedParty.id) : 0;

  // Calculate chronological running balance for selected party
  const txnsWithRunning = (() => {
    if (!selectedParty) return [];
    const sorted = [...selectedPartyTxns].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    let current = 0;
    const withRun = sorted.map(t => {
      current += t.type === 'tambah' ? t.amount : -t.amount;
      return { ...t, running: current };
    });
    return withRun.reverse();
  })();

  return (
    <>
      {/* ─── MOBILE VIEW (Image 4) ─── */}
      <div className="mobile-only-view page-container" style={{ flexDirection: 'column', gap: 14 }}>
        {/* VIEW 1: DAFTAR PIHAK */}
        {!selectedParty && (
          <>
            <div className="mobile-page-header">
              <div className="mobile-page-title">Hutang</div>
            </div>

            {/* Total hutang card */}
            <div className="mobile-alert-card danger" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: 4 }}>
              <div className="mobile-alert-label">Total hutang</div>
              <div className="mobile-alert-val">{formatCurrency(totalDebt, true)}</div>
            </div>

            {/* Grid 2: Jumlah pihak & Pihak lunas */}
            <div className="mobile-grid-2">
              <div className="mobile-stat-card">
                <div className="mobile-stat-label">Jumlah pihak</div>
                <div className="mobile-stat-val">{parties.length}</div>
              </div>
              <div className="mobile-stat-card">
                <div className="mobile-stat-label">Pihak lunas</div>
                <div className="mobile-stat-val income">
                  {parties.filter(p => getDebtBalance(p.id) <= 0).length}
                </div>
              </div>
            </div>

            {/* Catat hutang button */}
            <button
              className="btn-catat-hutang"
              onClick={() => { setDefaultParty(''); setShowModal('tambah'); }}
            >
              + Catat hutang
            </button>

            {/* Daftar Pihak */}
            <div style={{ marginTop: 12 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 10 }}>
                DAFTAR PIHAK
              </div>

              {parties.length === 0 ? (
                <div className="empty-state" style={{ padding: '24px 0' }}>
                  <div className="empty-state-icon">🤝</div>
                  <h3>Belum ada catatan hutang</h3>
                  <p>Catat hutang ke pihak terkait untuk memantau saldo.</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {parties.map(party => {
                    const balance = getDebtBalance(party.id);
                    const partyTxns = debtTxns.filter(t => t.partyId === party.id);
                    const initial = party.name ? party.name[0].toUpperCase() : '?';

                    return (
                      <div
                        key={party.id}
                        className="mobile-party-card"
                        onClick={() => setSelectedPartyId(party.id)}
                      >
                        <div style={{ display: 'flex', alignItems: 'center' }}>
                          <div className="mobile-party-avatar">{initial}</div>
                          <div className="mobile-party-info">
                            <span className="mobile-party-name">{party.name}</span>
                            <span className="mobile-party-meta">
                              {partyTxns.length} catatan · {balance <= 0 ? 'Lunas' : formatCurrency(balance, true)}
                            </span>
                          </div>
                        </div>
                        <ChevronRight size={18} style={{ color: 'var(--text-muted)' }} />
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </>
        )}

        {/* VIEW 2: DETAIL PIHAK + RIWAYAT */}
        {selectedParty && (
          <>
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: 4 }}>
              <button
                onClick={() => setSelectedPartyId(null)}
                style={{ background: 'none', border: 'none', display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer', color: '#2563EB', fontWeight: 600, fontSize: 14, padding: '4px 0' }}
              >
                <ChevronLeft size={18} /> Kembali
              </button>
            </div>

            <div className="mobile-debt-detail-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'relative' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div className="mobile-party-avatar">
                    {selectedParty.name ? selectedParty.name[0].toUpperCase() : '?'}
                  </div>
                  <div>
                    <div style={{ fontSize: 17, fontWeight: 700 }}>{selectedParty.name}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{selectedPartyTxns.length} catatan</div>
                  </div>
                </div>

                <button
                  className="btn btn-ghost btn-icon btn-sm"
                  style={{ width: 32, height: 32, minHeight: 'unset', padding: 0 }}
                  onClick={() => setActivePartyMenu(v => !v)}
                  aria-label="Menu pihak"
                >
                  <MoreVertical size={16} />
                </button>

                {/* Dropdown Menu */}
                {activePartyMenu && (
                  <div style={{
                    position: 'absolute',
                    right: 0,
                    top: '100%',
                    marginTop: 4,
                    background: 'var(--card)',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-sm)',
                    boxShadow: 'var(--shadow-md)',
                    zIndex: 50,
                    minWidth: 140,
                    overflow: 'hidden',
                    display: 'flex',
                    flexDirection: 'column',
                  }}>
                    <button
                      style={{ padding: '10px 14px', border: 'none', background: 'none', textAlign: 'left', fontSize: 13, cursor: 'pointer', color: 'var(--danger)', fontWeight: 600 }}
                      onClick={() => {
                        handleDeleteParty(selectedParty.id);
                        setSelectedPartyId(null);
                        setActivePartyMenu(false);
                      }}
                    >
                      Hapus Pihak
                    </button>
                  </div>
                )}
              </div>

              <div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 2 }}>Sisa hutang</div>
                <div style={{ fontSize: 24, fontWeight: 800, color: selectedPartyBalance <= 0 ? '#15803D' : '#991B1B', letterSpacing: -0.5 }}>
                  {selectedPartyBalance <= 0 ? 'Lunas' : formatCurrency(selectedPartyBalance)}
                </div>
              </div>

              <div className="mobile-debt-actions">
                <button
                  className="btn-debt-bayar"
                  onClick={() => { setDefaultParty(selectedParty.name); setShowModal('bayar'); }}
                  disabled={selectedPartyBalance <= 0}
                >
                  Bayar
                </button>
                <button
                  className="btn-debt-tambah"
                  onClick={() => { setDefaultParty(selectedParty.name); setShowModal('tambah'); }}
                >
                  + Tambah
                </button>
              </div>
            </div>

            {/* Riwayat Transaksi */}
            <div style={{ marginTop: 20 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 10 }}>
                RIWAYAT TRANSAKSI
              </div>

              {txnsWithRunning.length === 0 ? (
                <div className="empty-state" style={{ padding: '20px 0' }}>
                  <p>Belum ada riwayat transaksi untuk pihak ini.</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  {txnsWithRunning.map(item => (
                    <div key={item.id} className="mobile-debt-history-item">
                      <div className={`mobile-debt-icon ${item.type}`}>
                        {item.type === 'tambah' ? '+' : '✓'}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>
                          {item.note || (item.type === 'tambah' ? 'Tambah hutang' : 'Pembayaran cicilan')}
                        </div>
                        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                          {formatDate(item.date, 'short')} · Sisa {formatCurrency(Math.max(0, item.running), true)}
                        </div>
                      </div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: item.type === 'tambah' ? '#B91C1C' : '#15803D' }}>
                        {item.type === 'tambah' ? '+' : '-'}{formatCurrency(item.amount, true)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* ─── DESKTOP VIEW ─── */}
      <div className="desktop-only-view">
        <Header title="Hutang" subtitle="Kelola hutang ke berbagai pihak" />

        <div className="page-container">
          {/* Unified Stat Card — Debt (rose accent) */}
          <div className="page-stat-card debt">
          <div className="psc-item">
            <div className="psc-header">
              <div className="psc-icon"><CreditCard size={16} /></div>
              <span className="psc-label">Total Hutang</span>
            </div>
            <div className="psc-value" style={{ color: 'var(--danger)' }}>{formatCurrency(totalDebt)}</div>
            <div className="psc-sub">Sisa hutang belum lunas</div>
          </div>

          <div className="psc-divider" />

          <div className="psc-item">
            <div className="psc-header">
              <div className="psc-icon"><Users size={16} /></div>
              <span className="psc-label">Jumlah Pihak</span>
            </div>
            <div className="psc-value">{parties.length}</div>
            <div className="psc-sub">Pihak terdaftar</div>
          </div>

          <div className="psc-divider" />

          <div className="psc-item">
            <div className="psc-header">
              <div className="psc-icon"><CheckCircle2 size={16} /></div>
              <span className="psc-label">Pihak Lunas</span>
            </div>
            <div className="psc-value" style={{ color: 'var(--success)' }}>
              {parties.filter(p => getDebtBalance(p.id) <= 0).length}
            </div>
            <div className="psc-sub">Sudah lunas</div>
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
