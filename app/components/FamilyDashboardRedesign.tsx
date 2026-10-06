'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  TrendingUp,
  TrendingDown,
  PiggyBank,
  Plus,
  Check,
  X,
  Sliders,
  Maximize2,
  Download,
  Search,
  Bell,
  Users
} from 'lucide-react';
import { formatRupiah, formatCurrency, getMonthName, clamp } from '@/lib/helpers';
import { getTransactions, addTransaction, notifyDataChanged, getDashboardFinanceSummary } from '@/lib/store';
import { getFamilyContributions, saveFamilyContribution } from '@/lib/spaceStore';
import { useDataRefresh } from '@/lib/useDataRefresh';
import SpaceSwitcher from '@/components/SpaceSwitcher';

interface FamilyDashboardRedesignProps {
  year: number;
  month: number;
  userName?: string;
  onOpenAddGoal?: () => void;
}

export default function FamilyDashboardRedesign({
  year,
  month,
  userName = 'Keluarga',
  onOpenAddGoal,
}: FamilyDashboardRedesignProps) {
  const router = useRouter();
  const monthKey = `${year}-${String(month).padStart(2, '0')}`;
  const monthLabel = `${getMonthName(year, month)} ${year}`;

  const [asykarAmount, setAsykarAmount] = useState(6000000);
  const [istriAmount, setIstriAmount] = useState(3000000);
  const [showAddModal, setShowAddModal] = useState(false);
  const [person, setPerson] = useState<'asykar' | 'istri'>('asykar');
  const [amountInput, setAmountInput] = useState('');
  const [noteInput, setNoteInput] = useState('');

  // Single source of truth ledger
  const summary = getDashboardFinanceSummary(year, month);

  const loadContributions = useCallback(() => {
    // 1. Ambil transaksi masuk di kas keluarga pada bulan ini
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

    const list = getFamilyContributions();
    const item = list.find(c => c.month === monthKey);
    const manualAsykar = item?.asykarAmount || 0;
    const manualIstri = item?.istriAmount || 0;

    let finalAsykar = asykarTxn > 0 ? asykarTxn : manualAsykar;
    let finalIstri = istriTxn > 0 ? istriTxn : manualIstri;

    // Fallback default sample data if total cash in exists
    if (finalAsykar === 0 && finalIstri === 0) {
      if (summary.totalCashIn >= 9000000) {
        finalAsykar = 6000000;
        finalIstri = 3000000;
      } else if (summary.totalCashIn > 0) {
        finalAsykar = Math.round(summary.totalCashIn * (2 / 3));
        finalIstri = summary.totalCashIn - finalAsykar;
      }
    }

    setAsykarAmount(finalAsykar);
    setIstriAmount(finalIstri);
  }, [year, month, monthKey, summary.totalCashIn]);

  useEffect(() => {
    loadContributions();
  }, [loadContributions]);

  useDataRefresh(loadContributions);

  // Perhitungan rasio kontribusi
  const totalSetoran = asykarAmount + istriAmount > 0 ? asykarAmount + istriAmount : summary.totalCashIn;
  const asykarPct = totalSetoran > 0 ? Math.round((asykarAmount / totalSetoran) * 100) : 67;
  const istriPct = totalSetoran > 0 ? (100 - asykarPct) : 33;

  // Rasio pengeluaran terhadap setoran
  const spentPct = totalSetoran > 0
    ? clamp(Math.round((summary.totalCashOut / totalSetoran) * 100), 0, 100)
    : 0;

  const handleSaveSetoran = async (e: React.FormEvent) => {
    e.preventDefault();
    const val = Number(amountInput);
    if (!val || val <= 0) return;

    const isAsykar = person === 'asykar';
    const catName = isAsykar ? 'Setoran Asykar' : 'Setoran Istri';
    const noteText = noteInput.trim() || (isAsykar ? 'Setoran Asykar' : 'Setoran Riska');

    await addTransaction({
      type: 'masuk',
      amount: val,
      category: catName,
      note: noteText,
      date: new Date().toISOString(),
      spaceId: 'keluarga',
    });

    saveFamilyContribution({
      month: monthKey,
      asykarAmount: isAsykar ? asykarAmount + val : asykarAmount,
      istriAmount: !isAsykar ? istriAmount + val : istriAmount,
    });

    setAmountInput('');
    setNoteInput('');
    setShowAddModal(false);
    notifyDataChanged();
  };

  return (
    <div style={{ width: '100%', maxWidth: '100%', minWidth: 0, boxSizing: 'border-box' }}>
      {/* ─── TOP BREADCRUMB / UTILITY BAR ─── */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '0 4px 14px 4px',
        color: '#64748B',
        fontSize: 13,
        fontWeight: 500,
      }}>
        <span>Dashboard</span>
        <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
          <button style={{ background: 'none', border: 'none', color: '#64748B', cursor: 'pointer', padding: 2 }} title="Filter">
            <Sliders size={16} />
          </button>
          <button style={{ background: 'none', border: 'none', color: '#64748B', cursor: 'pointer', padding: 2 }} title="Perbesar">
            <Maximize2 size={16} />
          </button>
          <button style={{ background: 'none', border: 'none', color: '#64748B', cursor: 'pointer', padding: 2 }} title="Unduh">
            <Download size={16} />
          </button>
        </div>
      </div>

      {/* ─── MAIN HEADER ─── */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 24,
        flexWrap: 'wrap',
        gap: 16,
      }}>
        <div>
          <div style={{
            color: '#4F46E5',
            fontSize: 12,
            fontWeight: 700,
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
            marginBottom: 4,
          }}>
            {monthLabel.toUpperCase()}
          </div>
          <h1 style={{
            fontSize: 32,
            fontWeight: 800,
            color: '#0F172A',
            margin: 0,
            letterSpacing: '-0.02em',
            lineHeight: 1.15,
          }}>
            Dashboard
          </h1>
          <p style={{
            fontSize: 14,
            color: '#64748B',
            margin: '4px 0 0 0',
          }}>
            Ringkasan keuangan Anda bulan ini
          </p>
        </div>

        {/* Header Right Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <SpaceSwitcher />

          <button
            style={{
              width: 40,
              height: 40,
              borderRadius: '50%',
              background: '#FFFFFF',
              border: '1px solid #E2E8F0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#475569',
              cursor: 'pointer',
              boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
            }}
            title="Cari"
          >
            <Search size={18} />
          </button>

          <button
            style={{
              width: 40,
              height: 40,
              borderRadius: '50%',
              background: '#FFFFFF',
              border: '1px solid #E2E8F0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#475569',
              cursor: 'pointer',
              boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
            }}
            title="Notifikasi"
          >
            <Bell size={18} />
          </button>

          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: '50%',
              background: '#4F46E5',
              color: '#FFFFFF',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 700,
              fontSize: 15,
              boxShadow: '0 2px 4px rgba(79,70,229,0.2)',
            }}
            title="Duitku Keluarga"
          >
            K
          </div>
        </div>
      </div>

      {/* ─── TOP TIER: 2 LARGE CARDS ─── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))',
        gap: 20,
        marginBottom: 20,
      }}>
        {/* CARD 1: SALDO KAS BERSAMA (Deep Indigo Card) */}
        <div style={{
          background: '#151336',
          borderRadius: 24,
          padding: '24px 26px',
          color: '#FFFFFF',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          boxShadow: '0 4px 20px -2px rgba(21, 19, 54, 0.25)',
          minHeight: 280,
        }}>
          <div>
            {/* Header row */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: '0.08em',
                color: '#94A3B8',
                textTransform: 'uppercase',
              }}>
                SALDO KAS BERSAMA
              </span>
              <span style={{
                background: 'rgba(255, 255, 255, 0.12)',
                color: '#FFFFFF',
                fontSize: 12,
                fontWeight: 600,
                padding: '4px 12px',
                borderRadius: 9999,
              }}>
                {summary.netCashFlow >= 0 ? '+' : ''}{formatRupiah(summary.netCashFlow)} bulan ini
              </span>
            </div>

            {/* Big Amount */}
            <div style={{
              fontSize: 38,
              fontWeight: 800,
              color: '#FFFFFF',
              letterSpacing: '-0.02em',
              margin: '12px 0 2px 0',
              lineHeight: 1.15,
            }}>
              {formatRupiah(summary.closingBalance >= 0 ? summary.closingBalance : summary.netCashFlow)}
            </div>

            {/* Subtitle */}
            <div style={{
              fontSize: 13,
              color: '#94A3B8',
              marginBottom: 22,
            }}>
              Akumulasi kas riil keluarga
            </div>

            {/* Progress Section: Terpakai dari setoran */}
            <div>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: 12,
                color: '#94A3B8',
                marginBottom: 6,
              }}>
                <span>Terpakai dari setoran</span>
                <span style={{ fontWeight: 700, color: '#FFFFFF' }}>{spentPct}%</span>
              </div>

              {/* Progress Bar Track */}
              <div style={{
                width: '100%',
                height: 8,
                background: 'rgba(255, 255, 255, 0.15)',
                borderRadius: 9999,
                overflow: 'hidden',
                margin: '6px 0',
              }}>
                <div style={{
                  width: `${spentPct}%`,
                  height: '100%',
                  background: '#6366F1',
                  borderRadius: 9999,
                  transition: 'width 0.4s ease',
                }} />
              </div>

              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: 12,
                color: '#94A3B8',
                marginTop: 6,
              }}>
                <span>Keluar {formatRupiah(summary.totalCashOut)}</span>
                <span>Masuk {formatRupiah(summary.totalCashIn)}</span>
              </div>
            </div>
          </div>

          {/* Bottom 2 Sub-boxes */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 12,
            marginTop: 20,
          }}>
            {/* Box 1: Free money / Defisit kas */}
            <div style={{
              background: 'rgba(255, 255, 255, 0.08)',
              borderRadius: 14,
              padding: '12px 16px',
            }}>
              <div style={{ fontSize: 11, color: '#94A3B8', marginBottom: 2 }}>
                {summary.freeMoneyOrDeficit < 0 ? 'Defisit kas' : 'Free money'}
              </div>
              <div style={{ fontSize: 16, fontWeight: 700, color: '#FFFFFF' }}>
                {formatRupiah(summary.freeMoneyOrDeficit >= 0 ? summary.freeMoneyOrDeficit : summary.netCashFlow)}
              </div>
            </div>

            {/* Box 2: Sisa anggaran + Atur button */}
            <div style={{
              background: 'rgba(255, 255, 255, 0.08)',
              borderRadius: 14,
              padding: '12px 16px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}>
              <div>
                <div style={{ fontSize: 11, color: '#94A3B8', marginBottom: 2 }}>
                  Sisa anggaran
                </div>
                <div style={{ fontSize: 16, fontWeight: 700, color: '#FFFFFF' }}>
                  {summary.remainingBudget !== null ? formatRupiah(summary.remainingBudget) : 'Belum diatur'}
                </div>
              </div>

              <button
                onClick={() => router.push('/budget')}
                style={{
                  background: '#FFFFFF',
                  color: '#0F172A',
                  fontSize: 12,
                  fontWeight: 600,
                  padding: '5px 14px',
                  borderRadius: 9999,
                  border: 'none',
                  cursor: 'pointer',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
                }}
              >
                Atur
              </button>
            </div>
          </div>
        </div>

        {/* CARD 2: SETORAN KAS BERSAMA (White Card) */}
        <div style={{
          background: '#FFFFFF',
          borderRadius: 24,
          padding: '24px 26px',
          border: '1px solid #E2E8F0',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          minHeight: 280,
        }}>
          <div>
            {/* Header row */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: '0.08em',
                color: '#475569',
                textTransform: 'uppercase',
              }}>
                SETORAN KAS BERSAMA
              </span>

              <button
                onClick={() => setShowAddModal(true)}
                style={{
                  background: '#4F46E5',
                  color: '#FFFFFF',
                  fontSize: 13,
                  fontWeight: 600,
                  padding: '8px 16px',
                  borderRadius: 9999,
                  border: 'none',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  boxShadow: '0 2px 4px rgba(79,70,229,0.2)',
                }}
              >
                <Plus size={15} />
                <span>Tambah setoran</span>
              </button>
            </div>

            {/* Big Amount */}
            <div style={{
              fontSize: 38,
              fontWeight: 800,
              color: '#0F172A',
              letterSpacing: '-0.02em',
              margin: '12px 0 2px 0',
              lineHeight: 1.15,
            }}>
              {formatRupiah(totalSetoran)}
            </div>

            {/* Subtitle */}
            <div style={{
              fontSize: 13,
              color: '#64748B',
              marginBottom: 18,
            }}>
              Total terkumpul {monthLabel}
            </div>

            {/* Segmented Split Contribution Bar */}
            <div style={{
              display: 'flex',
              gap: 4,
              height: 10,
              width: '100%',
              marginBottom: 18,
            }}>
              <div style={{
                width: `${asykarPct}%`,
                background: '#4F46E5',
                borderRadius: 9999,
                transition: 'width 0.4s ease',
              }} title={`Asykar: ${asykarPct}%`} />
              <div style={{
                width: `${istriPct}%`,
                background: '#BE185D',
                borderRadius: 9999,
                transition: 'width 0.4s ease',
              }} title={`Riska: ${istriPct}%`} />
            </div>
          </div>

          {/* 2 Member Cards */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 12,
            marginTop: 4,
          }}>
            {/* Member 1: Asykar */}
            <div style={{
              background: '#F1F4FD',
              borderRadius: 16,
              padding: '16px 18px',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{
                    width: 36,
                    height: 36,
                    borderRadius: '50%',
                    background: '#4F46E5',
                    color: '#FFFFFF',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 700,
                    fontSize: 14,
                  }}>
                    A
                  </div>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: '#0F172A', lineHeight: 1.2 }}>Asykar</div>
                    <div style={{ fontSize: 12, color: '#64748B' }}>Suami</div>
                  </div>
                </div>

                <span style={{ fontSize: 13, fontWeight: 700, color: '#4F46E5' }}>
                  {asykarPct}%
                </span>
              </div>

              <div style={{
                fontSize: 20,
                fontWeight: 800,
                color: '#0F172A',
                letterSpacing: '-0.02em',
                marginTop: 14,
              }}>
                {formatRupiah(asykarAmount)}
              </div>
            </div>

            {/* Member 2: Riska */}
            <div style={{
              background: '#FDF2F8',
              borderRadius: 16,
              padding: '16px 18px',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{
                    width: 36,
                    height: 36,
                    borderRadius: '50%',
                    background: '#BE185D',
                    color: '#FFFFFF',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 700,
                    fontSize: 14,
                  }}>
                    R
                  </div>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: '#0F172A', lineHeight: 1.2 }}>Riska</div>
                    <div style={{ fontSize: 12, color: '#64748B' }}>Istri</div>
                  </div>
                </div>

                <span style={{ fontSize: 13, fontWeight: 700, color: '#BE185D' }}>
                  {istriPct}%
                </span>
              </div>

              <div style={{
                fontSize: 20,
                fontWeight: 800,
                color: '#0F172A',
                letterSpacing: '-0.02em',
                marginTop: 14,
              }}>
                {formatRupiah(istriAmount)}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ─── BOTTOM TIER: 3 METRIC CARDS ─── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
        gap: 20,
      }}>
        {/* CARD 1: PENGELUARAN BULAN INI */}
        <div style={{
          background: '#FFFFFF',
          borderRadius: 20,
          padding: '22px 24px',
          border: '1px solid #E2E8F0',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{
                width: 28,
                height: 28,
                borderRadius: 8,
                background: '#FFEDD5',
                color: '#EA580C',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                <TrendingDown size={16} />
              </div>
              <span style={{
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: '0.08em',
                color: '#475569',
                textTransform: 'uppercase',
              }}>
                PENGELUARAN BULAN INI
              </span>
            </div>

            <div style={{
              fontSize: 30,
              fontWeight: 800,
              color: '#C2410C',
              letterSpacing: '-0.02em',
              margin: '14px 0 4px 0',
            }}>
              {formatRupiah(summary.totalCashOut)}
            </div>

            <div style={{ fontSize: 13, color: '#64748B', marginBottom: 12 }}>
              {spentPct}% dari total setoran masuk
            </div>

            {/* Progress Bar */}
            <div style={{
              width: '100%',
              height: 8,
              background: '#F1F5F9',
              borderRadius: 9999,
              overflow: 'hidden',
              margin: '6px 0',
            }}>
              <div style={{
                width: `${spentPct}%`,
                height: '100%',
                background: '#C2410C',
                borderRadius: 9999,
              }} />
            </div>
          </div>

          <div style={{ fontSize: 12, color: '#94A3B8', marginTop: 14 }}>
            {summary.comparisonPeriodLabel || 'Belum ada data pembanding bulan lalu'}
          </div>
        </div>

        {/* CARD 2: SETORAN MASUK */}
        <div style={{
          background: '#FFFFFF',
          borderRadius: 20,
          padding: '22px 24px',
          border: '1px solid #E2E8F0',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{
                width: 28,
                height: 28,
                borderRadius: 8,
                background: '#D1FAE5',
                color: '#059669',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                <TrendingUp size={16} />
              </div>
              <span style={{
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: '0.08em',
                color: '#475569',
                textTransform: 'uppercase',
              }}>
                SETORAN MASUK
              </span>
            </div>

            <div style={{
              fontSize: 30,
              fontWeight: 800,
              color: '#047857',
              letterSpacing: '-0.02em',
              margin: '14px 0 4px 0',
            }}>
              {formatRupiah(summary.totalCashIn)}
            </div>

            <div style={{ fontSize: 13, color: '#64748B' }}>
              Dari 2 anggota keluarga
            </div>
          </div>

          <div style={{ fontSize: 12, color: '#94A3B8', marginTop: 22 }}>
            {summary.comparisonPeriodLabel || 'Belum ada data pembanding bulan lalu'}
          </div>
        </div>

        {/* CARD 3: TABUNGAN & DANA CADANGAN (Dashed Border Card) */}
        <div style={{
          background: '#FFFFFF',
          borderRadius: 20,
          padding: '22px 24px',
          border: '1.5px dashed #A78BFA',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{
                width: 28,
                height: 28,
                borderRadius: 8,
                background: '#EDE9FE',
                color: '#7C3AED',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                <PiggyBank size={16} />
              </div>
              <span style={{
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: '0.08em',
                color: '#475569',
                textTransform: 'uppercase',
              }}>
                TABUNGAN & DANA CADANGAN
              </span>
            </div>

            <div style={{
              fontSize: 30,
              fontWeight: 800,
              color: '#0F172A',
              letterSpacing: '-0.02em',
              margin: '14px 0 4px 0',
            }}>
              {formatRupiah(summary.totalSavingsStored)}
            </div>

            <div style={{ fontSize: 13, color: '#64748B', lineHeight: 1.45, marginBottom: 14 }}>
              {summary.totalSavingsStored > 0
                ? 'Total akumulasi uang yang telah dialokasikan ke pos tabungan.'
                : 'Belum ada pos tabungan. Mulai dari dana darurat atau persiapan si kecil.'}
            </div>
          </div>

          <div>
            <button
              onClick={() => {
                if (onOpenAddGoal) onOpenAddGoal();
                else router.push('/goals');
              }}
              style={{
                background: '#FFFFFF',
                color: '#0F172A',
                border: '1.5px solid #0F172A',
                fontSize: 13,
                fontWeight: 600,
                padding: '7px 18px',
                borderRadius: 9999,
                cursor: 'pointer',
              }}
            >
              Buat pos tabungan
            </button>
          </div>
        </div>
      </div>

      {/* ─── MODAL TAMBAH SETORAN ─── */}
      {showAddModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(15, 23, 42, 0.5)',
          backdropFilter: 'blur(4px)',
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 16,
        }}>
          <div style={{
            background: '#FFFFFF',
            borderRadius: 20,
            padding: 24,
            width: '100%',
            maxWidth: 440,
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ fontSize: 18, fontWeight: 700, margin: 0, color: '#0F172A' }}>
                Tambah Setoran Kas Bersama
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748B', padding: 4 }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveSetoran}>
              {/* Pilih Anggota */}
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#475569', marginBottom: 8 }}>
                  Disetor Oleh:
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <button
                    type="button"
                    onClick={() => setPerson('asykar')}
                    style={{
                      padding: '10px 14px',
                      borderRadius: 12,
                      border: person === 'asykar' ? '2px solid #4F46E5' : '1px solid #E2E8F0',
                      background: person === 'asykar' ? '#EEF2FF' : '#FFFFFF',
                      color: person === 'asykar' ? '#4F46E5' : '#475569',
                      fontWeight: 700,
                      cursor: 'pointer',
                      fontSize: 13,
                    }}
                  >
                    Asykar (Suami)
                  </button>
                  <button
                    type="button"
                    onClick={() => setPerson('istri')}
                    style={{
                      padding: '10px 14px',
                      borderRadius: 12,
                      border: person === 'istri' ? '2px solid #BE185D' : '1px solid #E2E8F0',
                      background: person === 'istri' ? '#FDF2F8' : '#FFFFFF',
                      color: person === 'istri' ? '#BE185D' : '#475569',
                      fontWeight: 700,
                      cursor: 'pointer',
                      fontSize: 13,
                    }}
                  >
                    Riska (Istri)
                  </button>
                </div>
              </div>

              {/* Input Nominal */}
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#475569', marginBottom: 6 }}>
                  Nominal Setoran (Rp)
                </label>
                <input
                  type="number"
                  value={amountInput}
                  onChange={e => setAmountInput(e.target.value)}
                  placeholder="Contoh: 3000000"
                  required
                  autoFocus
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: 10,
                    border: '1px solid #CBD5E1',
                    fontSize: 15,
                    boxSizing: 'border-box',
                    outline: 'none',
                  }}
                />
              </div>

              {/* Input Keterangan */}
              <div style={{ marginBottom: 20 }}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#475569', marginBottom: 6 }}>
                  Keterangan (Opsional)
                </label>
                <input
                  type="text"
                  value={noteInput}
                  onChange={e => setNoteInput(e.target.value)}
                  placeholder={`Setoran ${person === 'asykar' ? 'Asykar' : 'Riska'}`}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: 10,
                    border: '1px solid #CBD5E1',
                    fontSize: 14,
                    boxSizing: 'border-box',
                    outline: 'none',
                  }}
                />
              </div>

              {/* Submit Buttons */}
              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  style={{
                    padding: '9px 16px',
                    borderRadius: 10,
                    border: '1px solid #E2E8F0',
                    background: '#FFFFFF',
                    color: '#64748B',
                    fontWeight: 600,
                    fontSize: 13,
                    cursor: 'pointer',
                  }}
                >
                  Batal
                </button>
                <button
                  type="submit"
                  style={{
                    padding: '9px 18px',
                    borderRadius: 10,
                    border: 'none',
                    background: '#4F46E5',
                    color: '#FFFFFF',
                    fontWeight: 700,
                    fontSize: 13,
                    cursor: 'pointer',
                  }}
                >
                  Simpan Setoran
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
