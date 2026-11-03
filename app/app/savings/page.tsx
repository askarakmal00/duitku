'use client';
import { useState, useCallback, useMemo } from 'react';
import {
  PiggyBank, Target, Plus, TrendingUp, Coins,
  MoreVertical, ArrowUpRight, ArrowDownLeft, ShieldCheck,
  CheckCircle2, Filter
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
import { formatCurrency, formatDate, clamp, getCurrentMonth } from '@/lib/helpers';
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

  // Financial metrics
  const totalTarget = useMemo(() => goals.reduce((s, g) => s + g.targetAmount, 0), [goals]);
  const totalProgress = useMemo(() => goals.reduce((s, g) => s + getGoalProgress(g.id, currentSpace), 0), [goals, currentSpace]);
  const overallPct = totalTarget > 0 ? clamp((totalProgress / totalTarget) * 100, 0, 100) : 0;

  // Monthly savings allocation
  const { year, month } = getCurrentMonth();
  const monthPrefix = `${year}-${String(month).padStart(2, '0')}`;
  const thisMonthSavings = useMemo(() => {
    return allTxns
      .filter(t => (t.date || '').startsWith(monthPrefix) && (t.category === 'Tabungan' || Boolean(t.goalId)))
      .reduce((sum, t) => sum + (t.type === 'keluar' ? t.amount : -t.amount), 0);
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
  };

  const handleDelete = async (id: string) => {
    if (confirm('Hapus pos tabungan ini? Riwayat mutasi tetap aman di pembukuan.')) {
      await deleteSavingGoal(id);
      load();
    }
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
        subtitle="Kelola kantong tabungan impian, alokasi dana, dan mutasi simpanan keluarga"
      />

      <div className="page-container" style={{ display: 'flex', flexDirection: 'column', gap: 24, paddingBottom: 60 }}>
        {/* ─── STAT CARDS HERO (GRID 4) ─── */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: 16
        }}>
          {/* Card 1: Total Tabungan Terkumpul */}
          <div style={{
            background: 'linear-gradient(135deg, #059669 0%, #10B981 100%)',
            color: '#FFFFFF',
            borderRadius: 20,
            padding: '20px 22px',
            boxShadow: '0 8px 20px rgba(16, 185, 129, 0.22)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            position: 'relative',
            overflow: 'hidden'
          }}>
            <div style={{ position: 'absolute', right: -15, bottom: -15, opacity: 0.15, pointerEvents: 'none' }}>
              <PiggyBank size={110} />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <div style={{ background: 'rgba(255, 255, 255, 0.2)', padding: 6, borderRadius: 10 }}>
                <PiggyBank size={18} color="#FFFFFF" />
              </div>
              <span style={{ fontSize: 13, fontWeight: 600, color: '#D1FAE5' }}>Total Tabungan Tersimpan</span>
            </div>
            <div>
              <div style={{ fontSize: 24, fontWeight: 800, letterSpacing: '-0.5px' }}>
                {formatCurrency(totalProgress)}
              </div>
              <div style={{ fontSize: 11, color: '#A7F3D0', marginTop: 4 }}>
                Dari {goals.length} pos tabungan aktif
              </div>
            </div>
          </div>

          {/* Card 2: Total Target */}
          <div style={{
            background: '#FFFFFF',
            border: '1px solid #E2E8F0',
            borderRadius: 20,
            padding: '20px 22px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <div style={{ background: '#EEF2FF', padding: 6, borderRadius: 10 }}>
                <Target size={18} color="#4F46E5" />
              </div>
              <span style={{ fontSize: 13, fontWeight: 600, color: '#64748B' }}>Total Target Tabungan</span>
            </div>
            <div>
              <div style={{ fontSize: 22, fontWeight: 800, color: '#0F172A', letterSpacing: '-0.5px' }}>
                {formatCurrency(totalTarget)}
              </div>
              <div style={{ fontSize: 11, color: '#94A3B8', marginTop: 4 }}>
                Sisa butuh: {formatCurrency(Math.max(0, totalTarget - totalProgress))}
              </div>
            </div>
          </div>

          {/* Card 3: Pencapaian Keseluruhan */}
          <div style={{
            background: '#FFFFFF',
            border: '1px solid #E2E8F0',
            borderRadius: 20,
            padding: '20px 22px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <div style={{ background: '#FAF5FF', padding: 6, borderRadius: 10 }}>
                <TrendingUp size={18} color="#9333EA" />
              </div>
              <span style={{ fontSize: 13, fontWeight: 600, color: '#64748B' }}>Progress Keseluruhan</span>
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                <span style={{ fontSize: 24, fontWeight: 800, color: '#9333EA' }}>{overallPct.toFixed(1)}%</span>
                <span style={{ fontSize: 12, color: '#94A3B8' }}>tercapai</span>
              </div>
              <div style={{ height: 6, background: '#F1F5F9', borderRadius: 9999, overflow: 'hidden', marginTop: 8 }}>
                <div style={{ height: '100%', width: `${overallPct}%`, background: 'linear-gradient(90deg, #9333EA 0%, #C084FC 100%)', borderRadius: 9999 }} />
              </div>
            </div>
          </div>

          {/* Card 4: Setoran Bulan Ini */}
          <div style={{
            background: '#FFFFFF',
            border: '1px solid #E2E8F0',
            borderRadius: 20,
            padding: '20px 22px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <div style={{ background: '#F0FDF4', padding: 6, borderRadius: 10 }}>
                <Coins size={18} color="#16A34A" />
              </div>
              <span style={{ fontSize: 13, fontWeight: 600, color: '#64748B' }}>Setoran Bulan Ini</span>
            </div>
            <div>
              <div style={{ fontSize: 22, fontWeight: 800, color: '#16A34A', letterSpacing: '-0.5px' }}>
                {formatCurrency(thisMonthSavings)}
              </div>
              <div style={{ fontSize: 11, color: '#94A3B8', marginTop: 4 }}>
                Masuk ke pos tabungan
              </div>
            </div>
          </div>
        </div>

        {/* ─── SECTION 1: POS / KANTONG TABUNGAN ─── */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div>
              <h2 style={{ fontSize: 18, fontWeight: 700, color: '#0F172A', margin: 0 }}>Pos Tabungan Keluarga</h2>
              <p style={{ fontSize: 12, color: '#64748B', margin: '4px 0 0 0' }}>Alokasi simpanan untuk kebutuhan dan impian masa depan</p>
            </div>
            <button
              onClick={() => { setEditTarget(undefined); setShowModal(true); }}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                background: '#4F46E5',
                color: '#FFFFFF',
                border: 'none',
                borderRadius: 12,
                padding: '10px 16px',
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
                boxShadow: '0 4px 12px rgba(79, 70, 229, 0.25)'
              }}
            >
              <Plus size={16} /> Buka Pos Tabungan
            </button>
          </div>

          {goals.length === 0 ? (
            <div style={{
              background: '#FFFFFF',
              border: '2px dashed #CBD5E1',
              borderRadius: 20,
              padding: '48px 24px',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: 42, marginBottom: 12 }}>🏦</div>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: '#0F172A', marginBottom: 6 }}>Belum Ada Pos Tabungan</h3>
              <p style={{ fontSize: 13, color: '#64748B', maxWidth: 400, margin: '0 auto 18px' }}>
                Buat pos tabungan baru seperti <b>Dana Darurat</b>, <b>Pendidikan Anak</b>, atau <b>Liburan Keluarga</b> untuk mulai mengalokasikan tabungan.
              </p>
              <button
                onClick={() => { setEditTarget(undefined); setShowModal(true); }}
                style={{
                  background: '#4F46E5',
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: 12,
                  padding: '10px 20px',
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                + Buka Pos Pertama
              </button>
            </div>
          ) : (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
              gap: 16
            }}>
              {goals.map(goal => {
                const progress = getGoalProgress(goal.id, currentSpace);
                const pct = clamp((progress / goal.targetAmount) * 100, 0, 100);
                const remaining = Math.max(0, goal.targetAmount - progress);
                const isComplete = progress >= goal.targetAmount;

                return (
                  <div
                    key={goal.id}
                    style={{
                      background: '#FFFFFF',
                      border: isComplete ? '1px solid #A7F3D0' : '1px solid #E2E8F0',
                      borderRadius: 20,
                      padding: 20,
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      position: 'relative',
                      boxShadow: isComplete ? '0 4px 14px rgba(16, 185, 129, 0.08)' : 'none',
                      transition: 'transform 0.15s ease, box-shadow 0.15s ease'
                    }}
                  >
                    <div>
                      {/* Top Header of Card */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div style={{
                            width: 38,
                            height: 38,
                            borderRadius: 12,
                            background: isComplete ? '#ECFDF5' : '#EEF2FF',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}>
                            {isComplete ? (
                              <CheckCircle2 size={20} color="#059669" />
                            ) : (
                              <ShieldCheck size={20} color="#4F46E5" />
                            )}
                          </div>
                          <div>
                            <h3 style={{ fontSize: 15, fontWeight: 700, color: '#0F172A', margin: 0 }}>{goal.name}</h3>
                            <span style={{ fontSize: 11, color: isComplete ? '#059669' : '#64748B', fontWeight: 600 }}>
                              {isComplete ? 'Target Tercapai 🎉' : `${pct.toFixed(0)}% terkumpul`}
                            </span>
                          </div>
                        </div>

                        {/* Three Dots Menu */}
                        <div style={{ position: 'relative' }}>
                          <button
                            onClick={() => setActiveMenuId(activeMenuId === goal.id ? null : goal.id)}
                            style={{
                              background: 'transparent',
                              border: 'none',
                              color: '#94A3B8',
                              cursor: 'pointer',
                              padding: 4,
                              borderRadius: 6
                            }}
                          >
                            <MoreVertical size={16} />
                          </button>

                          {activeMenuId === goal.id && (
                            <div style={{
                              position: 'absolute',
                              right: 0,
                              top: '100%',
                              marginTop: 4,
                              background: '#FFFFFF',
                              border: '1px solid #E2E8F0',
                              borderRadius: 12,
                              boxShadow: '0 10px 25px rgba(0,0,0,0.1)',
                              zIndex: 50,
                              minWidth: 130,
                              overflow: 'hidden'
                            }}>
                              <button
                                onClick={() => { handleEdit(goal); setActiveMenuId(null); }}
                                style={{ width: '100%', padding: '10px 14px', border: 'none', background: 'none', textAlign: 'left', fontSize: 13, cursor: 'pointer', color: '#0F172A', display: 'flex', alignItems: 'center', gap: 8 }}
                              >
                                Edit Target
                              </button>
                              <button
                                onClick={() => { setWithdrawGoal(goal); setActiveMenuId(null); }}
                                style={{ width: '100%', padding: '10px 14px', border: 'none', background: 'none', textAlign: 'left', fontSize: 13, cursor: 'pointer', color: '#D97706', display: 'flex', alignItems: 'center', gap: 8 }}
                              >
                                Tarik Saldo
                              </button>
                              <div style={{ height: 1, background: '#F1F5F9' }} />
                              <button
                                onClick={() => { handleDelete(goal.id); setActiveMenuId(null); }}
                                style={{ width: '100%', padding: '10px 14px', border: 'none', background: 'none', textAlign: 'left', fontSize: 13, cursor: 'pointer', color: '#EF4444', display: 'flex', alignItems: 'center', gap: 8 }}
                              >
                                Hapus Pos
                              </button>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Amounts Display */}
                      <div style={{ marginBottom: 12 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 4 }}>
                          <span style={{ fontSize: 20, fontWeight: 800, color: '#0F172A' }}>{formatCurrency(progress)}</span>
                          <span style={{ fontSize: 12, color: '#64748B' }}>Target {formatCurrency(goal.targetAmount)}</span>
                        </div>
                        <div style={{ height: 8, background: '#F1F5F9', borderRadius: 9999, overflow: 'hidden' }}>
                          <div style={{
                            height: '100%',
                            width: `${pct}%`,
                            background: isComplete ? 'linear-gradient(90deg, #10B981, #059669)' : 'linear-gradient(90deg, #4F46E5, #818CF8)',
                            borderRadius: 9999
                          }} />
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#94A3B8', marginTop: 6 }}>
                          <span>{pct.toFixed(0)}%</span>
                          <span>{remaining > 0 ? `Kurang ${formatCurrency(remaining)}` : 'Selesai'}</span>
                        </div>
                      </div>
                    </div>

                    {/* Bottom Action Buttons */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 8 }}>
                      <button
                        onClick={() => setDepositGoal(goal)}
                        style={{
                          background: '#ECFDF5',
                          color: '#059669',
                          border: '1px solid #A7F3D0',
                          borderRadius: 10,
                          padding: '9px 12px',
                          fontSize: 12,
                          fontWeight: 700,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: 6
                        }}
                      >
                        <ArrowUpRight size={14} /> Setor
                      </button>
                      <button
                        onClick={() => setWithdrawGoal(goal)}
                        style={{
                          background: '#FFFBEB',
                          color: '#D97706',
                          border: '1px solid #FDE68A',
                          borderRadius: 10,
                          padding: '9px 12px',
                          fontSize: 12,
                          fontWeight: 700,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: 6
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

        {/* ─── SECTION 2: RIWAYAT MUTASI TABUNGAN ─── */}
        <div style={{
          background: '#FFFFFF',
          border: '1px solid #E2E8F0',
          borderRadius: 20,
          padding: '24px 20px',
        }}>
          <div style={{
            display: 'flex',
            flexWrap: 'wrap',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: 12,
            marginBottom: 20
          }}>
            <div>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: '#0F172A', margin: 0 }}>Riwayat Mutasi Tabungan</h3>
              <p style={{ fontSize: 12, color: '#64748B', margin: '4px 0 0 0' }}>Catatan arus masuk & keluar pos simpanan keluarga</p>
            </div>

            {/* Filter by Goal */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Filter size={15} color="#64748B" />
              <select
                value={selectedGoalFilter}
                onChange={e => setSelectedGoalFilter(e.target.value)}
                style={{
                  padding: '7px 12px',
                  borderRadius: 10,
                  border: '1px solid #CBD5E1',
                  background: '#F8FAFC',
                  fontSize: 12,
                  fontWeight: 600,
                  color: '#0F172A',
                  cursor: 'pointer'
                }}
              >
                <option value="all">Semua Pos Tabungan ({savingsTxns.length})</option>
                {goals.map(g => (
                  <option key={g.id} value={g.id}>{g.name}</option>
                ))}
              </select>
            </div>
          </div>

          {filteredTxns.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '36px 0', color: '#94A3B8' }}>
              <Coins size={32} style={{ marginBottom: 8, opacity: 0.6 }} />
              <div style={{ fontSize: 14, fontWeight: 600, color: '#475569' }}>Belum ada mutasi tabungan</div>
              <div style={{ fontSize: 12, marginTop: 4 }}>Klik tombol "Setor" pada pos tabungan untuk mulai menabung</div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {filteredTxns.map(t => {
                const isDeposit = t.type === 'keluar'; // Keluar dari kas operasional masuk ke tabungan
                const posName = t.goalId ? goalNameMap.get(t.goalId) || 'Tabungan' : 'Tabungan Umum';

                return (
                  <div
                    key={t.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '12px 14px',
                      background: '#F8FAFC',
                      borderRadius: 14,
                      border: '1px solid #F1F5F9',
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
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ fontSize: 13, fontWeight: 700, color: '#0F172A', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {t.note || (isDeposit ? `Setor ke ${posName}` : `Tarik dari ${posName}`)}
                          </span>
                          <span style={{
                            background: '#EEF2FF',
                            color: '#4F46E5',
                            fontSize: 10,
                            fontWeight: 700,
                            padding: '2px 8px',
                            borderRadius: 6,
                            flexShrink: 0
                          }}>
                            {posName}
                          </span>
                        </div>
                        <div style={{ fontSize: 11, color: '#94A3B8', marginTop: 2 }}>
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
                      fontVariantNumeric: 'tabular-nums'
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
