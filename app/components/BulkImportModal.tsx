'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  X,
  Upload,
  Download,
  FileSpreadsheet,
  AlertCircle,
  CheckCircle2,
  HelpCircle,
  Clipboard,
  Trash2,
  RefreshCw,
  Info
} from 'lucide-react';
import { Category, BudgetPos, SavingGoal } from '@/lib/types';
import { getCategories, getBudgetPos, getSavingGoals, addBulkTransactions } from '@/lib/store';
import { formatCurrency, toInputDate } from '@/lib/helpers';

interface BulkImportModalProps {
  onSuccess: () => void;
  onClose: () => void;
}

interface ParsedRow {
  rowNumber: number;
  raw: Record<string, string>;
  data: {
    date: string;
    type: 'masuk' | 'keluar';
    category: string;
    amount: number;
    note: string;
    budgetPosId?: string;
    goalId?: string;
    budgetPosName?: string;
    goalName?: string;
  };
  isValid: boolean;
  errors: string[];
}

export default function BulkImportModal({ onSuccess, onClose }: BulkImportModalProps) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [budgetPosList, setBudgetPosList] = useState<BudgetPos[]>([]);
  const [goals, setGoals] = useState<SavingGoal[]>([]);

  const [activeTab, setActiveTab] = useState<'upload' | 'paste'>('upload');
  const [inputText, setInputText] = useState('');
  const [fileName, setFileName] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [importStatus, setImportStatus] = useState<{ successCount?: number; message?: string } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setCategories(getCategories());
    setBudgetPosList(getBudgetPos());
    setGoals(getSavingGoals());
  }, []);

  // Category lists
  const incomeCategoryNames = useMemo(() => {
    return categories
      .filter(c => c.type === 'masuk' || c.type === 'both')
      .map(c => c.name);
  }, [categories]);

  const expenseCategoryNames = useMemo(() => {
    return categories
      .filter(c => c.type === 'keluar' || c.type === 'both')
      .map(c => c.name);
  }, [categories]);

  const allCategoryNames = useMemo(() => {
    return Array.from(new Set(categories.map(c => c.name)));
  }, [categories]);

  // CSV / Delimited parser
  const parseCSVText = (text: string): { headers: string[]; rows: string[][] } => {
    const lines = text
      .split(/\r\n|\n|\r/)
      .map(l => l.trim())
      .filter(l => l.length > 0);

    if (lines.length === 0) return { headers: [], rows: [] };

    // Determine delimiter
    const firstLine = lines[0];
    let delimiter = ',';
    if (firstLine.includes('\t')) delimiter = '\t';
    else if (firstLine.includes(';') && (firstLine.split(';').length > firstLine.split(',').length)) {
      delimiter = ';';
    }

    const parseLine = (line: string): string[] => {
      const result: string[] = [];
      let cur = '';
      let inQuotes = false;

      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"' || char === "'") {
          inQuotes = !inQuotes;
        } else if (char === delimiter && !inQuotes) {
          result.push(cur.trim());
          cur = '';
        } else {
          cur += char;
        }
      }
      result.push(cur.trim());
      return result;
    };

    const headers = parseLine(lines[0]).map(h => h.toLowerCase().replace(/['"]/g, '').trim());
    const dataRows = lines.slice(1).map(parseLine);

    return { headers, rows: dataRows };
  };

  // Date standardizer (handles YYYY-MM-DD, DD/MM/YYYY, DD-MM-YYYY, YYYY/MM/DD)
  const standardizeDate = (val: string): string | null => {
    if (!val) return null;
    const clean = val.replace(/['"]/g, '').trim();

    // Match YYYY-MM-DD or YYYY/MM/DD
    if (/^\d{4}[-/]\d{1,2}[-/]\d{1,2}$/.test(clean)) {
      const parts = clean.split(/[-/]/);
      const y = parts[0];
      const m = parts[1].padStart(2, '0');
      const d = parts[2].padStart(2, '0');
      return `${y}-${m}-${d}`;
    }

    // Match DD-MM-YYYY or DD/MM/YYYY
    if (/^\d{1,2}[-/]\d{1,2}[-/]\d{4}$/.test(clean)) {
      const parts = clean.split(/[-/]/);
      const d = parts[0].padStart(2, '0');
      const m = parts[1].padStart(2, '0');
      const y = parts[2];
      return `${y}-${m}-${d}`;
    }

    const parsed = new Date(clean);
    if (!isNaN(parsed.getTime())) {
      return toInputDate(parsed.toISOString());
    }

    return null;
  };

  // Amount standardizer
  const standardizeAmount = (val: string): number | null => {
    if (!val) return null;
    let clean = val.replace(/[^0-9.,-]/g, '').trim();
    if (!clean) return null;

    if (clean.includes('.') && clean.includes(',')) {
      if (clean.lastIndexOf(',') > clean.lastIndexOf('.')) {
        clean = clean.replace(/\./g, '').replace(',', '.');
      } else {
        clean = clean.replace(/,/g, '');
      }
    } else if (clean.includes('.')) {
      const parts = clean.split('.');
      if (parts.length > 2 || (parts.length === 2 && parts[1].length === 3)) {
        clean = clean.replace(/\./g, '');
      }
    } else if (clean.includes(',')) {
      const parts = clean.split(',');
      if (parts.length > 2 || (parts.length === 2 && parts[1].length === 3)) {
        clean = clean.replace(/,/g, '');
      } else {
        clean = clean.replace(',', '.');
      }
    }

    const num = parseFloat(clean);
    return isNaN(num) || num <= 0 ? null : Math.round(num);
  };

  // Parse and validate rows
  const parsedRows: ParsedRow[] = useMemo(() => {
    if (!inputText.trim()) return [];

    const { headers, rows } = parseCSVText(inputText);
    if (rows.length === 0) return [];

    const findColIdx = (keywords: string[]): number => {
      return headers.findIndex(h => keywords.some(kw => h.includes(kw)));
    };

    const dateIdx = findColIdx(['tanggal', 'date', 'tgl', 'waktu']);
    const typeIdx = findColIdx(['tipe', 'type', 'jenis', 'arah', 'flow']);
    const categoryIdx = findColIdx(['kategori', 'category', 'kat', 'pos']);
    const amountIdx = findColIdx(['jumlah', 'amount', 'nominal', 'total', 'nilai', 'harga', 'debit', 'kredit']);
    const noteIdx = findColIdx(['keterangan', 'note', 'deskripsi', 'catatan', 'memo', 'ket']);
    const budgetIdx = findColIdx(['pos_anggaran', 'pos anggaran', 'budget', 'anggaran', 'pos_budget']);
    const goalIdx = findColIdx(['target_tabungan', 'target tabungan', 'goal', 'target', 'tabungan_goal']);

    return rows.map((row, idx) => {
      const rowNum = idx + 2;
      const errors: string[] = [];

      const rawDate = dateIdx !== -1 && row[dateIdx] !== undefined ? row[dateIdx] : (row[0] || '');
      const rawType = typeIdx !== -1 && row[typeIdx] !== undefined ? row[typeIdx] : (row[1] || '');
      const rawCategory = categoryIdx !== -1 && row[categoryIdx] !== undefined ? row[categoryIdx] : (row[2] || '');
      const rawAmount = amountIdx !== -1 && row[amountIdx] !== undefined ? row[amountIdx] : (row[3] || '');
      const rawNote = noteIdx !== -1 && row[noteIdx] !== undefined ? row[noteIdx] : (row[4] || '');
      const rawBudget = budgetIdx !== -1 && row[budgetIdx] !== undefined ? row[budgetIdx] : (row[5] || '');
      const rawGoal = goalIdx !== -1 && row[goalIdx] !== undefined ? row[goalIdx] : (row[6] || '');

      // 1. Validate Date
      const date = standardizeDate(rawDate);
      if (!date) {
        errors.push(`Tanggal tidak valid: "${rawDate}". Format: YYYY-MM-DD`);
      }

      // 2. Validate Type
      let type: 'masuk' | 'keluar' = 'keluar';
      const cleanType = rawType.toLowerCase().trim();
      if (['masuk', 'pemasukan', 'income', 'in', '+', 'debit', 'penerimaan'].includes(cleanType)) {
        type = 'masuk';
      } else if (['keluar', 'pengeluaran', 'expense', 'out', '-', 'kredit', 'belanja'].includes(cleanType)) {
        type = 'keluar';
      } else {
        errors.push(`Tipe tidak valid: "${rawType}". Gunakan "masuk" atau "keluar"`);
      }

      // 3. Validate Category
      let category = rawCategory.trim();
      if (!category) {
        errors.push('Kategori tidak boleh kosong');
      } else {
        const matched = allCategoryNames.find(c => c.toLowerCase() === category.toLowerCase());
        if (matched) {
          category = matched;
        } else {
          errors.push(`Kategori "${rawCategory}" belum terdaftar`);
        }
      }

      // 4. Validate Amount
      const amount = standardizeAmount(rawAmount);
      if (amount === null) {
        errors.push(`Nominal tidak valid: "${rawAmount}". Harus angka > 0`);
      }

      // 5. Match Budget Pos
      let budgetPosId: string | undefined = undefined;
      let budgetPosName: string | undefined = undefined;
      if (rawBudget.trim()) {
        const foundBudget = budgetPosList.find(b =>
          b.name.toLowerCase() === rawBudget.trim().toLowerCase() || b.id === rawBudget.trim()
        );
        if (foundBudget) {
          budgetPosId = foundBudget.id;
          budgetPosName = foundBudget.name;
        }
      }

      // 6. Match Goal
      let goalId: string | undefined = undefined;
      let goalName: string | undefined = undefined;
      if (rawGoal.trim()) {
        const foundGoal = goals.find(g =>
          g.name.toLowerCase() === rawGoal.trim().toLowerCase() || g.id === rawGoal.trim()
        );
        if (foundGoal) {
          goalId = foundGoal.id;
          goalName = foundGoal.name;
        }
      }

      return {
        rowNumber: rowNum,
        raw: {
          date: rawDate,
          type: rawType,
          category: rawCategory,
          amount: rawAmount,
          note: rawNote,
          budget: rawBudget,
          goal: rawGoal
        },
        data: {
          date: date || toInputDate(),
          type,
          category: category || 'Lainnya',
          amount: amount || 0,
          note: rawNote.replace(/['"]/g, '').trim(),
          budgetPosId,
          goalId,
          budgetPosName,
          goalName,
        },
        isValid: errors.length === 0,
        errors,
      };
    });
  }, [inputText, allCategoryNames, budgetPosList, goals]);

  const validRows = useMemo(() => parsedRows.filter(r => r.isValid), [parsedRows]);
  const invalidRows = useMemo(() => parsedRows.filter(r => !r.isValid), [parsedRows]);

  const totalValidIncome = useMemo(() => {
    return validRows
      .filter(r => r.data.type === 'masuk')
      .reduce((sum, r) => sum + r.data.amount, 0);
  }, [validRows]);

  const totalValidExpense = useMemo(() => {
    return validRows
      .filter(r => r.data.type === 'keluar')
      .reduce((sum, r) => sum + r.data.amount, 0);
  }, [validRows]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    readFile(file);
  };

  const readFile = (file: File) => {
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        setInputText(content);
      }
    };
    reader.readAsText(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      readFile(file);
    }
  };

  // Download Sample CSV
  const handleDownloadSample = () => {
    const sampleHeader = 'tanggal,tipe,kategori,jumlah,keterangan,pos_anggaran,target_tabungan\n';
    const sampleRows = [
      `2026-09-01,masuk,Gaji,7500000,Gaji Pokok Bulanan,,`,
      `2026-09-02,keluar,Makan,45000,Makan siang nasi padang,${budgetPosList[0]?.name || ''},`,
      `2026-09-02,keluar,Transport,25000,Bensin motor dan parkir,${budgetPosList[1]?.name || ''},`,
      `2026-09-03,keluar,Tagihan,350000,Tagihan Listrik PLN dan Internet,${budgetPosList[2]?.name || ''},`,
      `2026-09-04,keluar,Kebutuhan Rumah Tangga,185000,Belanja sabun dan sembako,${budgetPosList[0]?.name || ''},`,
      `2026-09-05,masuk,Bonus,1000000,Bonus project sampingan,,`,
      `2026-09-06,keluar,Kesehatan,85000,Beli multivitamin dan suplemen,,`,
      `2026-09-07,keluar,Hiburan,75000,Nonton bioskop akhir pekan,,`,
      `2026-09-08,keluar,Belanja,120000,Beli pakaian baru,,`,
      `2026-09-09,keluar,Tabungan,500000,Setoran rutin tabungan,,${goals[0]?.name || ''}`,
      `2026-09-10,masuk,Investasi,250000,Dividen reksadana / saham,,`,
      `2026-09-11,keluar,Hutang,200000,Pembayaran cicilan / hutang,,`,
      `2026-09-12,keluar,Lainnya,35000,Biaya admin & donasi,,`,
    ].join('\n');

    const csvContent = sampleHeader + sampleRows;
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'sample_import_transaksi.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExecuteImport = async () => {
    if (validRows.length === 0) return;

    setIsSubmitting(true);
    try {
      const itemsToInsert = validRows.map(r => ({
        type: r.data.type,
        category: r.data.category,
        amount: r.data.amount,
        note: r.data.note,
        date: r.data.date,
        budgetPosId: r.data.budgetPosId,
        goalId: r.data.goalId,
      }));

      await addBulkTransactions(itemsToInsert);

      setImportStatus({
        successCount: validRows.length,
        message: `Berhasil mengimpor ${validRows.length} transaksi ke dalam aplikasi!`
      });

      setTimeout(() => {
        onSuccess();
      }, 1000);
    } catch (err: any) {
      alert('Terjadi kesalahan saat mengimpor transaksi: ' + (err.message || 'Unknown error'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReset = () => {
    setInputText('');
    setFileName(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    setImportStatus(null);
  };

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 840, width: '95vw', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>
        {/* Header */}
        <div className="modal-header" style={{ paddingBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 'var(--radius-sm)',
                background: 'var(--primary-100)',
                color: 'var(--primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <FileSpreadsheet size={20} />
            </div>
            <div>
              <span className="modal-title" style={{ fontSize: 17, fontWeight: 700 }}>Bulk Import Transaksi</span>
              <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>
                Import banyak transaksi sekaligus via file CSV atau tabel teks
              </p>
            </div>
          </div>
          <button className="modal-close" onClick={onClose} aria-label="Tutup">
            <X size={16} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="modal-body" style={{ flex: 1, overflowY: 'auto', padding: '16px 24px' }}>
          {/* Success Banner */}
          {importStatus && (
            <div
              style={{
                background: 'var(--success-bg)',
                border: '1px solid var(--success-light)',
                borderRadius: 'var(--radius-sm)',
                padding: '16px 20px',
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                color: 'var(--success)',
                marginBottom: 20,
                fontWeight: 600,
              }}
            >
              <CheckCircle2 size={24} />
              <div>
                <div>{importStatus.message}</div>
                <div style={{ fontSize: 12, fontWeight: 400, marginTop: 2 }}>Menyegarkan data transaksi...</div>
              </div>
            </div>
          )}

          {/* Action Row: Sample download & Category Guide toggle */}
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 10,
              background: 'var(--bg-secondary)',
              padding: '12px 16px',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--border)',
              marginBottom: 16,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Info size={16} style={{ color: 'var(--primary)', flexShrink: 0 }} />
              <span style={{ fontSize: 13, color: 'var(--text-primary)', fontWeight: 500 }}>
                Gunakan template sample CSV agar format kolom & kategori sesuai
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <button
                type="button"
                className="btn btn-ghost"
                onClick={handleDownloadSample}
                style={{ fontSize: 12, padding: '6px 12px', gap: 6 }}
                title="Download file contoh CSV"
              >
                <Download size={14} /> Download Sample CSV
              </button>

              <button
                type="button"
                className={`btn ${showGuide ? 'btn-primary' : 'btn-ghost'}`}
                onClick={() => setShowGuide(!showGuide)}
                style={{ fontSize: 12, padding: '6px 12px', gap: 6 }}
              >
                <HelpCircle size={14} /> {showGuide ? 'Tutup Panduan' : 'Panduan Kategori & Format'}
              </button>
            </div>
          </div>

          {/* Expandable Guide Panel */}
          {showGuide && (
            <div
              style={{
                background: 'var(--card)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-sm)',
                padding: '16px',
                marginBottom: 16,
                fontSize: 12.5,
              }}
            >
              <div style={{ fontWeight: 700, marginBottom: 8, color: 'var(--text-primary)', fontSize: 13 }}>
                📋 Format Kolom yang Tersedia:
              </div>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                  gap: 8,
                  marginBottom: 14,
                }}
              >
                <div style={{ background: 'var(--bg-secondary)', padding: '8px 10px', borderRadius: 6 }}>
                  <strong>1. tanggal:</strong> YYYY-MM-DD (cth: <code>2026-09-25</code>)
                </div>
                <div style={{ background: 'var(--bg-secondary)', padding: '8px 10px', borderRadius: 6 }}>
                  <strong>2. tipe:</strong> <code>masuk</code> atau <code>keluar</code>
                </div>
                <div style={{ background: 'var(--bg-secondary)', padding: '8px 10px', borderRadius: 6 }}>
                  <strong>3. kategori:</strong> Nama kategori aplikasi
                </div>
                <div style={{ background: 'var(--bg-secondary)', padding: '8px 10px', borderRadius: 6 }}>
                  <strong>4. jumlah:</strong> Nominal angka (cth: <code>50000</code>)
                </div>
                <div style={{ background: 'var(--bg-secondary)', padding: '8px 10px', borderRadius: 6 }}>
                  <strong>5. keterangan:</strong> Catatan transaksi (opsional)
                </div>
                <div style={{ background: 'var(--bg-secondary)', padding: '8px 10px', borderRadius: 6 }}>
                  <strong>6. pos_anggaran:</strong> Nama pos (opsional)
                </div>
                <div style={{ background: 'var(--bg-secondary)', padding: '8px 10px', borderRadius: 6 }}>
                  <strong>7. target_tabungan:</strong> Nama goal (opsional)
                </div>
              </div>

              <div style={{ fontWeight: 700, marginBottom: 6, color: 'var(--text-primary)', fontSize: 13 }}>
                🏷️ Daftar Kategori yang Tersedia di Aplikasi:
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <div>
                  <span style={{ color: 'var(--success)', fontWeight: 600 }}>↑ Pemasukan: </span>
                  <div style={{ display: 'inline-flex', flexWrap: 'wrap', gap: 4, marginTop: 4 }}>
                    {incomeCategoryNames.map(c => (
                      <span
                        key={c}
                        style={{
                          background: 'var(--success-bg)',
                          color: 'var(--success)',
                          padding: '2px 8px',
                          borderRadius: 4,
                          fontSize: 11,
                          fontWeight: 500,
                        }}
                      >
                        {c}
                      </span>
                    ))}
                  </div>
                </div>

                <div style={{ marginTop: 4 }}>
                  <span style={{ color: 'var(--danger)', fontWeight: 600 }}>↓ Pengeluaran: </span>
                  <div style={{ display: 'inline-flex', flexWrap: 'wrap', gap: 4, marginTop: 4 }}>
                    {expenseCategoryNames.map(c => (
                      <span
                        key={c}
                        style={{
                          background: 'var(--danger-bg)',
                          color: 'var(--danger)',
                          padding: '2px 8px',
                          borderRadius: 4,
                          fontSize: 11,
                          fontWeight: 500,
                        }}
                      >
                        {c}
                      </span>
                    ))}
                  </div>
                </div>

                {budgetPosList.length > 0 && (
                  <div style={{ marginTop: 4 }}>
                    <span style={{ color: 'var(--primary)', fontWeight: 600 }}>🎯 Pos Anggaran Terdaftar: </span>
                    <div style={{ display: 'inline-flex', flexWrap: 'wrap', gap: 4, marginTop: 4 }}>
                      {budgetPosList.map(b => (
                        <span
                          key={b.id}
                          style={{
                            background: 'var(--primary-100)',
                            color: 'var(--primary)',
                            padding: '2px 8px',
                            borderRadius: 4,
                            fontSize: 11,
                            fontWeight: 500,
                          }}
                        >
                          {b.name}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {goals.length > 0 && (
                  <div style={{ marginTop: 4 }}>
                    <span style={{ color: 'var(--amber)', fontWeight: 600 }}>🏆 Target Tabungan Terdaftar: </span>
                    <div style={{ display: 'inline-flex', flexWrap: 'wrap', gap: 4, marginTop: 4 }}>
                      {goals.map(g => (
                        <span
                          key={g.id}
                          style={{
                            background: 'var(--warning-bg)',
                            color: 'var(--amber)',
                            padding: '2px 8px',
                            borderRadius: 4,
                            fontSize: 11,
                            fontWeight: 500,
                          }}
                        >
                          {g.name}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Input Method Tabs */}
          {!inputText && (
            <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
              <button
                type="button"
                className={`filter-chip ${activeTab === 'upload' ? 'active' : ''}`}
                onClick={() => setActiveTab('upload')}
                style={{ flex: 1, justifyContent: 'center' }}
              >
                <Upload size={14} /> Unggah File CSV
              </button>
              <button
                type="button"
                className={`filter-chip ${activeTab === 'paste' ? 'active' : ''}`}
                onClick={() => setActiveTab('paste')}
                style={{ flex: 1, justifyContent: 'center' }}
              >
                <Clipboard size={14} /> Paste Teks / Spreadsheet
              </button>
            </div>
          )}

          {/* Upload Dropzone */}
          {activeTab === 'upload' && !inputText && (
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              style={{
                border: isDragging ? '2px dashed var(--primary)' : '2px dashed var(--border)',
                borderRadius: 'var(--radius)',
                padding: '36px 20px',
                textAlign: 'center',
                background: isDragging ? 'var(--primary-50)' : 'var(--bg-secondary)',
                cursor: 'pointer',
                transition: 'all var(--transition)',
              }}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.tsv,.txt"
                onChange={handleFileChange}
                style={{ display: 'none' }}
              />
              <div
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: '50%',
                  background: 'var(--primary-100)',
                  color: 'var(--primary)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 12px',
                }}
              >
                <Upload size={24} />
              </div>
              <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>
                Klik untuk memilih file atau seret file CSV ke sini
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                Mendukung file .CSV, .TSV, atau .TXT (format pemisah koma / titik koma / tab)
              </div>
            </div>
          )}

          {/* Textarea Paste */}
          {activeTab === 'paste' && !inputText && (
            <div>
              <textarea
                className="form-input"
                style={{
                  minHeight: 160,
                  fontFamily: 'monospace',
                  fontSize: 12,
                  whiteSpace: 'pre',
                  lineHeight: 1.5,
                }}
                placeholder="Paste data transaksi di sini (misal disalin dari Excel atau file CSV)&#10;Contoh:&#10;tanggal,tipe,kategori,jumlah,keterangan&#10;2026-09-01,masuk,Gaji,5000000,Gaji bulanan&#10;2026-09-02,keluar,Makan,35000,Makan siang"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
              />
            </div>
          )}

          {/* Preview Section when input is populated */}
          {inputText && (
            <div>
              {/* Summary Toolbar above table */}
              <div
                style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 12,
                  marginBottom: 12,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>
                    Pratinjau Data {fileName && <span style={{ fontWeight: 400, color: 'var(--text-secondary)' }}>({fileName})</span>}
                  </div>
                  <span
                    style={{
                      background: validRows.length > 0 ? 'var(--success-bg)' : 'var(--bg-secondary)',
                      color: validRows.length > 0 ? 'var(--success)' : 'var(--text-muted)',
                      padding: '2px 8px',
                      borderRadius: 12,
                      fontSize: 11,
                      fontWeight: 600,
                    }}
                  >
                    {validRows.length} Valid
                  </span>
                  {invalidRows.length > 0 && (
                    <span
                      style={{
                        background: 'var(--danger-bg)',
                        color: 'var(--danger)',
                        padding: '2px 8px',
                        borderRadius: 12,
                        fontSize: 11,
                        fontWeight: 600,
                      }}
                    >
                      {invalidRows.length} Error
                    </span>
                  )}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <button
                    type="button"
                    className="btn btn-ghost"
                    onClick={handleReset}
                    style={{ fontSize: 12, padding: '4px 8px', gap: 4, color: 'var(--danger)' }}
                  >
                    <Trash2 size={13} /> Ganti File / Reset
                  </button>
                </div>
              </div>

              {/* Stat Summary Box */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
                  gap: 10,
                  background: 'var(--bg-secondary)',
                  padding: '12px',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border)',
                  marginBottom: 14,
                }}
              >
                <div>
                  <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>Total Baris Terbaca</div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>{parsedRows.length}</div>
                </div>
                <div>
                  <div style={{ fontSize: 11, color: 'var(--success)' }}>Total Masuk (+Rp)</div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--success)' }}>{formatCurrency(totalValidIncome)}</div>
                </div>
                <div>
                  <div style={{ fontSize: 11, color: 'var(--danger)' }}>Total Keluar (-Rp)</div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--danger)' }}>{formatCurrency(totalValidExpense)}</div>
                </div>
              </div>

              {/* Data Table */}
              <div
                style={{
                  maxHeight: 280,
                  overflowY: 'auto',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-sm)',
                  background: 'var(--card)',
                }}
              >
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                  <thead>
                    <tr style={{ background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border)', textAlign: 'left' }}>
                      <th style={{ padding: '8px 10px', width: 40 }}>#</th>
                      <th style={{ padding: '8px 10px', width: 60 }}>Status</th>
                      <th style={{ padding: '8px 10px', width: 95 }}>Tanggal</th>
                      <th style={{ padding: '8px 10px', width: 85 }}>Tipe</th>
                      <th style={{ padding: '8px 10px' }}>Kategori</th>
                      <th style={{ padding: '8px 10px', textAlign: 'right' }}>Nominal</th>
                      <th style={{ padding: '8px 10px' }}>Keterangan</th>
                      <th style={{ padding: '8px 10px' }}>Pos / Target</th>
                    </tr>
                  </thead>
                  <tbody>
                    {parsedRows.map((r, i) => (
                      <tr
                        key={i}
                        style={{
                          borderBottom: '1px solid var(--divider)',
                          background: r.isValid ? 'transparent' : 'var(--danger-bg-deep)',
                        }}
                      >
                        <td style={{ padding: '8px 10px', color: 'var(--text-muted)' }}>{r.rowNumber}</td>
                        <td style={{ padding: '8px 10px' }}>
                          {r.isValid ? (
                            <span
                              title="Valid"
                              style={{
                                color: 'var(--success)',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 4,
                                fontSize: 11,
                                fontWeight: 600,
                              }}
                            >
                              <CheckCircle2 size={14} /> OK
                            </span>
                          ) : (
                            <span
                              title={r.errors.join(', ')}
                              style={{
                                color: 'var(--danger)',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 4,
                                fontSize: 11,
                                fontWeight: 600,
                                cursor: 'help',
                              }}
                            >
                              <AlertCircle size={14} /> Error
                            </span>
                          )}
                        </td>
                        <td style={{ padding: '8px 10px', whiteSpace: 'nowrap' }}>
                          {r.data.date}
                        </td>
                        <td style={{ padding: '8px 10px' }}>
                          <span
                            style={{
                              padding: '2px 6px',
                              borderRadius: 4,
                              fontSize: 10,
                              fontWeight: 600,
                              background: r.data.type === 'masuk' ? 'var(--success-bg)' : 'var(--danger-bg)',
                              color: r.data.type === 'masuk' ? 'var(--success)' : 'var(--danger)',
                            }}
                          >
                            {r.data.type === 'masuk' ? '↑ Masuk' : '↓ Keluar'}
                          </span>
                        </td>
                        <td style={{ padding: '8px 10px', fontWeight: 500 }}>
                          {r.data.category}
                        </td>
                        <td
                          style={{
                            padding: '8px 10px',
                            textAlign: 'right',
                            fontWeight: 600,
                            color: r.data.type === 'masuk' ? 'var(--success)' : 'var(--danger)',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {formatCurrency(r.data.amount)}
                        </td>
                        <td
                          style={{
                            padding: '8px 10px',
                            maxWidth: 160,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            color: 'var(--text-secondary)',
                          }}
                          title={r.data.note}
                        >
                          {r.data.note || '-'}
                        </td>
                        <td style={{ padding: '8px 10px', fontSize: 11, color: 'var(--text-secondary)' }}>
                          {r.data.budgetPosName ? (
                            <span style={{ color: 'var(--primary)' }}>💼 {r.data.budgetPosName}</span>
                          ) : r.data.goalName ? (
                            <span style={{ color: 'var(--amber)' }}>🎯 {r.data.goalName}</span>
                          ) : (
                            '-'
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Error messages detail list if any */}
              {invalidRows.length > 0 && (
                <div
                  style={{
                    marginTop: 10,
                    background: 'var(--danger-bg-deep)',
                    border: '1px solid var(--danger-light)',
                    borderRadius: 'var(--radius-sm)',
                    padding: '10px 14px',
                    fontSize: 12,
                    color: 'var(--danger)',
                  }}
                >
                  <div style={{ fontWeight: 600, marginBottom: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <AlertCircle size={14} /> Ditemukan {invalidRows.length} baris tidak valid (akan dilewati):
                  </div>
                  <ul style={{ paddingLeft: 18, margin: 0 }}>
                    {invalidRows.slice(0, 5).map(r => (
                      <li key={r.rowNumber}>
                        Baris {r.rowNumber}: {r.errors.join(' | ')}
                      </li>
                    ))}
                    {invalidRows.length > 5 && (
                      <li>...dan {invalidRows.length - 5} baris lainnya</li>
                    )}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="modal-footer" style={{ borderTop: '1px solid var(--border)', padding: '14px 24px' }}>
          <button type="button" className="btn btn-ghost" onClick={onClose} disabled={isSubmitting}>
            Batal
          </button>

          <button
            type="button"
            className="btn btn-primary"
            onClick={handleExecuteImport}
            disabled={validRows.length === 0 || isSubmitting}
            style={{ minWidth: 160, gap: 6 }}
          >
            {isSubmitting ? (
              <>
                <RefreshCw size={14} className="animate-spin" /> Mengimpor...
              </>
            ) : (
              <>
                <Upload size={14} />
                Import {validRows.length > 0 ? `${validRows.length} Transaksi` : ''}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
