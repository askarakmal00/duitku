// ─── Space Store ──────────────────────────────────────────────────────────────
// Manages multi-space (Pribadi/Keluarga) with PIN authentication.

export type SpaceId = 'pribadi' | 'keluarga';

export const SPACE_PINS: Record<SpaceId, string> = {
  pribadi: '235689',
  keluarga: '080808',
};

const PIN_STORAGE_KEYS: Record<SpaceId, string> = {
  pribadi: 'pf_pin_pribadi',
  keluarga: 'pf_pin_keluarga',
};

const SESSION_KEY = 'pf_active_space';
const MIGRATED_KEY = 'pf_migrated_v2';

// ─── PIN Management ────────────────────────────────────────────────────────────

export function getPin(space: SpaceId): string {
  if (typeof window === 'undefined') return SPACE_PINS[space];
  return localStorage.getItem(PIN_STORAGE_KEYS[space]) || SPACE_PINS[space];
}

export function setPin(space: SpaceId, pin: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(PIN_STORAGE_KEYS[space], pin);
}

export function verifyPin(space: SpaceId, pin: string): boolean {
  return pin === getPin(space);
}

export function changePin(space: SpaceId, oldPin: string, newPin: string): boolean {
  if (!verifyPin(space, oldPin)) return false;
  setPin(space, newPin);
  return true;
}

// ─── Active Space Session ──────────────────────────────────────────────────────

export function getActiveSpace(): SpaceId | null {
  if (typeof window === 'undefined') return null;
  const val = sessionStorage.getItem(SESSION_KEY);
  if (val === 'pribadi' || val === 'keluarga') return val;
  return null;
}

export function setActiveSpace(space: SpaceId): void {
  if (typeof window === 'undefined') return;
  sessionStorage.setItem(SESSION_KEY, space);
}

export function clearActiveSpace(): void {
  if (typeof window === 'undefined') return;
  sessionStorage.removeItem(SESSION_KEY);
}

// ─── Data Migration ────────────────────────────────────────────────────────────
// Tags all existing legacy data (without spaceId) as 'pribadi'.

export function migrateExistingData(): void {
  if (typeof window === 'undefined') return;
  if (localStorage.getItem(MIGRATED_KEY) === '1') return;

  const dataKeys = [
    'pf_transactions',
    'pf_budget_pos',
    'pf_debt_parties',
    'pf_debt_transactions',
    'pf_saving_goals',
  ];

  for (const key of dataKeys) {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) continue;
      const arr: any[] = JSON.parse(raw);
      if (!Array.isArray(arr)) continue;
      const migrated = arr.map(item =>
        item.spaceId ? item : { ...item, spaceId: 'pribadi' }
      );
      localStorage.setItem(key, JSON.stringify(migrated));
    } catch {
      // ignore parse errors
    }
  }

  localStorage.setItem(MIGRATED_KEY, '1');
}

// ─── Space Meta ────────────────────────────────────────────────────────────────

export interface SpaceMeta {
  id: SpaceId;
  name: string;
  icon: string;
  color: string;
  description: string;
}

export const SPACES: SpaceMeta[] = [
  {
    id: 'keluarga',
    name: 'Duitku Keluarga',
    icon: '🏠',
    color: '#10b981',
    description: 'Keuangan bersama Asykar & Istri',
  },
  {
    id: 'pribadi',
    name: 'Duitku Pribadi',
    icon: '👤',
    color: '#6366f1',
    description: 'Keuangan pribadi Asykar',
  },
];

export function getSpaceMeta(id: SpaceId): SpaceMeta {
  return SPACES.find(s => s.id === id)!;
}

// ─── Family-specific store keys ────────────────────────────────────────────────
export const FAMILY_CONTRIBUTIONS_KEY = 'pf_keluarga_contributions';

export interface FamilyContribution {
  id: string;
  month: string; // YYYY-MM
  asykarAmount: number;
  istriAmount: number;
  targetPerPerson: number;
  note?: string;
  createdAt: string;
}

function genId(): string {
  if (typeof window !== 'undefined' && window.crypto?.randomUUID) {
    return window.crypto.randomUUID();
  }
  return 'xxxx-xxxx-4xxx-yxxx'.replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

function loadLocal<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

export function getFamilyContributions(): FamilyContribution[] {
  return loadLocal<FamilyContribution[]>(FAMILY_CONTRIBUTIONS_KEY, []);
}

export function getFamilyContributionForMonth(month: string): FamilyContribution | undefined {
  return getFamilyContributions().find(c => c.month === month);
}

export function saveFamilyContribution(data: Omit<FamilyContribution, 'id' | 'createdAt'>): FamilyContribution {
  const list = getFamilyContributions();
  const existing = list.findIndex(c => c.month === data.month);
  if (existing >= 0) {
    const updated = { ...list[existing], ...data };
    list[existing] = updated;
    localStorage.setItem(FAMILY_CONTRIBUTIONS_KEY, JSON.stringify(list));
    return updated;
  }
  const newItem: FamilyContribution = { ...data, id: genId(), createdAt: new Date().toISOString() };
  localStorage.setItem(FAMILY_CONTRIBUTIONS_KEY, JSON.stringify([...list, newItem]));
  return newItem;
}
