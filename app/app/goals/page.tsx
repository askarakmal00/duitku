'use client';
import { useEffect, useState } from 'react';
import { Plus } from 'lucide-react';
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
      <Header title="Target Tabungan" subtitle="Pantau progress menuju tujuan keuangan Anda" />

      <div className="page-container">
        {/* Summary */}
        <div className="stats-row-3">
          <div className="card" style={{ padding: '16px 20px' }}>
            <p className="text-sm text-muted">Total Target</p>
            <p className="font-700" style={{ fontSize: 22, marginTop: 4, color: 'var(--primary)' }}>
              {formatCurrency(totalTarget)}
            </p>
          </div>
          <div className="card" style={{ padding: '16px 20px' }}>
            <p className="text-sm text-muted">Total Terkumpul</p>
            <p className="font-700 amount-positive" style={{ fontSize: 22, marginTop: 4 }}>
              {formatCurrency(totalProgress)}
            </p>
          </div>
          <div className="card" style={{ padding: '16px 20px' }}>
            <p className="text-sm text-muted">Progress Keseluruhan</p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 4 }}>
              <div className="progress-bar" style={{ flex: 1, height: 10 }}>
                <div className="progress-fill" style={{ width: `${overallPct}%` }} />
              </div>
              <span className="font-700" style={{ color: 'var(--primary)' }}>{overallPct.toFixed(0)}%</span>
            </div>
          </div>
        </div>

        <div className="dashboard-grid">
          {/* Goals Grid */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h2 style={{ fontSize: 17, fontWeight: 700 }}>Target Saya ({goals.length})</h2>
              <button className="btn btn-primary" onClick={() => { setEditTarget(undefined); setShowModal(true); }}>
                <Plus size={16} /> Tambah Target
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
