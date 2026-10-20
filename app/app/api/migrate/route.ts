import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getDbPool, ensureDatabaseSchema } from '@/lib/db';

export async function POST(req: NextRequest) {
  const pool = getDbPool();
  if (!pool) {
    return NextResponse.json(
      { error: 'DATABASE_URL belum dikonfigurasi di server.' },
      { status: 500 }
    );
  }

  try {
    await ensureDatabaseSchema();
    const body = await req.json().catch(() => ({}));

    const supabaseUrl =
      body.supabaseUrl ||
      process.env.SUPABASE_URL ||
      process.env.NEXT_PUBLIC_SUPABASE_URL;

    const supabaseKey =
      body.supabaseKey ||
      process.env.SUPABASE_KEY ||
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json(
        { error: 'Harap sediakan Supabase URL dan Anon Key.' },
        { status: 400 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    const tables = [
      'categories',
      'budget_pos',
      'debt_parties',
      'debt_transactions',
      'saving_goals',
      'transactions',
      'app_settings',
    ];

    const summary: Record<string, number> = {};

    for (const table of tables) {
      const { data, error } = await supabase.from(table).select('*');
      if (error) {
        console.warn(`Peringatan: Gagal mengambil ${table} dari Supabase:`, error.message);
        summary[table] = 0;
        continue;
      }

      if (!data || data.length === 0) {
        summary[table] = 0;
        continue;
      }

      let count = 0;
      for (const row of data) {
        const keys = Object.keys(row).filter((k) => /^[a-z_][a-z0-9_]*$/i.test(k));
        const values = keys.map((k) => row[k]);
        const placeholders = keys.map((_, i) => `$${i + 1}`).join(', ');

        const conflictKey = 'id';
        const updateSets = keys
          .filter((k) => k !== conflictKey)
          .map((k) => `${k} = EXCLUDED.${k}`)
          .join(', ');

        let query = `INSERT INTO ${table} (${keys.join(', ')}) VALUES (${placeholders})`;
        if (updateSets.length > 0) {
          query += ` ON CONFLICT (${conflictKey}) DO UPDATE SET ${updateSets}`;
        } else {
          query += ` ON CONFLICT (${conflictKey}) DO NOTHING`;
        }

        try {
          await pool.query(query, values);
          count++;
        } catch (e: any) {
          console.error(`Gagal insert ${table} id ${row.id}:`, e.message);
        }
      }
      summary[table] = count;
    }

    return NextResponse.json({
      success: true,
      message: 'Migrasi data dari Supabase ke PostgreSQL VPS berhasil!',
      summary,
    });
  } catch (err: any) {
    console.error('Migration error:', err);
    return NextResponse.json(
      { error: err.message || 'Terjadi kesalahan saat migrasi' },
      { status: 500 }
    );
  }
}
