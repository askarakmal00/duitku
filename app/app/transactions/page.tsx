'use client';
import { useEffect, useState } from 'react';
import { Plus, Search, Filter } from 'lucide-react';
import Header from '@/components/Header';
import RecentTransactions from '@/components/RecentTransactions';
import TransactionModal from '@/components/TransactionModal';
import {
  getTransactions, addTransaction, updateTransaction, deleteTransaction
} from '@/lib/store';
import { Transaction } from '@/lib/types';
import { formatCurrency, getCurrentMonth } from '@/lib/helpers';

import ConfirmDeleteModal from '@/components/ConfirmDeleteModal';

type Filter = 'semua' | 'masuk' | 'keluar' | 'bulan-ini';

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [filter, setFilter] = useState<Filter>('semua');
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editTarget, setEditTarget] = useState<Transaction | undefined>();
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const load = () => setTransactions(getTransactions());
  useEffect(() => { load(); }, []);

  const { year, month } = getCurrentMonth();

  const filtered = transactions.filter(t => {
    if (filter === 'masuk' && t.type !== 'masuk') return false;
    if (filter === 'keluar' && t.type !== 'keluar') return false;
    if (filter === 'bulan-ini') {
      const d = new Date(t.date);
      if (d.getFullYear() !== year || d.getMonth() + 1 !== month) return false;
    }
    if (search) {
      const q = search.toLowerCase();
      if (!t.note?.toLowerCase().includes(q) && !t.category.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  const totalIn = filtered.filter(t => t.type === 'masuk').reduce((s, t) => s + t.amount, 0);
  const totalOut = filtered.filter(t => t.type === 'keluar').reduce((s, t) => s + t.amount, 0);

  const handleSave = async (data: Omit<Transaction, 'id' | 'createdAt'>) => {
    if (editTarget) {
      await updateTransaction(editTarget.id, data);
    } else {
      await addTransaction(data);
    }
    setShowModal(false);
    setEditTarget(undefined);
    load();
  };

  const handleEdit = (t: Transaction) => {
    setEditTarget(t);
    setShowModal(true);
  };

  const handleDeleteRequest = (id: string) => {
    setDeleteId(id);
  };

  const handleConfirmDelete = async () => {
    if (!deleteId) return;
    setIsDeleting(true);
    try {
      await deleteTransaction(deleteId);
      load();
    } finally {
      setIsDeleting(false);
      setDeleteId(null);
    }
  };

  return (
    <>
      <Header title="Transaksi" subtitle="Kelola semua pemasukan dan pengeluaran" />

      <div className="page-container">
        {/* Stats Row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 16, marginBottom: 24 }}>
          <div className="card" style={{ padding: '16px 20px' }}>
            <p className="text-sm text-muted">Total Transaksi</p>
            <p className="font-700" style={{ fontSize: 22, color: 'var(--text-primary)', marginTop: 4 }}>
              {filtered.length}
            </p>
          </div>
          <div className="card" style={{ padding: '16px 20px' }}>
            <p className="text-sm text-muted">Total Masuk</p>
            <p className="font-700 amount-positive" style={{ fontSize: 22, marginTop: 4 }}>
              +{formatCurrency(totalIn)}
            </p>
          </div>
          <div className="card" style={{ padding: '16px 20px' }}>
            <p className="text-sm text-muted">Total Keluar</p>
            <p className="font-700 amount-negative" style={{ fontSize: 22, marginTop: 4 }}>
              -{formatCurrency(totalOut)}
            </p>
          </div>
        </div>

        <div className="card">
          {/* Toolbar */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, gap: 12, flexWrap: 'wrap' }}>
            <div className="filter-bar" style={{ marginBottom: 0 }}>
              {(['semua', 'masuk', 'keluar', 'bulan-ini'] as Filter[]).map(f => (
                <button
                  key={f}
                  className={`filter-chip ${filter === f ? 'active' : ''}`}
                  onClick={() => setFilter(f)}
                >
                  {f === 'semua' ? 'Semua' : f === 'masuk' ? '↑ Pemasukan' : f === 'keluar' ? '↓ Pengeluaran' : '📅 Bulan Ini'}
                </button>
              ))}
            </div>

            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              <div style={{ position: 'relative' }}>
                <Search size={15} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input
                  className="form-input"
                  style={{ paddingLeft: 32, width: 200, marginBottom: 0 }}
                  placeholder="Cari transaksi..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                />
              </div>
              <button className="btn btn-primary" onClick={() => { setEditTarget(undefined); setShowModal(true); }}>
                <Plus size={16} /> Tambah
              </button>
            </div>
          </div>

          <RecentTransactions
            transactions={filtered}
            showAll
            onEdit={handleEdit}
            onDelete={handleDeleteRequest}
          />
        </div>
      </div>

      {showModal && (
        <TransactionModal
          existing={editTarget}
          onSave={handleSave}
          onClose={() => { setShowModal(false); setEditTarget(undefined); }}
        />
      )}

      {deleteId && (
        <ConfirmDeleteModal
          title="Hapus Transaksi"
          message="Apakah Anda yakin ingin menghapus transaksi ini? Data yang dihapus tidak dapat dikembalikan."
          isLoading={isDeleting}
          onConfirm={handleConfirmDelete}
          onClose={() => setDeleteId(null)}
        />
      )}
    </>
  );
}
