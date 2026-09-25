'use client';
import { useEffect, useState } from 'react';
import { Plus, Target, Coins, TrendingUp, MoreVertical } from 'lucide-react';
import Header from '@/components/Header';
import SavingGoalsList from '@/components/SavingGoalsList';
import GoalModal from '@/components/GoalModal';
import GoalDepositModal from '@/components/GoalDepositModal';
import GoalWithdrawModal from '@/components/GoalWithdrawModal';
import {
  getSavingGoals, addSavingGoal, updateSavingGoal, deleteSavingGoal,
  getGoalProgress, addTransaction
} from '@/lib/store';
import { SavingGoal } from '@/lib/types';
import { formatCurrency, clamp } from '@/lib/helpers';

import { useDataRefresh } from '@/lib/useDataRefresh';
import { useCallback } from 'react';

export default function GoalsPage() {
  const [goals, setGoals] = useState<SavingGoal[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editTarget, setEditTarget] = useState<SavingGoal | undefined>();
  const [depositGoal, setDepositGoal] = useState<SavingGoal | null>(null);
  const [withdrawGoal, setWithdrawGoal] = useState<SavingGoal | null>(null);
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);

  const load = useCallback(() => setGoals(getSavingGoals()), []);
  useDataRefresh(load);

  const handleSave = async (data: Omit<SavingGoal, 'id' | 'createdAt'>) => {
    if (editTarget) await updateSavingGoal(editTarget.id, data);
    else await addSavingGoal(data);
    setShowModal(false);
    setEditTarget(undefined);
    load();
  };

  const handleEdit = (g: SavingGoal) => { setEditTarget(g); setShowModal(true); };
  const handleDelete = async (id: string) => {
    if (confirm('Hapus target ini?')) { await deleteSavingGoal(id); load(); }
  };

  const handleDeposit = async (amount: number, note: string, date: string) => {
    if (!depositGoal) return;
    // Buat transaksi keluar → potong saldo utama + tambah progress goal
    await addTransaction({
      type: 'keluar',
      category: 'Tabungan',
      goalId: depositGoal.id,
      amount,
      note,
      date,
    });
    setDepositGoal(null);
    load();
  };

  const handleWithdraw = async (amount: number, note: string, date: string) => {
    if (!withdrawGoal) return;
    // Buat transaksi masuk → tambah saldo utama + kurangi progress goal
    await addTransaction({
      type: 'masuk',
      category: 'Tabungan',
      goalId: withdrawGoal.id,
      amount,
      note,
      date,
    });
    setWithdrawGoal(null);
    load();
  };

  const totalTarget = goals.reduce((s, g) => s + g.targetAmount, 0);
  const totalProgress = goals.reduce((s, g) => s + getGoalProgress(g.id), 0);
  const overallPct = totalTarget > 0 ? clamp((totalProgress / totalTarget) * 100, 0, 100) : 0;

  return (
    <>
      {/* ─── MOBILE VIEW (Image 3) ─── */}
      <div className="mobile-only-view page-container" style={{ flexDirection: 'column', gap: 14 }}>
        <div className="mobile-page-header">
          <div className="mobile-page-title">Target tabungan</div>
          <div className="mobile-page-subtitle">Pantau progress menuju tujuan keuangan</div>
        </div>

        {/* Grid 2: Total target & Terkumpul */}
        <div className="mobile-grid-2">
          <div className="mobile-stat-card">
            <div className="mobile-stat-label">Total target</div>
            <div className="mobile-stat-val">{formatCurrency(totalTarget, true)}</div>
            <div className="mobile-stat-sub">{goals.length} target aktif</div>
          </div>
          <div className="mobile-stat-card">
            <div className="mobile-stat-label">Terkumpul</div>
            <div className="mobile-stat-val income">{formatCurrency(totalProgress, true)}</div>
            <div className="mobile-stat-sub">
              {totalTarget > 0 ? ((totalProgress / totalTarget) * 100).toFixed(0) : 0}% dari target
            </div>
          </div>
        </div>

        {/* Section: Target saya */}
        <div className="mobile-sec-header">
          <span className="mobile-sec-title">Target saya ({goals.length})</span>
          <button
            className="mobile-sec-action"
            onClick={() => { setEditTarget(undefined); setShowModal(true); }}
          >
            + Tambah
          </button>
        </div>

        {/* Goals List */}
        {goals.length === 0 ? (
          <div className="empty-state" style={{ padding: '24px 0' }}>
            <div className="empty-state-icon">🎯</div>
            <h3>Belum ada target</h3>
            <p>Buat target tabungan untuk memotivasi Anda menabung.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {goals.map(goal => {
              const progress = getGoalProgress(goal.id);
              const pct = clamp((progress / goal.targetAmount) * 100, 0, 100);
              const remaining = goal.targetAmount - progress;

              return (
                <div key={goal.id} className="mobile-card-item">
                  <div className="mobile-card-item-top">
                    <span className="mobile-card-item-name">{goal.name}</span>
                    <span className={`mobile-card-item-pct ${pct === 0 ? 'zero' : ''}`}>
                      {pct.toFixed(0)}%
                    </span>
                  </div>

                  <div className="mobile-progress-bar-wrap" style={{ height: 6 }}>
                    <div
                      className="mobile-progress-bar-fill"
                      style={{ width: `${pct}%`, background: '#2563EB' }}
                    />
                  </div>

                  <div className="mobile-card-item-subrow">
                    <div style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 12 }}>
                      {formatCurrency(progress, true)} dari {formatCurrency(goal.targetAmount, true)}
                      {remaining > 0 ? ` · ${formatCurrency(remaining, true)} lagi` : ''}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0, position: 'relative' }}>
                      <button
                        className="btn-setor"
                        onClick={() => setDepositGoal(goal)}
                      >
                        Setor
                      </button>
                      <button
                        className="btn btn-ghost btn-icon btn-sm"
                        style={{ width: 28, height: 28, minHeight: 'unset', padding: 0 }}
                        onClick={() => setActiveMenuId(activeMenuId === goal.id ? null : goal.id)}
                        aria-label="Menu opsi"
                      >
                        <MoreVertical size={16} />
                      </button>

                      {/* Dropdown Menu */}
                      {activeMenuId === goal.id && (
                        <div style={{
                          position: 'absolute',
                          right: 0,
                          bottom: '100%',
                          marginBottom: 4,
                          background: 'var(--card)',
                          border: '1px solid var(--border)',
                          borderRadius: 'var(--radius-sm)',
                          boxShadow: 'var(--shadow-md)',
                          zIndex: 50,
                          minWidth: 120,
                          overflow: 'hidden',
                          display: 'flex',
                          flexDirection: 'column',
                        }}>
                          <button
                            style={{ padding: '8px 12px', border: 'none', background: 'none', textAlign: 'left', fontSize: 13, cursor: 'pointer', color: 'var(--text-primary)' }}
                            onClick={() => { handleEdit(goal); setActiveMenuId(null); }}
                          >
                            Edit
                          </button>
                          <button
                            style={{ padding: '8px 12px', border: 'none', background: 'none', textAlign: 'left', fontSize: 13, cursor: 'pointer', color: 'var(--text-primary)' }}
                            onClick={() => { setWithdrawGoal(goal); setActiveMenuId(null); }}
                          >
                            Tarik
                          </button>
                          <button
                            style={{ padding: '8px 12px', border: 'none', background: 'none', textAlign: 'left', fontSize: 13, cursor: 'pointer', color: 'var(--danger)' }}
                            onClick={() => { handleDelete(goal.id); setActiveMenuId(null); }}
                          >
                            Hapus
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ─── DESKTOP VIEW ─── */}
      <div className="desktop-only-view">
        <Header title="Target Tabungan" subtitle="Pantau progress menuju tujuan keuangan Anda" />

        <div className="page-container">
          {/* Unified Stat Card — Goals (violet accent) */}
          <div className="page-stat-card goals">
          <div className="psc-item">
            <div className="psc-header">
              <div className="psc-icon"><Target size={16} /></div>
              <span className="psc-label">Total Target</span>
            </div>
            <div className="psc-value">{formatCurrency(totalTarget)}</div>
            <div className="psc-sub">{goals.length} target aktif</div>
          </div>

          <div className="psc-divider" />

          <div className="psc-item">
            <div className="psc-header">
              <div className="psc-icon"><Coins size={16} /></div>
              <span className="psc-label">Total Terkumpul</span>
            </div>
            <div className="psc-value">{formatCurrency(totalProgress)}</div>
            <div className="psc-sub">{totalTarget > 0 ? ((totalProgress / totalTarget) * 100).toFixed(0) : 0}% dari target</div>
          </div>

          <div className="psc-divider" />

          <div className="psc-item">
            <div className="psc-header">
              <div className="psc-icon"><TrendingUp size={16} /></div>
              <span className="psc-label">Progress Keseluruhan</span>
            </div>
            <div className="psc-value" style={{ fontSize: 17, whiteSpace: 'normal' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0, width: '100%' }}>
                <div className="progress-bar" style={{ flex: 1, height: 8, minWidth: 0, overflow: 'hidden' }}>
                  <div className="progress-fill" style={{ width: `${overallPct}%` }} />
                </div>
                <span style={{ flexShrink: 0, fontSize: 16, fontWeight: 800 }}>{overallPct.toFixed(0)}%</span>
              </div>
            </div>
            <div className="psc-sub">{overallPct >= 100 ? '🎉 Semua target tercapai!' : 'Terus semangat menabung!'}</div>
          </div>
        </div>

        <div className="dashboard-grid">
          {/* Goals Grid */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, gap: 8 }}>
              <h2 style={{ fontSize: 17, fontWeight: 700, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>Target Saya ({goals.length})</h2>
              <button className="btn btn-primary btn-sm" style={{ flexShrink: 0 }} onClick={() => { setEditTarget(undefined); setShowModal(true); }}>
                <Plus size={16} /> Tambah
              </button>
            </div>

            {goals.length === 0 ? (
              <div className="card">
                <div className="empty-state">
                  <div className="empty-state-icon"><span style={{ fontSize: 28 }}>🎯</span></div>
                  <h3>Belum ada target</h3>
                  <p>Buat target tabungan untuk memotivasi Anda menabung</p>
                  <button className="btn btn-primary" onClick={() => setShowModal(true)}>
                    <Plus size={16} /> Buat Target Pertama
                  </button>
                </div>
              </div>
            ) : (
              <div className="grid-auto">
                {goals.map(goal => {
                  const progress = getGoalProgress(goal.id);
                  const pct = clamp((progress / goal.targetAmount) * 100, 0, 100);
                  const progressColor = pct >= 100 ? 'var(--success)' : 'var(--primary)';
                  const isDone = pct >= 100;

                  return (
                    <div key={goal.id} className="card" style={{ padding: 20 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                        <div>
                          <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 2 }}>{goal.name}</div>
                          <div className="text-sm text-muted">Target: {formatCurrency(goal.targetAmount)}</div>
                        </div>
                        <span style={{ fontSize: 24, fontWeight: 800, color: progressColor }}>
                          {isDone ? '✅' : `${pct.toFixed(0)}%`}
                        </span>
                      </div>

                      <div className="progress-bar" style={{ height: 10, marginBottom: 8 }}>
                        <div className="progress-fill" style={{ width: `${pct}%`, background: progressColor }} />
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 14 }}>
                        <span style={{ color: 'var(--success)', fontWeight: 600 }}>{formatCurrency(progress)} terkumpul</span>
                        <span className="text-muted">
                          {isDone ? 'Goal tercapai! 🎉' : `${formatCurrency(goal.targetAmount - progress)} lagi`}
                        </span>
                      </div>

                      {/* Action buttons */}
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(75px, 1fr))', gap: 6 }}>
                        {!isDone && (
                          <button
                            className="btn btn-primary btn-sm"
                            style={{ flex: '1 1 auto' }}
                            onClick={() => setDepositGoal(goal)}
                          >
                            💰 Setor
                          </button>
                        )}
                        {progress > 0 && (
                          <button
                            className="btn btn-secondary btn-sm"
                            style={{ flex: '1 1 auto', borderColor: 'var(--danger)', color: 'var(--danger)' }}
                            onClick={() => setWithdrawGoal(goal)}
                          >
                            💸 Tarik
                          </button>
                        )}
                        <button className="btn btn-secondary btn-sm" style={{ flex: '0 0 auto' }} onClick={() => handleEdit(goal)}>
                          Edit
                        </button>
                        <button className="btn btn-danger btn-sm" style={{ flex: '0 0 auto' }} onClick={() => handleDelete(goal.id)}>
                          Hapus
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Right Panel */}
          <div className="card" style={{ alignSelf: 'flex-start' }}>
            <div className="card-header">
              <span className="card-title">Semua Target</span>
            </div>
            <SavingGoalsList goals={goals} onEdit={handleEdit} onDelete={handleDelete} />
          </div>
        </div>
      </div>
      </div>

      {showModal && (
        <GoalModal
          existing={editTarget}
          onSave={handleSave}
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
