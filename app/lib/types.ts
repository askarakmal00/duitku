export type SpaceId = 'pribadi' | 'keluarga';

export interface Transaction {
  id: string;
  spaceId?: SpaceId;
  type: 'masuk' | 'keluar';
  category: string;
  subCategory?: string;
  budgetPosId?: string;
  goalId?: string;
  debtTxnId?: string;
  amount: number;
  note: string;
  date: string;
  createdAt: string;
  // Family-space fields
  paidBy?: 'asykar' | 'istri' | 'bersama';
  reimbursed?: boolean;
}

export interface BudgetPos {
  id: string;
  spaceId?: SpaceId;
  name: string;
  monthlyAllocation: number;
  rollover: boolean;
  createdAt: string;
}

export interface DebtParty {
  id: string;
  spaceId?: SpaceId;
  name: string;
  createdAt: string;
}

export interface DebtTransaction {
  id: string;
  spaceId?: SpaceId;
  partyId: string;
  type: 'tambah' | 'bayar';
  amount: number;
  note: string;
  date: string;
  createdAt: string;
  txnId?: string;
}

export interface SavingGoal {
  id: string;
  spaceId?: SpaceId;
  name: string;
  targetAmount: number;
  createdAt: string;
}

export interface Category {
  id: string;
  name: string;
  type: 'masuk' | 'keluar' | 'both';
  isDefault?: boolean;
}

export interface AppSettings {
  userName: string;
  darkMode: boolean;
}

export const DEFAULT_INCOME_CATEGORIES = ['Gaji', 'Bonus', 'Investasi', 'Tabungan', 'Hutang', 'Lainnya'];
export const DEFAULT_EXPENSE_CATEGORIES = ['Makan', 'Transport', 'Tagihan', 'Kebutuhan Rumah Tangga', 'Kesehatan', 'Hiburan', 'Belanja', 'Tabungan', 'Hutang', 'Lainnya'];

// Family-specific categories
export const FAMILY_INCOME_CATEGORIES = ['Setoran Asykar', 'Setoran Istri', 'Penghasilan Tambahan', 'Lainnya'];
export const FAMILY_EXPENSE_CATEGORIES = [
  'Belanja Dapur', 'Utilitas Rumah', 'Kebutuhan Anak', 'Operasional Rumah',
  'Kesehatan Keluarga', 'Makan Bersama', 'Rekreasi Keluarga', 'Dana Darurat',
  'KPR / Cicilan Rumah', 'Cicilan Kendaraan', 'Pendidikan', 'Lainnya'
];
