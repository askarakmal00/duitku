import { Pool } from 'pg';

let pool: Pool | null = null;

export function getDbPool(): Pool | null {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    return null;
  }

  if (!pool) {
    pool = new Pool({
      connectionString: databaseUrl,
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
    });

    pool.on('error', (err) => {
      console.error('Unexpected error on idle PostgreSQL client', err);
    });
  }

  return pool;
}

let isInitialized = false;

export async function ensureDatabaseSchema(): Promise<void> {
  if (isInitialized) return;
  const p = getDbPool();
  if (!p) return;

  const client = await p.connect();
  try {
    await client.query(`
      CREATE EXTENSION IF NOT EXISTS "pgcrypto";

      CREATE TABLE IF NOT EXISTS transactions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        type TEXT NOT NULL,
        category TEXT NOT NULL,
        sub_category TEXT,
        budget_pos_id UUID,
        goal_id UUID,
        debt_txn_id UUID,
        amount NUMERIC(15,2) NOT NULL DEFAULT 0,
        note TEXT DEFAULT '',
        date DATE NOT NULL DEFAULT CURRENT_DATE,
        space_id TEXT DEFAULT 'pribadi',
        paid_by TEXT DEFAULT 'bersama',
        reimbursed BOOLEAN DEFAULT false,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );

      ALTER TABLE transactions ADD COLUMN IF NOT EXISTS space_id TEXT DEFAULT 'pribadi';
      ALTER TABLE transactions ADD COLUMN IF NOT EXISTS debt_txn_id UUID;
      ALTER TABLE transactions ADD COLUMN IF NOT EXISTS paid_by TEXT DEFAULT 'bersama';
      ALTER TABLE transactions ADD COLUMN IF NOT EXISTS reimbursed BOOLEAN DEFAULT false;

      CREATE TABLE IF NOT EXISTS budget_pos (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name TEXT NOT NULL,
        monthly_allocation NUMERIC(15,2) NOT NULL DEFAULT 0,
        rollover BOOLEAN DEFAULT false,
        space_id TEXT DEFAULT 'pribadi',
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
      ALTER TABLE budget_pos ADD COLUMN IF NOT EXISTS space_id TEXT DEFAULT 'pribadi';

      CREATE TABLE IF NOT EXISTS debt_parties (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name TEXT NOT NULL,
        space_id TEXT DEFAULT 'pribadi',
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
      ALTER TABLE debt_parties ADD COLUMN IF NOT EXISTS space_id TEXT DEFAULT 'pribadi';

      CREATE TABLE IF NOT EXISTS debt_transactions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        party_id UUID NOT NULL,
        type TEXT NOT NULL,
        txn_id UUID,
        amount NUMERIC(15,2) NOT NULL DEFAULT 0,
        note TEXT DEFAULT '',
        date DATE NOT NULL DEFAULT CURRENT_DATE,
        space_id TEXT DEFAULT 'pribadi',
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
      ALTER TABLE debt_transactions ADD COLUMN IF NOT EXISTS txn_id UUID;
      ALTER TABLE debt_transactions ADD COLUMN IF NOT EXISTS space_id TEXT DEFAULT 'pribadi';

      CREATE TABLE IF NOT EXISTS saving_goals (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name TEXT NOT NULL,
        target_amount NUMERIC(15,2) NOT NULL DEFAULT 0,
        space_id TEXT DEFAULT 'pribadi',
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
      ALTER TABLE saving_goals ADD COLUMN IF NOT EXISTS space_id TEXT DEFAULT 'pribadi';

      CREATE TABLE IF NOT EXISTS categories (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name TEXT NOT NULL,
        type TEXT NOT NULL,
        is_default BOOLEAN DEFAULT false
      );

      CREATE TABLE IF NOT EXISTS app_settings (
        id INTEGER PRIMARY KEY DEFAULT 1,
        user_name TEXT DEFAULT 'Pengguna',
        dark_mode BOOLEAN DEFAULT false,
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );

      INSERT INTO app_settings (id, user_name, dark_mode)
      VALUES (1, 'Pengguna', false)
      ON CONFLICT (id) DO NOTHING;

      -- Purge personal (pribadi) financial records so DuitKu operates 100% as family finance
      DELETE FROM transactions WHERE space_id = 'pribadi';
      DELETE FROM budget_pos WHERE space_id = 'pribadi';
      DELETE FROM debt_parties WHERE space_id = 'pribadi';
      DELETE FROM debt_transactions WHERE space_id = 'pribadi';
      DELETE FROM saving_goals WHERE space_id = 'pribadi';

      -- Retain only October 2026 onwards for family finance; purge older transactions
      DELETE FROM transactions WHERE date < '2026-10-01';
      DELETE FROM debt_transactions WHERE date < '2026-10-01';

      -- Ensure all existing and new records default to keluarga
      UPDATE transactions SET space_id = 'keluarga' WHERE space_id IS NULL OR space_id != 'keluarga';
      UPDATE budget_pos SET space_id = 'keluarga' WHERE space_id IS NULL OR space_id != 'keluarga';
      UPDATE debt_parties SET space_id = 'keluarga' WHERE space_id IS NULL OR space_id != 'keluarga';
      UPDATE debt_transactions SET space_id = 'keluarga' WHERE space_id IS NULL OR space_id != 'keluarga';
      UPDATE saving_goals SET space_id = 'keluarga' WHERE space_id IS NULL OR space_id != 'keluarga';

      ALTER TABLE transactions ALTER COLUMN space_id SET DEFAULT 'keluarga';
      ALTER TABLE budget_pos ALTER COLUMN space_id SET DEFAULT 'keluarga';
      ALTER TABLE debt_parties ALTER COLUMN space_id SET DEFAULT 'keluarga';
      ALTER TABLE debt_transactions ALTER COLUMN space_id SET DEFAULT 'keluarga';
      ALTER TABLE saving_goals ALTER COLUMN space_id SET DEFAULT 'keluarga';

      -- Seed default categories if empty
      INSERT INTO categories (name, type, is_default)
      SELECT * FROM (VALUES
        ('Gaji', 'masuk', true),
        ('Bonus', 'masuk', true),
        ('Investasi', 'masuk', true),
        ('Makan', 'keluar', true),
        ('Transport', 'keluar', true),
        ('Tagihan', 'keluar', true),
        ('Kebutuhan Rumah Tangga', 'keluar', true),
        ('Kesehatan', 'keluar', true),
        ('Hiburan', 'keluar', true),
        ('Belanja', 'keluar', true),
        ('Tabungan', 'both', true),
        ('Hutang', 'both', true),
        ('Lainnya', 'both', true)
      ) AS def(n, t, d)
      WHERE NOT EXISTS (SELECT 1 FROM categories LIMIT 1);
    `);
    isInitialized = true;
  } catch (err) {
    console.error('Failed to initialize database schema:', err);
  } finally {
    client.release();
  }
}

