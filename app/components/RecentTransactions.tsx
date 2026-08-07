'use client';
import Link from 'next/link';
import { Pencil, Trash2, ArrowUpRight, ArrowDownLeft } from 'lucide-react';
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
  const displayed = showAll ? transactions : (limit ? transactions.slice(0, limit) : transactions);

  if (displayed.length === 0) {
    return (
      <div className="empty-state">
        <div className="empty-state-icon">
          💸
        </div>
        <h3>Belum ada transaksi</h3>
        <p>Mulai catat pemasukan dan pengeluaranmu hari ini — jejak keuangan yang baik dimulai dari sini! 💪</p>
      </div>
    );
  }

  return (
    <>
      {/* Desktop Table View */}
      <div className="table-wrap desktop-only-view">
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
            {displayed.map(t => {
              const timeStr = t.createdAt ? new Date(t.createdAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : '';
              return (
                <tr key={t.id}>
                  <td style={{ whiteSpace: 'nowrap', color: 'var(--text-muted)', fontSize: 13 }}>
                    <div>{formatDate(t.date, 'short')}</div>
                    {timeStr && <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{timeStr} WIB</div>}
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
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile Card List View */}
      <div className="mobile-only-view mobile-txn-list">
        {displayed.map(t => {
          const timeStr = t.createdAt ? new Date(t.createdAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : '';
          return (
            <div className="mobile-txn-item" key={t.id}>
              {/* LEFT: icon + info */}
              <div className="mobile-txn-left">
                <div className={`mobile-txn-icon ${t.type}`}>
                  {t.type === 'masuk' ? <ArrowDownLeft size={16} /> : <ArrowUpRight size={16} />}
                </div>
                <div className="mobile-txn-info">
                  <span className="mobile-txn-title">{t.note || t.category}</span>
                  <span className="mobile-txn-meta">
                    {formatDate(t.date, 'short')}{timeStr ? ` • ${timeStr}` : ''}
                  </span>
                  <span className={`chip ${t.type === 'masuk' ? 'chip-success' : 'chip-danger'}`} style={{ fontSize: 10, padding: '1px 6px', marginTop: 2, alignSelf: 'flex-start' }}>
                    {t.category}
                  </span>
                </div>
              </div>
              {/* RIGHT: amount + actions (compact) */}
              <div className="mobile-txn-right">
                <span className={`mobile-txn-amount ${t.type === 'masuk' ? 'amount-positive' : 'amount-negative'}`}>
                  {t.type === 'masuk' ? '+' : '-'}{formatCurrency(t.amount, true)}
                </span>
                {(onEdit || onDelete) && (
                  <div style={{ display: 'flex', gap: 2, alignItems: 'center', justifyContent: 'flex-end' }}>
                    {onEdit && (
                      <button className="btn btn-ghost btn-icon btn-sm" style={{ width: 24, height: 24, minHeight: 'unset' }} onClick={() => onEdit(t)} title="Edit">
                        <Pencil size={11} />
                      </button>
                    )}
                    {onDelete && (
                      <button className="btn btn-danger btn-icon btn-sm" style={{ width: 24, height: 24, minHeight: 'unset' }} onClick={() => onDelete(t.id)} title="Hapus">
                        <Trash2 size={11} />
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {!showAll && transactions.length > limit && (
        <div style={{ textAlign: 'center', marginTop: 16 }}>
          <Link href="/transactions" className="btn btn-secondary btn-sm">
            Lihat semua ({transactions.length}) →
          </Link>
        </div>
      )}
    </>
  );
}
