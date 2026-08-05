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
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
      {goals.map(goal => {
        const progress = getGoalProgress(goal.id);
        const pct = clamp((progress / goal.targetAmount) * 100, 0, 100);
        const progressColor = pct >= 100 ? 'var(--success)' : 'var(--primary)';

        return (
          <div key={goal.id} className="goal-item">
            <div className="goal-header">
              <span className="goal-name">{goal.name}</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span className="goal-target">{formatCurrency(goal.targetAmount)}</span>
                {onEdit && (
                  <button className="btn btn-ghost btn-icon btn-sm" onClick={() => onEdit(goal)}>
                    <Pencil size={13} />
                  </button>
                )}
                {onDelete && (
                  <button className="btn btn-danger btn-icon btn-sm" onClick={() => onDelete(goal.id)}>
                    <Trash2 size={13} />
                  </button>
                )}
              </div>
            </div>

            <div className="progress-bar">
              <div
                className="progress-fill"
                style={{ width: `${pct}%`, background: progressColor }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span className="text-xs text-muted">{formatCurrency(progress)} terkumpul</span>
              <span className="goal-percent" style={{ color: progressColor }}>
                {pct.toFixed(0)}%
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
