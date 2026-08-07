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
            <div className="mobile-txn-item" key={t.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, minWidth: 0, overflow: 'hidden' }}>
              {/* LEFT: icon + info */}
              <div className="mobile-txn-left" style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0, flex: 1, overflow: 'hidden' }}>
                <div className={`mobile-txn-icon ${t.type}`} style={{ flexShrink: 0 }}>
                  {t.type === 'masuk' ? <ArrowDownLeft size={16} /> : <ArrowUpRight size={16} />}
                </div>
                <div className="mobile-txn-info" style={{ display: 'flex', flexDirection: 'column', minWidth: 0, flex: 1, overflow: 'hidden' }}>
                  <span className="mobile-txn-title" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontSize: 13, fontWeight: 600, display: 'block' }}>
                    {t.note || t.category}
                  </span>
                  <span className="mobile-txn-meta" style={{ fontSize: 11, color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {formatDate(t.date, 'short')}{timeStr ? ` • ${timeStr}` : ''}
                  </span>
                  <span className={`chip ${t.type === 'masuk' ? 'chip-success' : 'chip-danger'}`} style={{ fontSize: 10, padding: '1px 6px', marginTop: 2, alignSelf: 'flex-start', flexShrink: 0 }}>
                    {t.category}
                  </span>
                </div>
              </div>
              {/* RIGHT: amount + actions (compact) */}
              <div className="mobile-txn-right" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 3, flexShrink: 0, minWidth: 0 }}>
                <span className={`mobile-txn-amount ${t.type === 'masuk' ? 'amount-positive' : 'amount-negative'}`} style={{ fontSize: 12, fontWeight: 700, whiteSpace: 'nowrap' }}>
                  {t.type === 'masuk' ? '+' : '-'}{formatCurrency(t.amount)}
                </span>
                {(onEdit || onDelete) && (
                  <div style={{ display: 'flex', gap: 2, alignItems: 'center', justifyContent: 'flex-end', flexShrink: 0 }}>
                    {onEdit && (
                      <button className="btn btn-ghost btn-icon btn-sm" style={{ width: 24, height: 24, minHeight: 'unset', padding: 0 }} onClick={() => onEdit(t)} title="Edit">
                        <Pencil size={11} />
                      </button>
                    )}
                    {onDelete && (
                      <button className="btn btn-danger btn-icon btn-sm" style={{ width: 24, height: 24, minHeight: 'unset', padding: 0 }} onClick={() => onDelete(t.id)} title="Hapus">
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
