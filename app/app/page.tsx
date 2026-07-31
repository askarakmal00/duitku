'use client';
import { useEffect, useState } from 'react';
import { Plus } from 'lucide-react';
import Header from '@/components/Header';
import SummaryCard from '@/components/SummaryCard';
import MoneyFlowChart from '@/components/MoneyFlowChart';
import BudgetDonut from '@/components/BudgetDonut';
import RecentTransactions from '@/components/RecentTransactions';
import SavingGoalsList from '@/components/SavingGoalsList';
import ConfirmDeleteModal from '@/components/ConfirmDeleteModal';
import TransactionModal from '@/components/TransactionModal';
import {
  getTransactions, addTransaction, updateTransaction, deleteTransaction, getTotalBalance,
  getMonthlyIncome, getMonthlyExpense, getTotalSavings,
  getBudgetPos, getBudgetUsed, getSavingGoals,
} from '@/lib/store';
import { Transaction, BudgetPos, SavingGoal } from '@/lib/types';
import { getCurrentMonth, getPreviousMonth } from '@/lib/helpers';

export default function DashboardPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [budgetPos, setBudgetPos] = useState<BudgetPos[]>([]);
  const [goals, setGoals] = useState<SavingGoal[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editTarget, setEditTarget] = useState<Transaction | undefined>();
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [refresh, setRefresh] = useState(0);

  const { year, month } = getCurrentMonth();
  const prev = getPreviousMonth();

  useEffect(() => {
    setTransactions(getTransactions());
    setBudgetPos(getBudgetPos());
    setGoals(getSavingGoals());
  }, [refresh]);

  const totalBalance = getTotalBalance();
  const income = getMonthlyIncome(year, month);
  const expense = getMonthlyExpense(year, month);
  const savings = getTotalSavings();
  const prevIncome = getMonthlyIncome(prev.year, prev.month);
  const prevExpense = getMonthlyExpense(prev.year, prev.month);

  const budgetItems = budgetPos.map(p => ({
    name: p.name,
    allocated: p.monthlyAllocation,
    used: getBudgetUsed(p.id, year, month),
  }));

  const handleSaveTransaction = async (data: Omit<Transaction, 'id' | 'createdAt'>) => {
    if (editTarget) {
      await updateTransaction(editTarget.id, data);
    } else {
      await addTransaction(data);
    }
    setShowModal(false);
    setEditTarget(undefined);
    setRefresh(r => r + 1);
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
      setRefresh(r => r + 1);
    } finally {
      setIsDeleting(false);
      setDeleteId(null);
    }
  };

  return (
    <>
      <Header title="Dashboard" subtitle="Ringkasan keuangan Anda bulan ini" />

      <div className="page-container">
        {/* Summary Cards */}
        <div className="summary-grid mb-5">
          <SummaryCard label="Total Saldo" value={totalBalance} />
          <SummaryCard label="Pemasukan (Bulan Ini)" value={income} prevValue={prevIncome} />
          <SummaryCard label="Pengeluaran (Bulan Ini)" value={expense} prevValue={prevExpense} />
          <SummaryCard label="Total Tabungan" value={savings} />
        </div>

        {/* Main Grid */}
        <div className="dashboard-grid">
          {/* Left Column */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {/* Money Flow */}
            <div className="card">
              <div className="card-header">
                <span className="card-title">Arus Uang (Money Flow)</span>
                <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                  <span className="text-sm text-muted">7 bulan terakhir</span>
                </div>
              </div>
              <MoneyFlowChart months={7} />
            </div>

            {/* Recent Transactions */}
            <div className="card">
              <div className="card-header">
                <span className="card-title">Transaksi Terbaru</span>
                <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                  <button className="btn btn-primary btn-sm" onClick={() => { setEditTarget(undefined); setShowModal(true); }}>
                    <Plus size={14} /> Tambah
                  </button>
                </div>
              </div>
              <RecentTransactions
                transactions={transactions}
                limit={5}
                onEdit={handleEdit}
                onDelete={handleDeleteRequest}
              />
            </div>
          </div>

          {/* Right Column */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {/* Budget */}
            <div className="card">
              <div className="card-header">
                <span className="card-title">Anggaran</span>
                <a href="/budget" className="card-action">Lihat semua →</a>
              </div>
              <BudgetDonut items={budgetItems} />
            </div>

            {/* Saving Goals */}
            <div className="card">
              <div className="card-header">
                <span className="card-title">Target Tabungan</span>
                <a href="/goals" className="card-action">Lihat semua →</a>
              </div>
              <SavingGoalsList goals={goals.slice(0, 4)} />
            </div>
          </div>
        </div>
      </div>

      {showModal && (
        <TransactionModal
          existing={editTarget}
          onSave={handleSaveTransaction}
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
