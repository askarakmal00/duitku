'use client';
import Link from 'next/link';
import { Pencil, Trash2 } from 'lucide-react';
import { Transaction } from '@/lib/types';
import { formatCurrency, formatDate } from '@/lib/helpers';

interface RecentTransactionsProps {
  transactions: Transaction[];
  limit?: number;
  showAll?: boolean;
  onEdit?: (t: Transaction) => void;
  onDelete?: (id: string) => void;
}

export default function RecentTransactions({
  transactions, limit = 5, showAll = false, onEdit, onDelete
}: RecentTransactionsProps) {
  const displayed = limit ? transactions.slice(0, limit) : transactions;

  if (displayed.length === 0) {
    return (
      <div className="empty-state">
        <div className="empty-state-icon">
          <span style={{ fontSize: 28 }}>💸</span>
        </div>
        <h3>Belum ada transaksi</h3>
        <p>Tambahkan transaksi pertama Anda</p>
      </div>
    );
  }

  return (
    <>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Tanggal</th>
              <th>Keterangan</th>
              <th>Kategori</th>
              <th style={{ textAlign: 'right' }}>Jumlah</th>
              {(onEdit || onDelete) && <th></th>}
            </tr>
          </thead>
          <tbody>
            {displayed.map(t => (
              <tr key={t.id}>
                <td style={{ whiteSpace: 'nowrap', color: 'var(--text-muted)', fontSize: 13 }}>
                  {formatDate(t.date, 'short')}
                </td>
                <td>
                  <div style={{ fontWeight: 500 }}>{t.note || t.category}</div>
                  {t.subCategory && (
                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{t.subCategory}</div>
                  )}
                </td>
                <td>
                  <span className={`chip ${t.type === 'masuk' ? 'chip-success' : 'chip-danger'}`}>
                    {t.category}
                  </span>
                </td>
                <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                  <span className={t.type === 'masuk' ? 'amount-positive' : 'amount-negative'}>
                    {t.type === 'masuk' ? '+' : '-'}{formatCurrency(t.amount)}
                  </span>
                </td>
                {(onEdit || onDelete) && (
                  <td>
                    <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end' }}>
                      {onEdit && (
                        <button className="btn btn-ghost btn-icon btn-sm" onClick={() => onEdit(t)} title="Edit">
                          <Pencil size={14} />
                        </button>
                      )}
                      {onDelete && (
                        <button className="btn btn-danger btn-icon btn-sm" onClick={() => onDelete(t.id)} title="Hapus">
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!showAll && transactions.length > limit && (
        <div style={{ textAlign: 'center', marginTop: 16 }}>
          <Link href="/transactions" className="btn btn-secondary btn-sm">
            Lihat semua ({transactions.length})
          </Link>
        </div>
      )}
    </>
  );
}
