'use client';
import { useEffect, useState } from 'react';
import { Plus, ChevronDown, ChevronUp, Trash2, CreditCard, Users, CheckCircle2, ChevronLeft, ChevronRight, MoreVertical, ArrowDownCircle, ArrowUpCircle } from 'lucide-react';
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
import { useSpace } from '@/lib/useSpace';

export default function WalletPage() {
  const { activeSpace } = useSpace();
  const currentSpace = activeSpace || 'pribadi';

  const [parties, setParties] = useState<DebtParty[]>([]);
  const [debtTxns, setDebtTxns] = useState<DebtTransaction[]>([]);
  const [expanded, setExpanded] = useState<string[]>([]);
  const [showModal, setShowModal] = useState<'tambah' | 'bayar' | null>(null);
  const [defaultParty, setDefaultParty] = useState('');
  const [selectedPartyId, setSelectedPartyId] = useState<string | null>(null);
  const [activePartyMenu, setActivePartyMenu] = useState(false);

  const load = useCallback(() => {
    setParties(getDebtParties(activeSpace || undefined));
    setDebtTxns(getDebtTransactions(activeSpace || undefined));
  }, [activeSpace]);
  useDataRefresh(load);

  const handleSave = async (partyName: string, amount: number, note: string, date: string) => {
    const party = await addDebtParty(partyName, currentSpace);
    const debtType = showModal === 'tambah' ? 'tambah' : 'bayar';
    const newDebtTxn = await addDebtTransaction({
      partyId: party.id,
      type: debtType,
      amount,
      note,
      date,
      spaceId: currentSpace,
    });

    if (debtType === 'tambah') {
      // Catat hutang (pinjam uang) → tambah ke saldo utama (uang masuk)
      const newTxn = await addTransaction({
        type: 'masuk',
        category: 'Hutang',
        debtTxnId: newDebtTxn.id,
        amount,
        note: note || `Hutang dari ${partyName}`,
        date,
        spaceId: currentSpace,
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
        spaceId: currentSpace,
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

  const totalDebt = getTotalDebt(activeSpace || undefined);
  const paidCount = parties.filter(p => getDebtBalance(p.id, activeSpace || undefined) <= 0).length;

  const selectedParty = parties.find(p => p.id === selectedPartyId);
  const selectedPartyTxns = selectedParty ? debtTxns.filter(t => t.partyId === selectedParty.id) : [];
  const selectedPartyBalance = selectedParty ? getDebtBalance(selectedParty.id, activeSpace || undefined) : 0;

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
      <Header title="Hutang" subtitle="Kelola hutang ke berbagai pihak" />

      <div className="page-container">

        {/* ─── Stat Cards ─── */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
          gap: 12,
          marginBottom: 4,
        }}>
          {[
            {
              label: 'Total Hutang',
              value: formatCurrency(totalDebt),
              sub: 'Belum terlunasi',
              icon: <CreditCard size={16} />,
              color: totalDebt > 0 ? '#DC2626' : '#059669',
              bg: totalDebt > 0 ? '#FEF2F2' : '#ECFDF5',
            },
            {
              label: 'Jumlah Pihak',
              value: `${parties.length}`,
              sub: 'Pihak terdaftar',
              icon: <Users size={16} />,
              color: '#6366F1',
              bg: '#EEF2FF',
            },
            {
              label: 'Sudah Lunas',
              value: `${paidCount}`,
              sub: paidCount === parties.length && parties.length > 0 ? 'Semua lunas 🎉' : 'Pihak lunas',
              icon: <CheckCircle2 size={16} />,
              color: '#059669',
              bg: '#ECFDF5',
            },
          ].map((card, i) => (
            <div key={i} style={{
              background: 'var(--card)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border)',
              padding: '14px 16px',
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              boxShadow: 'var(--shadow)',
            }}>
              <div style={{
                width: 36, height: 36, borderRadius: 10,
                background: card.bg, color: card.color,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
              }}>
                {card.icon}
              </div>
              <div>
                <div style={{ fontSize: 11, color: 'var(--text-secondary)', fontWeight: 500, marginBottom: 2 }}>{card.label}</div>
                <div style={{ fontSize: 18, fontWeight: 800, color: card.color, lineHeight: 1.1 }}>{card.value}</div>
                <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2 }}>{card.sub}</div>
              </div>
            </div>
          ))}
        </div>

        {/* ─── Mobile: Party Detail View (drill-down) ─── */}
        {selectedParty && (
          <div className="wallet-mobile-detail">
            {/* Back button */}
            <button
              onClick={() => { setSelectedPartyId(null); setActivePartyMenu(false); }}
              style={{
                background: 'none', border: 'none', display: 'flex', alignItems: 'center',
                gap: 4, cursor: 'pointer', color: 'var(--primary)', fontWeight: 600,
                fontSize: 14, padding: '4px 0', marginBottom: 8,
              }}
            >
              <ChevronLeft size={18} /> Kembali ke Daftar
            </button>

            {/* Detail Card */}
            <div style={{
              background: 'var(--card)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border)',
              padding: '16px',
              boxShadow: 'var(--shadow)',
              marginBottom: 12,
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'relative', marginBottom: 14 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{
                    width: 44, height: 44, borderRadius: '50%',
                    background: 'linear-gradient(135deg, #6366F1, #8B5CF6)',
                    color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 18, fontWeight: 800, flexShrink: 0,
                  }}>
                    {selectedParty.name ? selectedParty.name[0].toUpperCase() : '?'}
                  </div>
                  <div>
                    <div style={{ fontSize: 17, fontWeight: 700, color: 'var(--text-primary)' }}>{selectedParty.name}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{selectedPartyTxns.length} catatan transaksi</div>
                  </div>
                </div>

                <button
                  className="btn btn-ghost btn-icon btn-sm"
                  onClick={() => setActivePartyMenu(v => !v)}
                  style={{ width: 32, height: 32, minHeight: 'unset', padding: 0 }}
                  aria-label="Menu pihak"
                >
                  <MoreVertical size={16} />
                </button>

                {/* Dropdown Menu */}
                {activePartyMenu && (
                  <div style={{
                    position: 'absolute', right: 0, top: '100%', marginTop: 4,
                    background: 'var(--card)', border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-sm)', boxShadow: 'var(--shadow-md)',
                    zIndex: 50, minWidth: 140, overflow: 'hidden', display: 'flex', flexDirection: 'column',
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

              <div style={{
                padding: '12px 14px',
                borderRadius: 10,
                background: selectedPartyBalance <= 0 ? '#ECFDF5' : '#FEF2F2',
                marginBottom: 14,
              }}>
                <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 2 }}>Sisa hutang</div>
                <div style={{ fontSize: 26, fontWeight: 800, color: selectedPartyBalance <= 0 ? '#15803D' : '#991B1B', letterSpacing: -0.5 }}>
                  {selectedPartyBalance <= 0 ? '✓ Lunas' : formatCurrency(selectedPartyBalance)}
                </div>
              </div>

              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  className="btn btn-secondary"
                  onClick={() => { setDefaultParty(selectedParty.name); setShowModal('bayar'); }}
                  disabled={selectedPartyBalance <= 0}
                  style={{ flex: 1 }}
                >
                  ✓ Bayar
                </button>
                <button
                  className="btn btn-danger"
                  onClick={() => { setDefaultParty(selectedParty.name); setShowModal('tambah'); }}
                  style={{ flex: 1 }}
                >
                  + Tambah
                </button>
              </div>
            </div>

            {/* Transaction History */}
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 8 }}>
              Riwayat Transaksi
            </div>
            {txnsWithRunning.length === 0 ? (
              <div className="empty-state" style={{ padding: '20px 0' }}>
                <p>Belum ada riwayat transaksi.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {txnsWithRunning.map(item => (
                  <div key={item.id} style={{
                    background: 'var(--card)',
                    borderRadius: 10,
                    border: '1px solid var(--border)',
                    padding: '12px 14px',
                    display: 'flex', alignItems: 'center', gap: 12,
                  }}>
                    <div style={{
                      width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
                      background: item.type === 'tambah' ? '#FEF2F2' : '#ECFDF5',
                      color: item.type === 'tambah' ? '#DC2626' : '#059669',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      {item.type === 'tambah' ? <ArrowDownCircle size={16} /> : <ArrowUpCircle size={16} />}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>
                        {item.note || (item.type === 'tambah' ? 'Tambah hutang' : 'Pembayaran')}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
                        {formatDate(item.date, 'short')} · Sisa {formatCurrency(Math.max(0, item.running), true)}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: 14, fontWeight: 700, color: item.type === 'tambah' ? '#B91C1C' : '#15803D' }}>
                        {item.type === 'tambah' ? '+' : '-'}{formatCurrency(item.amount, true)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ─── Party List (Mobile: drill-down card / Desktop: expandable accordion) ─── */}
        {!selectedParty && (
          <>
            {/* Action Row */}
            <div style={{ display: 'flex', gap: 10, alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)' }}>
                Daftar Pihak ({parties.length})
              </span>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn btn-danger btn-sm" onClick={() => { setDefaultParty(''); setShowModal('tambah'); }}>
                  <Plus size={14} /> Catat Hutang
                </button>
                <button
                  className="btn btn-primary btn-sm"
                  onClick={() => { setDefaultParty(''); setShowModal('bayar'); }}
                  disabled={parties.length === 0}
                >
                  ✓ Bayar Hutang
                </button>
              </div>
            </div>

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
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {parties.map(party => {
                  const balance = getDebtBalance(party.id, activeSpace || undefined);
                  const isExpanded = expanded.includes(party.id);
                  const partyTxns = debtTxns.filter(t => t.partyId === party.id);
                  const initial = party.name ? party.name[0].toUpperCase() : '?';
                  let running = 0;

                  return (
                    <div key={party.id} style={{
                      background: 'var(--card)',
                      borderRadius: 'var(--radius-md)',
                      border: `1px solid ${balance <= 0 ? '#A7F3D0' : 'var(--border)'}`,
                      boxShadow: 'var(--shadow)',
                      overflow: 'hidden',
                    }}>
                      {/* Party Row */}
                      <div style={{
                        display: 'flex', alignItems: 'center', gap: 12,
                        padding: '14px 16px',
                        cursor: 'pointer',
                      }}
                        onClick={() => {
                          // On mobile: navigate to detail view. On desktop: toggle expand
                          if (window.innerWidth < 640) {
                            setSelectedPartyId(party.id);
                          } else {
                            toggleExpand(party.id);
                          }
                        }}
                      >
                        {/* Avatar */}
                        <div style={{
                          width: 40, height: 40, borderRadius: '50%', flexShrink: 0,
                          background: balance <= 0
                            ? 'linear-gradient(135deg, #10B981, #34D399)'
                            : 'linear-gradient(135deg, #6366F1, #8B5CF6)',
                          color: '#fff',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 16, fontWeight: 800,
                        }}>
                          {initial}
                        </div>

                        {/* Info */}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>{party.name}</span>
                            {balance <= 0 && (
                              <span style={{
                                fontSize: 10, fontWeight: 700, color: '#059669',
                                background: '#ECFDF5', padding: '2px 6px', borderRadius: 99,
                              }}>✓ LUNAS</span>
                            )}
                          </div>
                          <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                            {partyTxns.length} catatan
                          </div>
                        </div>

                        {/* Balance + Actions */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{
                            fontSize: 15, fontWeight: 800,
                            color: balance <= 0 ? '#059669' : '#DC2626',
                          }}>
                            {balance <= 0 ? 'Lunas' : formatCurrency(balance)}
                          </span>
                          <button
                            className="btn btn-secondary btn-sm"
                            onClick={(e) => { e.stopPropagation(); setDefaultParty(party.name); setShowModal('bayar'); }}
                            disabled={balance <= 0}
                          >
                            Bayar
                          </button>
                          <button
                            className="btn btn-ghost btn-icon btn-sm desktop-only"
                            onClick={(e) => { e.stopPropagation(); toggleExpand(party.id); }}
                          >
                            {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                          </button>
                          <button
                            className="btn btn-ghost btn-icon btn-sm desktop-only"
                            onClick={(e) => { e.stopPropagation(); handleDeleteParty(party.id); }}
                            style={{ color: 'var(--danger)' }}
                          >
                            <Trash2 size={14} />
                          </button>
                          {/* Mobile: chevron right */}
                          <ChevronRight size={16} className="mobile-only" style={{ color: 'var(--text-secondary)' }} />
                        </div>
                      </div>

                      {/* Expanded Transaction History (Desktop only) */}
                      {isExpanded && (
                        <div style={{
                          borderTop: '1px solid var(--border)',
                          padding: '12px 16px',
                          background: 'var(--bg-secondary)',
                        }}>
                          <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 10 }}>
                            Riwayat Transaksi
                          </p>
                          {[...partyTxns].reverse().map(txn => {
                            running += txn.type === 'tambah' ? txn.amount : -txn.amount;
                            return (
                              <div key={txn.id} style={{
                                display: 'flex', alignItems: 'center', gap: 12,
                                padding: '8px 0',
                                borderBottom: '1px solid var(--border)',
                              }}>
                                <span style={{ fontSize: 12, color: 'var(--text-secondary)', minWidth: 80 }}>{formatDate(txn.date, 'short')}</span>
                                <span style={{ fontSize: 13, fontWeight: 700, minWidth: 120, color: txn.type === 'tambah' ? '#B91C1C' : '#15803D' }}>
                                  {txn.type === 'tambah' ? '+' : '-'}{formatCurrency(txn.amount)}
                                </span>
                                <span style={{ flex: 1, fontSize: 13, color: 'var(--text-secondary)' }}>{txn.note || '-'}</span>
                                <span style={{ fontSize: 13, fontWeight: 700, minWidth: 100, textAlign: 'right', color: running <= 0 ? 'var(--success)' : 'var(--danger)' }}>
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
          </>
        )}
      </div>

      {/* ─── Responsive helpers ─── */}
      <style>{`
        .wallet-mobile-detail { display: none; }
        .desktop-only { display: flex !important; }
        .mobile-only { display: none !important; }
        @media (max-width: 640px) {
          .wallet-mobile-detail { display: block; }
          .desktop-only { display: none !important; }
          .mobile-only { display: flex !important; }
        }
      `}</style>

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
