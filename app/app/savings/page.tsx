'use client';
import { useState, useCallback, useMemo } from 'react';
import {
  PiggyBank, Plus, ArrowUpRight, ArrowDownLeft,
  Coins, MoreVertical, Pencil, Trash2, Filter, Wallet, Sparkles
} from 'lucide-react';
import Header from '@/components/Header';
import GoalModal from '@/components/GoalModal';
import GoalDepositModal from '@/components/GoalDepositModal';
import GoalWithdrawModal from '@/components/GoalWithdrawModal';
import {
  getSavingGoals, addSavingGoal, updateSavingGoal, deleteSavingGoal,
  getGoalProgress, addTransaction, getSavingsTransactions, getTransactions
} from '@/lib/store';
import { SavingGoal, Transaction } from '@/lib/types';
import { formatCurrency, formatDate, getCurrentMonth } from '@/lib/helpers';
import { useDataRefresh } from '@/lib/useDataRefresh';
import { useSpace } from '@/lib/useSpace';

export default function SavingsPage() {
  const { activeSpace } = useSpace();
  const currentSpace = activeSpace || 'keluarga';

  const [goals, setGoals] = useState<SavingGoal[]>([]);
  const [savingsTxns, setSavingsTxns] = useState<Transaction[]>([]);
  const [allTxns, setAllTxns] = useState<Transaction[]>([]);
  const [selectedGoalFilter, setSelectedGoalFilter] = useState<string>('all');
  
  const [showModal, setShowModal] = useState(false);
  const [editTarget, setEditTarget] = useState<SavingGoal | undefined>();
  const [depositGoal, setDepositGoal] = useState<SavingGoal | null>(null);
  const [withdrawGoal, setWithdrawGoal] = useState<SavingGoal | null>(null);
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);

  const load = useCallback(() => {
    const loadedGoals = getSavingGoals(currentSpace);
    setGoals(loadedGoals);
    setSavingsTxns(getSavingsTransactions(undefined, currentSpace));
    setAllTxns(getTransactions(currentSpace));
  }, [currentSpace]);

  useDataRefresh(load);

  // Financial metrics — Total Saldo Akumulasi Seluruh Kantong Tabungan
  const totalBalance = useMemo(() => {
    return goals.reduce((s, g) => s + Math.max(0, getGoalProgress(g.id, currentSpace)), 0);
  }, [goals, currentSpace]);

  // Monthly savings activity
  const { year, month } = getCurrentMonth();
  const monthPrefix = `${year}-${String(month).padStart(2, '0')}`;
  
  const monthlyStats = useMemo(() => {
    const monthTxns = allTxns.filter(t => 
      (t.date || '').startsWith(monthPrefix) && (t.category === 'Tabungan' || Boolean(t.goalId))
    );
    
    // type 'keluar' = uang dari kas bersama masuk ke tabungan (setor)
    const deposits = monthTxns.filter(t => t.type === 'keluar').reduce((sum, t) => sum + t.amount, 0);
    // type 'masuk' = uang dari tabungan kembali ke kas bersama (tarik)
    const withdrawals = monthTxns.filter(t => t.type === 'masuk').reduce((sum, t) => sum + t.amount, 0);
    
    return { deposits, withdrawals, net: deposits - withdrawals };
  }, [allTxns, monthPrefix]);

  const handleSaveGoal = async (data: Omit<SavingGoal, 'id' | 'createdAt'>) => {
    if (editTarget) {
      await updateSavingGoal(editTarget.id, { ...data, spaceId: editTarget.spaceId || currentSpace });
    } else {
      await addSavingGoal({ ...data, spaceId: currentSpace });
    }
    setShowModal(false);
    setEditTarget(undefined);
    load();
  };

  const handleEdit = (g: SavingGoal) => {
    setEditTarget(g);
    setShowModal(true);
    setActiveMenuId(null);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Hapus kantong tabungan ini? Riwayat mutasi tetap tercatat di pembukuan.')) {
      await deleteSavingGoal(id);
      load();
    }
    setActiveMenuId(null);
  };

  const handleDeposit = async (amount: number, note: string, date: string) => {
    if (!depositGoal) return;
    await addTransaction({
      type: 'keluar',
      category: 'Tabungan',
      goalId: depositGoal.id,
      amount,
      note,
      date,
      spaceId: currentSpace,
    });
    setDepositGoal(null);
    load();
  };

  const handleWithdraw = async (amount: number, note: string, date: string) => {
    if (!withdrawGoal) return;
    await addTransaction({
      type: 'masuk',
      category: 'Tabungan',
      goalId: withdrawGoal.id,
      amount,
      note,
      date,
      spaceId: currentSpace,
    });
    setWithdrawGoal(null);
    load();
  };

  const filteredTxns = useMemo(() => {
    if (selectedGoalFilter === 'all') return savingsTxns;
    return savingsTxns.filter(t => t.goalId === selectedGoalFilter);
  }, [savingsTxns, selectedGoalFilter]);

  const goalNameMap = useMemo(() => {
    const map = new Map<string, string>();
    goals.forEach(g => map.set(g.id, g.name));
    return map;
  }, [goals]);

  return (
    <>
      <Header
        title="Tabungan Keluarga"
        subtitle="Simpan dan pisahkan dana keluarga ke dalam berbagai kantong tanpa batasan target"
      />

      <div className="page-container" style={{ display: 'flex', flexDirection: 'column', gap: 20, paddingBottom: 60 }}>
        {/* ─── STAT CARDS HERO (GRID 4) ─── */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
          gap: 14,
        }}>
          {/* Card 1: Total Tabungan */}
          <div style={{
            background: 'linear-gradient(135deg, #065F46 0%, #059669 60%, #10B981 100%)',
            borderRadius: 18,
            padding: '18px 20px',
            color: '#FFFFFF',
            boxShadow: '0 4px 16px rgba(5, 150, 105, 0.25)',
            position: 'relative',
            overflow: 'hidden',
          }}>
            <div style={{ position: 'absolute', top: -15, right: -15, width: 90, height: 90, borderRadius: '50%', background: 'rgba(255,255,255,0.08)' }} />
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <div style={{
                width: 32, height: 32, borderRadius: 8,
                background: 'rgba(255,255,255,0.2)',
                display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}>
                <PiggyBank size={18} color="#FFFFFF" />
              </div>
              <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase', opacity: 0.9 }}>
                Total Saldo Tabungan
              </span>
            </div>
            <div style={{ fontSize: 26, fontWeight: 800, letterSpacing: '-0.02em', lineHeight: 1.1 }}>
              {formatCurrency(totalBalance)}
            </div>
            <div style={{ fontSize: 11.5, opacity: 0.85, marginTop: 6 }}>
              {goals.length} kantong tabungan aktif
            </div>
          </div>

          {/* Card 2: Setoran Bulan Ini */}
          <div style={{
            background: 'var(--card)',
            borderRadius: 18,
            padding: '18px 20px',
            border: '1px solid var(--border)',
            boxShadow: 'var(--shadow)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <div style={{
                width: 32, height: 32, borderRadius: 8,
                background: '#ECFDF5', color: '#059669',
                display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}>
                <ArrowUpRight size={18} />
              </div>
              <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Setoran Bulan Ini
              </span>
            </div>
            <div style={{ fontSize: 22, fontWeight: 800, color: '#059669', lineHeight: 1.1 }}>
              +{formatCurrency(monthlyStats.deposits)}
            </div>
            <div style={{ fontSize: 11.5, color: 'var(--text-secondary)', marginTop: 6 }}>
              Uang disisihkan dari kas
            </div>
          </div>

          {/* Card 3: Penarikan Bulan Ini */}
          <div style={{
            background: 'var(--card)',
            borderRadius: 18,
            padding: '18px 20px',
            border: '1px solid var(--border)',
            boxShadow: 'var(--shadow)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <div style={{
                width: 32, height: 32, borderRadius: 8,
                background: '#FEF2F2', color: '#DC2626',
                display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}>
                <ArrowDownLeft size={18} />
              </div>
              <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Penarikan Bulan Ini
              </span>
            </div>
            <div style={{ fontSize: 22, fontWeight: 800, color: monthlyStats.withdrawals > 0 ? '#DC2626' : 'var(--text-primary)', lineHeight: 1.1 }}>
              -{formatCurrency(monthlyStats.withdrawals)}
            </div>
            <div style={{ fontSize: 11.5, color: 'var(--text-secondary)', marginTop: 6 }}>
              Kembali ke kas operasional
            </div>
          </div>

          {/* Card 4: Net Tabungan Bulan Ini */}
          <div style={{
            background: 'var(--card)',
            borderRadius: 18,
            padding: '18px 20px',
            border: '1px solid var(--border)',
            boxShadow: 'var(--shadow)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <div style={{
                width: 32, height: 32, borderRadius: 8,
                background: '#EEF2FF', color: '#6366F1',
                display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}>
                <Sparkles size={18} />
              </div>
              <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Arus Bersih Simpanan
              </span>
            </div>
            <div style={{
              fontSize: 22, fontWeight: 800,
              color: monthlyStats.net >= 0 ? '#4F46E5' : '#DC2626',
              lineHeight: 1.1
            }}>
              {monthlyStats.net >= 0 ? '+' : ''}{formatCurrency(monthlyStats.net)}
            </div>
            <div style={{ fontSize: 11.5, color: 'var(--text-secondary)', marginTop: 6 }}>
              {monthlyStats.net >= 0 ? 'Surplus tabungan bulan ini' : 'Penarikan lebih besar dari setoran'}
            </div>
          </div>
        </div>

        {/* ─── KANTONG TABUNGAN SECTION ─── */}
        <div>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 14
          }}>
            <div>
              <h2 style={{ fontSize: 16, fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                Kantong Tabungan ({goals.length})
              </h2>
              <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: '2px 0 0' }}>
                Alokasi pos simpanan keluarga bebas tanpa tekanan target
              </p>
            </div>
            <button
              onClick={() => { setEditTarget(undefined); setShowModal(true); }}
              className="btn btn-primary btn-sm"
              style={{ background: '#059669', borderColor: '#059669' }}
            >
              <Plus size={15} />
              <span>Tambah Kantong</span>
            </button>
          </div>

          {goals.length === 0 ? (
            <div className="card" style={{ padding: '36px 20px', textAlign: 'center' }}>
              <div style={{
                width: 56, height: 56, borderRadius: '50%',
                background: '#ECFDF5', color: '#059669',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 14px'
              }}>
                <PiggyBank size={28} />
              </div>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>
                Belum ada kantong tabungan
              </h3>
              <p style={{ fontSize: 13, color: 'var(--text-secondary)', maxWidth: 400, margin: '0 auto 16px' }}>
                Buat kantong seperti Dana Darurat, Tabungan Pendidikan, atau Uang Dingin untuk mulai memisahkan simpanan keluarga.
              </p>
              <button
                onClick={() => { setEditTarget(undefined); setShowModal(true); }}
                className="btn btn-primary"
                style={{ background: '#059669', borderColor: '#059669' }}
              >
                <Plus size={15} /> Buat Kantong Pertama
              </button>
            </div>
          ) : (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
              gap: 14,
            }}>
              {goals.map(goal => {
                const balance = getGoalProgress(goal.id, currentSpace);
                const pocketTxns = savingsTxns.filter(t => t.goalId === goal.id);

                return (
                  <div
                    key={goal.id}
                    style={{
                      background: 'var(--card)',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--border)',
                      padding: '18px 20px',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      boxShadow: 'var(--shadow)',
                      position: 'relative',
                    }}
                  >
                    <div>
                      {/* Pocket Header */}
                      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div style={{
                            width: 40, height: 40, borderRadius: 12,
                            background: '#ECFDF5', color: '#059669',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: 18, flexShrink: 0
                          }}>
                            💰
                          </div>
                          <div>
                            <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.2 }}>
                              {goal.name}
                            </div>
                            <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2 }}>
                              {pocketTxns.length} mutasi tercatat
                            </div>
                          </div>
                        </div>

                        {/* Pocket Menu */}
                        <div style={{ position: 'relative' }}>
                          <button
                            onClick={() => setActiveMenuId(activeMenuId === goal.id ? null : goal.id)}
                            className="btn btn-ghost btn-icon btn-sm"
                            aria-label="Menu"
                          >
                            <MoreVertical size={16} />
                          </button>
                          {activeMenuId === goal.id && (
                            <div style={{
                              position: 'absolute', right: 0, top: '100%',
                              background: 'var(--card)', border: '1px solid var(--border)',
                              borderRadius: 10, boxShadow: 'var(--shadow-md)',
                              zIndex: 20, minWidth: 130, overflow: 'hidden',
                            }}>
                              <button
                                onClick={() => handleEdit(goal)}
                                style={{
                                  width: '100%', padding: '9px 12px', border: 'none', background: 'none',
                                  textAlign: 'left', fontSize: 12.5, display: 'flex', alignItems: 'center', gap: 6,
                                  cursor: 'pointer', color: 'var(--text-primary)'
                                }}
                              >
                                <Pencil size={13} /> Edit Nama
                              </button>
                              <button
                                onClick={() => handleDelete(goal.id)}
                                style={{
                                  width: '100%', padding: '9px 12px', border: 'none', background: 'none',
                                  textAlign: 'left', fontSize: 12.5, display: 'flex', alignItems: 'center', gap: 6,
                                  cursor: 'pointer', color: 'var(--danger)'
                                }}
                              >
                                <Trash2 size={13} /> Hapus Kantong
                              </button>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Pocket Balance */}
                      <div style={{
                        background: '#F8FAFC',
                        borderRadius: 12,
                        padding: '12px 14px',
                        marginBottom: 14,
                        border: '1px solid #F1F5F9',
                      }}>
                        <div style={{ fontSize: 11, color: '#64748B', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                          Saldo Terkumpul
                        </div>
                        <div style={{ fontSize: 22, fontWeight: 800, color: '#0F172A', marginTop: 2 }}>
                          {formatCurrency(balance)}
                        </div>
                      </div>
                    </div>

                    {/* Pocket Actions */}
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button
                        onClick={() => setDepositGoal(goal)}
                        style={{
                          flex: 1,
                          padding: '9px 12px',
                          borderRadius: 8,
                          border: 'none',
                          background: '#059669',
                          color: '#FFFFFF',
                          fontSize: 12.5,
                          fontWeight: 700,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: 6,
                        }}
                      >
                        <ArrowUpRight size={14} /> Setor
                      </button>
                      <button
                        onClick={() => setWithdrawGoal(goal)}
                        disabled={balance <= 0}
                        style={{
                          flex: 1,
                          padding: '9px 12px',
                          borderRadius: 8,
                          border: '1px solid var(--border)',
                          background: balance <= 0 ? 'var(--bg-secondary)' : 'var(--card)',
                          color: balance <= 0 ? 'var(--text-secondary)' : '#DC2626',
                          fontSize: 12.5,
                          fontWeight: 700,
                          cursor: balance <= 0 ? 'not-allowed' : 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: 6,
                          opacity: balance <= 0 ? 0.6 : 1,
                        }}
                      >
                        <ArrowDownLeft size={14} /> Tarik
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ─── RIWAYAT MUTASI TABUNGAN ─── */}
        <div style={{
          background: 'var(--card)',
          border: '1px solid var(--border)',
          borderRadius: 18,
          padding: '20px 22px',
          boxShadow: 'var(--shadow)',
        }}>
          <div style={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
            marginBottom: 16
          }}>
            <div>
              <h2 style={{ fontSize: 15, fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                Riwayat Mutasi Tabungan
              </h2>
              <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: '2px 0 0' }}>
                Catatan setoran dan penarikan yang terhubung langsung dengan saldo Kas Bersama
              </p>
            </div>

            {/* Filter by Pocket */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Filter size={15} color="#64748B" />
              <select
                value={selectedGoalFilter}
                onChange={e => setSelectedGoalFilter(e.target.value)}
                style={{
                  padding: '7px 12px',
                  borderRadius: 8,
                  border: '1px solid var(--border)',
                  background: 'var(--card)',
                  fontSize: 12.5,
                  fontWeight: 600,
                  color: 'var(--text-primary)',
                  cursor: 'pointer'
                }}
              >
                <option value="all">Semua Kantong ({savingsTxns.length})</option>
                {goals.map(g => (
                  <option key={g.id} value={g.id}>{g.name}</option>
                ))}
              </select>
            </div>
          </div>

          {filteredTxns.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '36px 0', color: 'var(--text-secondary)' }}>
              <Coins size={32} style={{ marginBottom: 8, opacity: 0.5 }} />
              <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>Belum ada mutasi tabungan</div>
              <div style={{ fontSize: 12, marginTop: 4 }}>Klik tombol "Setor" pada kantong tabungan untuk mulai menabung</div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {filteredTxns.map(t => {
                const isDeposit = t.type === 'keluar'; // Keluar dari kas operasional masuk ke tabungan
                const pocketName = t.goalId ? goalNameMap.get(t.goalId) || 'Tabungan' : 'Tabungan Umum';

                return (
                  <div
                    key={t.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '12px 14px',
                      background: 'var(--bg-secondary)',
                      borderRadius: 12,
                      border: '1px solid var(--border)',
                      gap: 12
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0, flex: 1 }}>
                      <div style={{
                        width: 36,
                        height: 36,
                        borderRadius: 10,
                        background: isDeposit ? '#ECFDF5' : '#FEF2F2',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0
                      }}>
                        {isDeposit ? (
                          <ArrowUpRight size={18} color="#059669" />
                        ) : (
                          <ArrowDownLeft size={18} color="#DC2626" />
                        )}
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                          <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>
                            {t.note || (isDeposit ? `Setor ke ${pocketName}` : `Tarik dari ${pocketName}`)}
                          </span>
                          <span style={{
                            background: '#EEF2FF',
                            color: '#4F46E5',
                            fontSize: 10.5,
                            fontWeight: 700,
                            padding: '2px 8px',
                            borderRadius: 6,
                            flexShrink: 0
                          }}>
                            {pocketName}
                          </span>
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2 }}>
                          {formatDate(t.date)}
                        </div>
                      </div>
                    </div>

                    <div style={{
                      fontSize: 14,
                      fontWeight: 800,
                      color: isDeposit ? '#059669' : '#DC2626',
                      textAlign: 'right',
                      flexShrink: 0,
                    }}>
                      {isDeposit ? '+' : '-'}{formatCurrency(t.amount)}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ─── MODALS ─── */}
      {showModal && (
        <GoalModal
          existing={editTarget}
          onSave={handleSaveGoal}
          onClose={() => { setShowModal(false); setEditTarget(undefined); }}
        />
      )}

      {depositGoal && (
        <GoalDepositModal
          goal={depositGoal}
          onSave={handleDeposit}
          onClose={() => setDepositGoal(null)}
        />
      )}

      {withdrawGoal && (
        <GoalWithdrawModal
          goal={withdrawGoal}
          onSave={handleWithdraw}
          onClose={() => setWithdrawGoal(null)}
        />
      )}
    </>
  );
}
