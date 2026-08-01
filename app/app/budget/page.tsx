'use client';
import { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, AlertTriangle } from 'lucide-react';
import Header from '@/components/Header';
import BudgetDonut from '@/components/BudgetDonut';
import BudgetModal from '@/components/BudgetModal';
import {
  getBudgetPos, addBudgetPos, updateBudgetPos, deleteBudgetPos, getBudgetUsed
} from '@/lib/store';
import { BudgetPos } from '@/lib/types';
import { formatCurrency, getCurrentMonth, clamp } from '@/lib/helpers';

import { useDataRefresh } from '@/lib/useDataRefresh';
import { useCallback } from 'react';

export default function BudgetPage() {
  const [posList, setPosList] = useState<BudgetPos[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editTarget, setEditTarget] = useState<BudgetPos | undefined>();
  const { year, month } = getCurrentMonth();

  const load = useCallback(() => setPosList(getBudgetPos()), []);
  useDataRefresh(load);

  const posWithUsage = posList.map(p => ({
    ...p,
    used: getBudgetUsed(p.id, year, month),
    remaining: p.monthlyAllocation - getBudgetUsed(p.id, year, month),
    pct: p.monthlyAllocation > 0
      ? clamp((getBudgetUsed(p.id, year, month) / p.monthlyAllocation) * 100, 0, 200)
      : 0,
  }));

  const handleSave = async (data: Omit<BudgetPos, 'id' | 'createdAt'>) => {
    if (editTarget) await updateBudgetPos(editTarget.id, data);
    else await addBudgetPos(data);
    setShowModal(false);
    setEditTarget(undefined);
    load();
  };

  const handleEdit = (p: BudgetPos) => { setEditTarget(p); setShowModal(true); };
  const handleDelete = async (id: string) => {
    if (confirm('Hapus pos anggaran ini?')) { await deleteBudgetPos(id); load(); }
  };

  const budgetItems = posWithUsage.map(p => ({
    name: p.name,
    allocated: p.monthlyAllocation,
    used: p.used,
  }));

  return (
    <>
      <Header title="Anggaran" subtitle="Kelola pos anggaran dan pantau penggunaannya" />

      <div className="page-container">
        {/* Total Summary */}
        <div className="stats-row-3">
          <div className="card" style={{ padding: '16px 20px' }}>
            <p className="text-sm text-muted">Total Alokasi</p>
            <p className="font-700" style={{ fontSize: 22, marginTop: 4, color: 'var(--primary)' }}>
              {formatCurrency(posList.reduce((s, p) => s + p.monthlyAllocation, 0))}
            </p>
          </div>
          <div className="card" style={{ padding: '16px 20px' }}>
            <p className="text-sm text-muted">Total Terpakai</p>
            <p className="font-700 amount-negative" style={{ fontSize: 22, marginTop: 4 }}>
              {formatCurrency(posWithUsage.reduce((s, p) => s + p.used, 0))}
            </p>
          </div>
          <div className="card" style={{ padding: '16px 20px' }}>
            <p className="text-sm text-muted">Total Sisa</p>
            <p className="font-700 amount-positive" style={{ fontSize: 22, marginTop: 4 }}>
              {formatCurrency(posWithUsage.reduce((s, p) => s + p.remaining, 0))}
            </p>
          </div>
        </div>

        <div className="dashboard-grid">
          {/* Left: Budget Pos List */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h2 style={{ fontSize: 17, fontWeight: 700 }}>Pos Anggaran ({posList.length})</h2>
              <button className="btn btn-primary" onClick={() => { setEditTarget(undefined); setShowModal(true); }}>
                <Plus size={16} /> Tambah Pos
              </button>
            </div>

            {posList.length === 0 ? (
              <div className="card">
                <div className="empty-state">
                  <div className="empty-state-icon"><span style={{ fontSize: 28 }}>📊</span></div>
                  <h3>Belum ada pos anggaran</h3>
                  <p>Buat pos anggaran untuk memantau pengeluaran per kategori</p>
                  <button className="btn btn-primary" onClick={() => setShowModal(true)}>
                    <Plus size={16} /> Buat Pos Pertama
                  </button>
                </div>
              </div>
            ) : (
              <div className="budget-pos-list">
                {posWithUsage.map(p => {
                  const isOver = p.pct >= 100;
                  const isWarn = p.pct >= 80 && p.pct < 100;
                  const barColor = isOver ? 'var(--danger)' : isWarn ? 'var(--warning)' : 'var(--primary)';

                  return (
                    <div key={p.id} className="budget-pos-card">
                      <div className="budget-pos-header">
                        <div>
                          <div className="budget-pos-name">{p.name}</div>
                          {p.rollover && (
                            <span className="chip" style={{ fontSize: 11, padding: '2px 8px', marginTop: 4, display: 'inline-block' }}>
                              Rollover aktif
                            </span>
                          )}
                        </div>
                        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                          {isOver && (
                            <span className="chip chip-danger" style={{ fontSize: 11 }}>
                              <AlertTriangle size={11} /> Melebihi
                            </span>
                          )}
                          {isWarn && (
                            <span className="chip chip-warning" style={{ fontSize: 11 }}>
                              ⚠ Hampir habis
                            </span>
                          )}
                          <button className="btn btn-ghost btn-icon btn-sm" onClick={() => handleEdit(p)}>
                            <Pencil size={14} />
                          </button>
                          <button className="btn btn-danger btn-icon btn-sm" onClick={() => handleDelete(p.id)}>
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>

                      <div className="progress-bar" style={{ height: 10 }}>
                        <div
                          className="progress-fill"
                          style={{ width: `${Math.min(p.pct, 100)}%`, background: barColor }}
                        />
                      </div>

                      <div className="budget-pos-amounts">
                        <span>Terpakai: <strong style={{ color: barColor }}>{formatCurrency(p.used)}</strong></span>
                        <span>{p.pct.toFixed(0)}%</span>
                        <span>Sisa: <strong style={{ color: p.remaining < 0 ? 'var(--danger)' : 'var(--success)' }}>
                          {formatCurrency(Math.abs(p.remaining))}{p.remaining < 0 ? ' (minus)' : ''}
                        </strong></span>
                      </div>

                      <div style={{ marginTop: 6, textAlign: 'right' }}>
                        <span className="text-xs text-muted">
                          Alokasi: {formatCurrency(p.monthlyAllocation)} / bulan
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Right: Summary Donut */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div className="card">
              <div className="card-header">
                <span className="card-title">Ringkasan Anggaran</span>
              </div>
              <BudgetDonut items={budgetItems} />
            </div>

            <div className="card">
              <div className="card-header">
                <span className="card-title">Statistik</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {[
                  { label: 'Total Alokasi', value: posList.reduce((s, p) => s + p.monthlyAllocation, 0) },
                  { label: 'Total Terpakai', value: posWithUsage.reduce((s, p) => s + p.used, 0) },
                  { label: 'Total Sisa', value: posWithUsage.reduce((s, p) => s + p.remaining, 0) },
                ].map(({ label, value }, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: i < 2 ? '1px solid var(--divider)' : 'none' }}>
                    <span className="text-sm text-secondary">{label}</span>
                    <span className="font-600" style={{ color: i === 2 && value < 0 ? 'var(--danger)' : 'var(--text-primary)' }}>
                      {formatCurrency(value)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {showModal && (
        <BudgetModal
          existing={editTarget}
          onSave={handleSave}
          onClose={() => { setShowModal(false); setEditTarget(undefined); }}
        />
      )}
    </>
  );
}
