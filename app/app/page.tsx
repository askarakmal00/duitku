'use client';
import { useEffect, useState } from 'react';
import { Plus, ArrowDownLeft, ArrowUpRight, CreditCard, Target } from 'lucide-react';
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
  getMonthlyIncome, getMonthlyExpense, getTotalSavings, getRemainingBudget, getFreeMoney,
  getBudgetPos, getBudgetUsed, getSavingGoals,
} from '@/lib/store';
import { Transaction, BudgetPos, SavingGoal } from '@/lib/types';
import { getCurrentMonth, getPreviousMonth } from '@/lib/helpers';

import { useDataRefresh } from '@/lib/useDataRefresh';
import { useCallback } from 'react';

export default function DashboardPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [budgetPos, setBudgetPos] = useState<BudgetPos[]>([]);
  const [goals, setGoals] = useState<SavingGoal[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editTarget, setEditTarget] = useState<Transaction | undefined>();
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const { year, month } = getCurrentMonth();
  const prev = getPreviousMonth();

  const loadData = useCallback(() => {
    setTransactions(getTransactions());
    setBudgetPos(getBudgetPos());
    setGoals(getSavingGoals());
  }, []);

  useDataRefresh(loadData);

  const totalBalance = getTotalBalance();
  const remainingBudget = getRemainingBudget(year, month);
  const freeMoney = getFreeMoney(year, month);

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
    loadData();
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
      loadData();
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
          <SummaryCard
            label="Total Saldo"
            value={totalBalance}
            variant="hero"
            freeMoney={freeMoney}
            remainingBudget={remainingBudget}
          />
          <SummaryCard label="Pemasukan (Bulan Ini)" value={income} prevValue={prevIncome} variant="income" />
          <SummaryCard label="Pengeluaran (Bulan Ini)" value={expense} prevValue={prevExpense} variant="expense" />
          <SummaryCard label="Total Tabungan" value={savings} variant="savings" />
        </div>


        {/* Main Grid */}
        <div className="dashboard-grid" style={{ width: '100%', maxWidth: '100%', minWidth: 0, boxSizing: 'border-box' }}>
          {/* Left Column */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20, minWidth: 0, width: '100%', maxWidth: '100%', boxSizing: 'border-box' }}>
            {/* Money Flow */}
            <div className="card">
              <div className="card-header" style={{ minWidth: 0 }}>
                <span className="card-title" style={{ minWidth: 0, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>Arus Uang (Money Flow)</span>
                <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexShrink: 0 }}>
                  <span className="text-sm text-muted">7 bulan terakhir</span>
                </div>
              </div>
              <MoneyFlowChart months={7} />
            </div>

            {/* Recent Transactions */}
            <div className="card">
              <div className="card-header" style={{ minWidth: 0 }}>
                <span className="card-title" style={{ minWidth: 0, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>Transaksi Terbaru</span>
                <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexShrink: 0 }}>
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
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20, minWidth: 0, width: '100%', maxWidth: '100%', boxSizing: 'border-box' }}>
            {/* Budget */}
            <div className="card">
              <div className="card-header" style={{ minWidth: 0 }}>
                <span className="card-title" style={{ minWidth: 0, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>Anggaran</span>
                <a href="/budget" className="card-action" style={{ flexShrink: 0 }}>Lihat semua →</a>
              </div>
              <BudgetDonut items={budgetItems} />
            </div>

            {/* Saving Goals */}
            <div className="card">
              <div className="card-header" style={{ minWidth: 0 }}>
                <span className="card-title" style={{ minWidth: 0, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>Target Tabungan</span>
                <a href="/goals" className="card-action" style={{ flexShrink: 0 }}>Lihat semua →</a>
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
