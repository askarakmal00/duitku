'use client';
import React, { useState, useEffect } from 'react';
import { getFamilyContributions, saveFamilyContribution, FamilyContribution } from '@/lib/spaceStore';
import { formatCurrency, getCurrentMonth, getMonthName } from '@/lib/helpers';
import { Users, CheckCircle2, AlertCircle, Edit2, ChevronRight, TrendingUp } from 'lucide-react';
import { notifyDataChanged } from '@/lib/store';

interface FamilyContributionCardProps {
  year: number;
  month: number;
}

export default function FamilyContributionCard({ year, month }: FamilyContributionCardProps) {
  const monthKey = `${year}-${String(month).padStart(2, '0')}`;
  const [contribution, setContribution] = useState<FamilyContribution | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [asykarInput, setAsykarInput] = useState('');
  const [istriInput, setIstriInput] = useState('');
  const [targetInput, setTargetInput] = useState('');

  const loadData = () => {
    const list = getFamilyContributions();
    const item = list.find(c => c.month === monthKey);
    if (item) {
      setContribution(item);
      setAsykarInput(String(item.asykarAmount || 0));
      setIstriInput(String(item.istriAmount || 0));
      setTargetInput(String(item.targetPerPerson || 0));
    } else {
      // Default initial state
      setContribution(null);
      setAsykarInput('');
      setIstriInput('');
      setTargetInput('5000000'); // default 5jt per person
    }
  };

  useEffect(() => {
    loadData();
  }, [monthKey]);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const asykarAmount = Number(asykarInput) || 0;
    const istriAmount = Number(istriInput) || 0;
    const targetPerPerson = Number(targetInput) || 0;

    const saved = saveFamilyContribution({
      month: monthKey,
      asykarAmount,
      istriAmount,
      targetPerPerson,
    });
    setContribution(saved);
    setIsEditing(false);
    notifyDataChanged();
  };

  const targetPerPerson = contribution?.targetPerPerson || 5000000;
  const asykarAmount = contribution?.asykarAmount || 0;
  const istriAmount = contribution?.istriAmount || 0;
  const totalCollected = asykarAmount + istriAmount;
  const totalTarget = targetPerPerson * 2;
  const progressPercent = totalTarget > 0 ? Math.min(100, Math.round((totalCollected / totalTarget) * 100)) : 0;

  const asykarLunas = targetPerPerson > 0 && asykarAmount >= targetPerPerson;
  const istriLunas = targetPerPerson > 0 && istriAmount >= targetPerPerson;

  return (
    <div className="family-contrib-card">
      <div className="family-contrib-header">
        <div className="family-contrib-title-wrap">
          <div className="family-contrib-badge">
            <Users size={16} />
            <span>Setoran Kas Bersama</span>
          </div>
          <span className="family-contrib-month">{getMonthName(year, month)} {year}</span>
        </div>
        <button
          type="button"
          className="family-contrib-edit-btn"
          onClick={() => setIsEditing(prev => !prev)}
        >
          <Edit2 size={14} />
          <span>{isEditing ? 'Batal' : 'Update'}</span>
        </button>
      </div>

      {isEditing ? (
        <form onSubmit={handleSave} className="family-contrib-form">
          <div className="family-form-grid">
            <div className="family-input-group">
              <label>Target Setoran / Orang (Rp)</label>
              <input
                type="number"
                value={targetInput}
                onChange={e => setTargetInput(e.target.value)}
                placeholder="5000000"
                className="family-input"
              />
            </div>
            <div className="family-input-group">
              <label>Setoran Asykar (Rp)</label>
              <input
                type="number"
                value={asykarInput}
                onChange={e => setAsykarInput(e.target.value)}
                placeholder="0"
                className="family-input"
              />
            </div>
            <div className="family-input-group">
              <label>Setoran Istri (Rp)</label>
              <input
                type="number"
                value={istriInput}
                onChange={e => setIstriInput(e.target.value)}
                placeholder="0"
                className="family-input"
              />
            </div>
          </div>
          <button type="submit" className="family-submit-btn">
            Simpan Setoran
          </button>
        </form>
      ) : (
        <>
          {/* Progress overview */}
          <div className="family-contrib-summary">
            <div>
              <div className="family-summary-label">Total Terkumpul</div>
              <div className="family-summary-val">{formatCurrency(totalCollected)}</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div className="family-summary-label">Target Bulan Ini</div>
              <div className="family-summary-target">{formatCurrency(totalTarget)}</div>
            </div>
          </div>

          <div className="family-progress-bar-bg">
            <div
              className="family-progress-bar-fill"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <div className="family-progress-sub">
            <span>{progressPercent}% dari target terkumpul</span>
            <span>{formatCurrency(Math.max(0, totalTarget - totalCollected))} tersisa</span>
          </div>


          {/* Breakdown Per Person */}
          <div className="family-contrib-people">
            {/* Asykar */}
            <div className={`family-person-card ${asykarLunas ? 'complete' : ''}`}>
              <div className="family-person-header">
                <div className="family-person-info">
                  <div className="family-person-avatar asykar">A</div>
                  <div>
                    <span className="family-person-name">Asykar</span>
                    <span className="family-person-role">Suami</span>
                  </div>
                </div>
                {asykarLunas ? (
                  <span className="family-status-badge success">
                    <CheckCircle2 size={13} /> Lunas
                  </span>
                ) : (
                  <span className="family-status-badge pending">
                    <AlertCircle size={13} /> Belum
                  </span>
                )}
              </div>
              <div className="family-person-amount">{formatCurrency(asykarAmount)}</div>
              <div className="family-person-target">Target: {formatCurrency(targetPerPerson)}</div>
            </div>

            {/* Istri */}
            <div className={`family-person-card ${istriLunas ? 'complete' : ''}`}>
              <div className="family-person-header">
                <div className="family-person-info">
                  <div className="family-person-avatar istri">I</div>
                  <div>
                    <span className="family-person-name">Istri</span>
                    <span className="family-person-role">Istri</span>
                  </div>
                </div>
                {istriLunas ? (
                  <span className="family-status-badge success">
                    <CheckCircle2 size={13} /> Lunas
                  </span>
                ) : (
                  <span className="family-status-badge pending">
                    <AlertCircle size={13} /> Belum
                  </span>
                )}
              </div>
              <div className="family-person-amount">{formatCurrency(istriAmount)}</div>
              <div className="family-person-target">Target: {formatCurrency(targetPerPerson)}</div>
            </div>

          </div>
        </>
      )}
    </div>
  );
}
