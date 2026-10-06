'use client';
import React, { useState, useEffect, useCallback } from 'react';
import { getFamilyContributions, saveFamilyContribution } from '@/lib/spaceStore';
import { getTransactions, addTransaction, notifyDataChanged } from '@/lib/store';
import { formatCurrency, getMonthName } from '@/lib/helpers';
import { Users, Plus, Check } from 'lucide-react';
import { useDataRefresh } from '@/lib/useDataRefresh';

interface FamilyContributionCardProps {
  year: number;
  month: number;
}

export default function FamilyContributionCard({ year, month }: FamilyContributionCardProps) {
  const monthKey = `${year}-${String(month).padStart(2, '0')}`;
  const [asykarAmount, setAsykarAmount] = useState(0);
  const [istriAmount, setIstriAmount] = useState(0);
  const [isAdding, setIsAdding] = useState(false);
  const [person, setPerson] = useState<'asykar' | 'istri'>('asykar');
  const [amountInput, setAmountInput] = useState('');
  const [noteInput, setNoteInput] = useState('');

  const loadData = useCallback(() => {
    // 1. Ambil transaksi masuk di ruang keluarga pada bulan terkait
    const txns = getTransactions('keluarga').filter(t => {
      if (t.type !== 'masuk') return false;
      const d = new Date(t.date);
      return d.getFullYear() === year && d.getMonth() + 1 === month;
    });

    const asykarTxn = txns
      .filter(t => {
        const cat = (t.category || '').toLowerCase();
        const note = (t.note || '').toLowerCase();
        return cat.includes('asykar') || note.includes('asykar');
      })
      .reduce((sum, t) => sum + t.amount, 0);

    const istriTxn = txns
      .filter(t => {
        const cat = (t.category || '').toLowerCase();
        const note = (t.note || '').toLowerCase();
        return cat.includes('istri') || note.includes('istri') || note.includes('riska');
      })
      .reduce((sum, t) => sum + t.amount, 0);

    // 2. Cek juga data manual jika ada
    const list = getFamilyContributions();
    const item = list.find(c => c.month === monthKey);
    const manualAsykar = item?.asykarAmount || 0;
    const manualIstri = item?.istriAmount || 0;

    // Utamakan hasil kalkulasi transaksi nyata, jika kosong gunakan catatan manual
    const finalAsykar = asykarTxn > 0 ? asykarTxn : manualAsykar;
    const finalIstri = istriTxn > 0 ? istriTxn : manualIstri;

    setAsykarAmount(finalAsykar);
    setIstriAmount(finalIstri);
  }, [year, month, monthKey]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useDataRefresh(loadData);

  const handleSaveSetoran = async (e: React.FormEvent) => {
    e.preventDefault();
    const val = Number(amountInput);
    if (!val || val <= 0) return;

    const isAsykar = person === 'asykar';
    const catName = isAsykar ? 'Setoran Asykar' : 'Setoran Istri';
    const noteText = noteInput.trim() || (isAsykar ? 'Setoran Asykar' : 'Setoran Istri');

    // Catat sebagai transaksi nyata di kas keluarga
    await addTransaction({
      type: 'masuk',
      amount: val,
      category: catName,
      note: noteText,
      date: new Date().toISOString(),
      spaceId: 'keluarga',
    });

    // Simpan juga ke tracking kontribusi
    saveFamilyContribution({
      month: monthKey,
      asykarAmount: isAsykar ? asykarAmount + val : asykarAmount,
      istriAmount: !isAsykar ? istriAmount + val : istriAmount,
    });

    setAmountInput('');
    setNoteInput('');
    setIsAdding(false);
    notifyDataChanged();
  };

  const totalCollected = asykarAmount + istriAmount;
  const asykarPct = totalCollected > 0 ? Math.round((asykarAmount / totalCollected) * 100) : 0;
  const istriPct = totalCollected > 0 ? (100 - asykarPct) : 0;

  return (
    <div className="family-contrib-card">
      <div className="family-contrib-header">
        <div className="family-contrib-title-wrap">
          <div className="family-contrib-badge">
            <Users size={16} />
            <span>Setoran Kas Bersama</span>
          </div>
          <span className="family-contrib-month">{getMonthName(year, month)}</span>
        </div>
        <button
          type="button"
          className="family-contrib-edit-btn"
          onClick={() => setIsAdding(prev => !prev)}
        >
          <Plus size={14} />
          <span>{isAdding ? 'Batal' : 'Tambah Setoran'}</span>
        </button>
      </div>

      {isAdding ? (
        <form onSubmit={handleSaveSetoran} className="family-contrib-form" style={{ animation: 'fadeIn 0.2s ease' }}>
          <div style={{ display: 'flex', gap: 10, marginBottom: 12 }}>
            <button
              type="button"
              className={`btn btn-sm ${person === 'asykar' ? 'btn-primary' : 'btn-outline'}`}
              style={{ flex: 1, padding: '8px' }}
              onClick={() => setPerson('asykar')}
            >
              Setoran Asykar (Suami)
            </button>
            <button
              type="button"
              className={`btn btn-sm ${person === 'istri' ? 'btn-primary' : 'btn-outline'}`}
              style={{ flex: 1, padding: '8px' }}
              onClick={() => setPerson('istri')}
            >
              Setoran Riska (Istri)
            </button>
          </div>

          <div className="family-form-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
            <div className="family-input-group">
              <label>Nominal Setoran (Rp)</label>
              <input
                type="number"
                value={amountInput}
                onChange={e => setAmountInput(e.target.value)}
                placeholder="Contoh: 3000000"
                className="family-input"
                autoFocus
                required
              />
            </div>
            <div className="family-input-group">
              <label>Keterangan (Opsional)</label>
              <input
                type="text"
                value={noteInput}
                onChange={e => setNoteInput(e.target.value)}
                placeholder={`Setoran ${person === 'asykar' ? 'Asykar' : 'Riska'}`}
                className="family-input"
              />
            </div>
          </div>
          <button type="submit" className="family-submit-btn" style={{ marginTop: 12 }}>
            <Check size={16} /> Simpan Setoran ke Kas Bersama
          </button>
        </form>
      ) : (
        <>
          {/* Total Terkumpul */}
          <div className="family-contrib-summary">
            <div>
              <div className="family-summary-label">Total Setoran Terkumpul</div>
              <div className="family-summary-val">{formatCurrency(totalCollected)}</div>
            </div>
          </div>

          {/* Breakdown Per Orang (Tanpa Target) */}
          <div className="family-contrib-people">
            {/* Asykar */}
            <div className="family-person-card">
              <div className="family-person-header">
                <div className="family-person-info">
                  <div className="family-person-avatar asykar">A</div>
                  <div>
                    <span className="family-person-name">Asykar</span>
                    <span className="family-person-role">Suami</span>
                  </div>
                </div>
                {totalCollected > 0 && (
                  <span className="family-status-badge info">
                    {asykarPct}%
                  </span>
                )}
              </div>
              <div className="family-person-amount">{formatCurrency(asykarAmount)}</div>
            </div>

            {/* Istri / Riska */}
            <div className="family-person-card">
              <div className="family-person-header">
                <div className="family-person-info">
                  <div className="family-person-avatar istri">R</div>
                  <div>
                    <span className="family-person-name">Riska</span>
                    <span className="family-person-role">Istri</span>
                  </div>
                </div>
                {totalCollected > 0 && (
                  <span className="family-status-badge info">
                    {istriPct}%
                  </span>
                )}
              </div>
              <div className="family-person-amount">{formatCurrency(istriAmount)}</div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
