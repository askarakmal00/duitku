import { createClient } from '@supabase/supabase-js';
import pg from 'pg';

const { Pool } = pg;

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const databaseUrl = process.env.DATABASE_URL;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Error: SUPABASE_URL atau NEXT_PUBLIC_SUPABASE_URL & ANON_KEY tidak ditemukan.');
  console.error('Gunakan: SUPABASE_URL=... SUPABASE_KEY=... node scripts/migrate-supabase.mjs');
  process.exit(1);
}

if (!databaseUrl) {
  console.error('❌ Error: DATABASE_URL tidak ditemukan.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);
const pool = new Pool({ connectionString: databaseUrl });

async function migrateTable(tableName, conflictKey = 'id') {
  console.log(`⏳ Mengambil data dari Supabase: ${tableName}...`);
  const { data, error } = await supabase.from(tableName).select('*');
  
  if (error) {
    console.error(`⚠️ Gagal mengambil ${tableName} dari Supabase:`, error.message);
    return;
  }

  if (!data || data.length === 0) {
    console.log(`ℹ️ Tabel ${tableName} kosong di Supabase. Dilewati.`);
    return;
  }

  console.log(`📦 Ditemukan ${data.length} baris di ${tableName}. Memasukkan ke PostgreSQL...`);

  let inserted = 0;
  for (const row of data) {
    const keys = Object.keys(row).filter(k => /^[a-z_][a-z0-9_]*$/i.test(k));
    const values = keys.map(k => row[k]);
    const placeholders = keys.map((_, i) => `$${i + 1}`).join(', ');

    const updateSets = keys
      .filter(k => k !== conflictKey)
      .map(k => `${k} = EXCLUDED.${k}`)
      .join(', ');

    let query = `INSERT INTO ${tableName} (${keys.join(', ')}) VALUES (${placeholders})`;
    if (updateSets.length > 0) {
      query += ` ON CONFLICT (${conflictKey}) DO UPDATE SET ${updateSets}`;
    } else {
      query += ` ON CONFLICT (${conflictKey}) DO NOTHING`;
    }

    try {
      await pool.query(query, values);
      inserted++;
    } catch (err) {
      console.error(`❌ Gagal insert baris di ${tableName} (ID: ${row.id}):`, err.message);
    }
  }

  console.log(`✅ Berhasil migrasi ${inserted}/${data.length} baris ke tabel ${tableName}.\n`);
}

async function run() {
  console.log('🚀 Memulai migrasi data dari Supabase ke PostgreSQL VPS...\n');

  try {
    // 1. Categories
    await migrateTable('categories');
    // 2. Budget Pos
    await migrateTable('budget_pos');
    // 3. Debt Parties
    await migrateTable('debt_parties');
    // 4. Debt Transactions
    await migrateTable('debt_transactions');
    // 5. Saving Goals
    await migrateTable('saving_goals');
    // 6. Transactions
    await migrateTable('transactions');
    // 7. App Settings
    await migrateTable('app_settings');

    console.log('🎉 SELAMAT! Seluruh data dari Supabase berhasil dimigrasi ke PostgreSQL VPS Anda!');
  } catch (err) {
    console.error('❌ Terjadi kesalahan saat migrasi:', err);
  } finally {
    await pool.end();
  }
}

run();
