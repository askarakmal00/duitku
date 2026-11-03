'use client';
import { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, AlertTriangle, Coins, PieChart, TrendingUp, Target } from 'lucide-react';
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
import { useSpace } from '@/lib/useSpace';

export default function BudgetPage() {
  const { activeSpace } = useSpace();
  const currentSpace = activeSpace || 'pribadi';

  const [posList, setPosList] = useState<BudgetPos[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editTarget, setEditTarget] = useState<BudgetPos | undefined>();
  const { year, month } = getCurrentMonth();

  const load = useCallback(() => setPosList(getBudgetPos(activeSpace || undefined)), [activeSpace]);
  useDataRefresh(load);

  const posWithUsage = posList.map(p => ({
    ...p,
    used: getBudgetUsed(p.id, year, month, p.spaceId || currentSpace),
    remaining: p.monthlyAllocation - getBudgetUsed(p.id, year, month, p.spaceId || currentSpace),
    pct: p.monthlyAllocation > 0
      ? clamp((getBudgetUsed(p.id, year, month, p.spaceId || currentSpace) / p.monthlyAllocation) * 100, 0, 200)
      : 0,
  }));

  const handleSave = async (data: Omit<BudgetPos, 'id' | 'createdAt'>) => {
    if (editTarget) await updateBudgetPos(editTarget.id, { ...data, spaceId: editTarget.spaceId || currentSpace });
    else await addBudgetPos({ ...data, spaceId: currentSpace });
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

  const totalAllocation = posList.reduce((s, p) => s + p.monthlyAllocation, 0);
  const totalUsed = posWithUsage.reduce((s, p) => s + p.used, 0);
  const totalRemaining = totalAllocation - totalUsed;
  const overBudgetCount = posWithUsage.filter(p => p.pct >= 100).length;
  const overallPct = totalAllocation > 0 ? clamp((totalUsed / totalAllocation) * 100, 0, 200) : 0;

  return (
    <>
      <Header title="Anggaran" subtitle="Kelola pos anggaran dan pantau pemakaian" />

      <div className="page-container">
        {/* ─── Stat Cards Row ─── */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
          gap: 12,
          marginBottom: 4,
        }}>
          {[
            {
              label: 'Total Alokasi',
              value: formatCurrency(totalAllocation),
              sub: `${posList.length} pos anggaran`,
              icon: <Target size={16} />,
              color: '#6366F1',
              bg: '#EEF2FF',
            },
            {
              label: 'Total Terpakai',
              value: formatCurrency(totalUsed),
              sub: `${overallPct.toFixed(0)}% dari alokasi`,
              icon: <TrendingUp size={16} />,
              color: overallPct >= 100 ? '#DC2626' : overallPct >= 80 ? '#D97706' : '#059669',
              bg: overallPct >= 100 ? '#FEF2F2' : overallPct >= 80 ? '#FFFBEB' : '#ECFDF5',
            },
            {
              label: 'Sisa Anggaran',
              value: `${totalRemaining < 0 ? '-' : ''}${formatCurrency(Math.abs(totalRemaining))}`,
              sub: totalRemaining < 0 ? 'Melebihi alokasi' : 'Masih tersedia',
              icon: <Coins size={16} />,
              color: totalRemaining < 0 ? '#DC2626' : '#059669',
              bg: totalRemaining < 0 ? '#FEF2F2' : '#ECFDF5',
            },
            {
              label: 'Pos Melebihi',
              value: `${overBudgetCount}`,
              sub: overBudgetCount > 0 ? 'Pos over-budget' : 'Semua dalam batas',
              icon: <AlertTriangle size={16} />,
              color: overBudgetCount > 0 ? '#DC2626' : '#059669',
              bg: overBudgetCount > 0 ? '#FEF2F2' : '#ECFDF5',
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
                <div style={{ fontSize: 16, fontWeight: 700, color: card.color, lineHeight: 1.1 }}>{card.value}</div>
                <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2 }}>{card.sub}</div>
              </div>
            </div>
          ))}
        </div>

        {/* ─── Main Grid: List + Donut ─── */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1fr) 300px',
          gap: 16,
          alignItems: 'start',
        }} className="budget-main-grid">
          {/* LEFT: Pos List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {/* Section header with add button */}
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '0 2px',
            }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)' }}>
                Pos Anggaran ({posList.length})
              </span>
              <button
                className="btn btn-primary btn-sm"
                onClick={() => { setEditTarget(undefined); setShowModal(true); }}
                style={{ gap: 6 }}
              >
                <Plus size={14} /> Tambah Pos
              </button>
            </div>

            {/* Pos cards */}
            {posWithUsage.length === 0 ? (
              <div className="card">
                <div className="empty-state">
                  <div className="empty-state-icon"><PieChart size={32} /></div>
                  <h3>Belum ada pos anggaran</h3>
                  <p>Buat pos anggaran untuk memantau pengeluaran per kategori</p>
                  <button className="btn btn-primary" onClick={() => { setEditTarget(undefined); setShowModal(true); }}>
                    <Plus size={16} /> Buat Pos Pertama
                  </button>
                </div>
              </div>
            ) : (
              posWithUsage.map(p => {
                const isOver = p.pct >= 100;
                const isWarn = p.pct >= 80 && p.pct < 100;
                const barColor = isOver ? 'var(--danger)' : isWarn ? 'var(--warning)' : 'var(--primary)';
                const barBg = isOver ? '#FEF2F2' : isWarn ? '#FFFBEB' : '#EEF2FF';

                return (
                  <div key={p.id} style={{
                    background: 'var(--card)',
                    borderRadius: 'var(--radius-md)',
                    border: `1px solid ${isOver ? '#FECACA' : isWarn ? '#FDE68A' : 'var(--border)'}`,
                    padding: '16px 18px',
                    boxShadow: 'var(--shadow)',
                    transition: 'box-shadow 0.15s ease',
                  }}>
                    {/* Card Header */}
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                          <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>{p.name}</span>
                          {p.rollover && (
                            <span className="chip" style={{ fontSize: 10, padding: '2px 7px' }}>Rollover</span>
                          )}
                          {isOver && (
                            <span className="chip chip-danger" style={{ fontSize: 10, padding: '2px 7px', display: 'flex', alignItems: 'center', gap: 3 }}>
                              <AlertTriangle size={10} /> Over
                            </span>
                          )}
                          {isWarn && !isOver && (
                            <span className="chip chip-warning" style={{ fontSize: 10, padding: '2px 7px' }}>⚠ Hampir habis</span>
                          )}
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2 }}>
                          Alokasi {formatCurrency(p.monthlyAllocation)} / bulan
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: 4, marginLeft: 8 }}>
                        <button className="btn btn-ghost btn-icon btn-sm" onClick={() => handleEdit(p)} title="Edit">
                          <Pencil size={13} />
                        </button>
                        <button className="btn btn-danger btn-icon btn-sm" onClick={() => handleDelete(p.id)} title="Hapus">
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div style={{
                      height: 8, borderRadius: 99,
                      background: barBg,
                      overflow: 'hidden',
                      marginBottom: 10,
                    }}>
                      <div style={{
                        height: '100%',
                        width: `${Math.min(p.pct, 100)}%`,
                        borderRadius: 99,
                        background: barColor,
                        transition: 'width 0.4s ease',
                      }} />
                    </div>

                    {/* Amount Row */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div style={{ display: 'flex', gap: 16 }}>
                        <div>
                          <div style={{ fontSize: 10, color: 'var(--text-secondary)', marginBottom: 1 }}>Terpakai</div>
                          <div style={{ fontSize: 13, fontWeight: 700, color: barColor }}>{formatCurrency(p.used)}</div>
                        </div>
                        <div>
                          <div style={{ fontSize: 10, color: 'var(--text-secondary)', marginBottom: 1 }}>Sisa</div>
                          <div style={{ fontSize: 13, fontWeight: 700, color: p.remaining < 0 ? 'var(--danger)' : 'var(--success)' }}>
                            {p.remaining < 0 ? '-' : ''}{formatCurrency(Math.abs(p.remaining))}
                          </div>
                        </div>
                      </div>
                      <div style={{
                        fontSize: 18, fontWeight: 800,
                        color: barColor,
                      }}>
                        {p.pct.toFixed(0)}%
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* RIGHT: Donut + Stats */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{
              background: 'var(--card)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border)',
              padding: '16px',
              boxShadow: 'var(--shadow)',
            }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 12 }}>
                Ringkasan Anggaran
              </div>
              <BudgetDonut items={budgetItems} />
            </div>

            <div style={{
              background: 'var(--card)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border)',
              padding: '16px',
              boxShadow: 'var(--shadow)',
            }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 12 }}>
                Statistik Bulan Ini
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                {[
                  { label: 'Total Alokasi', value: totalAllocation, color: 'var(--text-primary)' },
                  { label: 'Total Terpakai', value: totalUsed, color: overallPct >= 100 ? 'var(--danger)' : 'var(--text-primary)' },
                  { label: 'Total Sisa', value: totalRemaining, color: totalRemaining < 0 ? 'var(--danger)' : 'var(--success)' },
                ].map(({ label, value, color }, i) => (
                  <div key={i} style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '10px 0',
                    borderBottom: i < 2 ? '1px solid var(--border)' : 'none',
                  }}>
                    <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{label}</span>
                    <span style={{ fontSize: 13, fontWeight: 700, color }}>
                      {value < 0 ? '-' : ''}{formatCurrency(Math.abs(value))}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ─── Responsive CSS for budget-main-grid ─── */}
      <style>{`
        @media (max-width: 768px) {
          .budget-main-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>

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
