'use client';
import { SavingGoal } from '@/lib/types';
import { formatCurrency, clamp } from '@/lib/helpers';
import { getGoalProgress } from '@/lib/store';
import { Pencil, Trash2 } from 'lucide-react';

interface SavingGoalsListProps {
  goals: SavingGoal[];
  onEdit?: (g: SavingGoal) => void;
  onDelete?: (id: string) => void;
}

export default function SavingGoalsList({ goals, onEdit, onDelete }: SavingGoalsListProps) {
  if (goals.length === 0) {
    return (
      <div className="empty-state">
        <div className="empty-state-icon">🎯</div>
        <h3>Belum ada target tabungan</h3>
        <p>Buat target impianmu dan pantau perkembangannya setiap hari ✨</p>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {goals.map(goal => {
        const progress = getGoalProgress(goal.id);
        const pct = clamp((progress / goal.targetAmount) * 100, 0, 100);
        const progressColor = pct >= 100 ? 'var(--success)' : 'var(--primary)';

        return (
          <div key={goal.id} className="goal-item" style={{ overflow: 'hidden' }}>
            <div className="goal-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, minWidth: 0 }}>
              <span className="goal-name" style={{ minWidth: 0, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: 600 }}>
                {goal.name}
              </span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                <span className="goal-target" style={{ fontSize: 13, fontWeight: 700 }}>
                  {formatCurrency(goal.targetAmount)}
                </span>
                {onEdit && (
                  <button className="btn btn-ghost btn-icon btn-sm" style={{ padding: 4, width: 26, height: 26, minHeight: 'unset' }} onClick={() => onEdit(goal)} title="Edit">
                    <Pencil size={12} />
                  </button>
                )}
                {onDelete && (
                  <button className="btn btn-danger btn-icon btn-sm" style={{ padding: 4, width: 26, height: 26, minHeight: 'unset' }} onClick={() => onDelete(goal.id)} title="Hapus">
                    <Trash2 size={12} />
                  </button>
                )}
              </div>
            </div>

            <div className="progress-bar" style={{ height: 6, margin: '6px 0' }}>
              <div
                className="progress-fill"
                style={{ width: `${pct}%`, background: progressColor }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', minWidth: 0 }}>
              <span className="text-xs text-muted" style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {formatCurrency(progress)} terkumpul
              </span>
              <span className="goal-percent" style={{ color: progressColor, fontWeight: 700, fontSize: 12, flexShrink: 0, marginLeft: 6 }}>
                {pct.toFixed(0)}%
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
