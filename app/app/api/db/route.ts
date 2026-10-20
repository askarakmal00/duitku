import { NextRequest, NextResponse } from 'next/server';
import { getDbPool, ensureDatabaseSchema } from '@/lib/db';

const ALLOWED_TABLES = new Set([
  'transactions',
  'budget_pos',
  'debt_parties',
  'debt_transactions',
  'saving_goals',
  'categories',
  'app_settings',
]);

export async function POST(req: NextRequest) {
  const pool = getDbPool();
  if (!pool) {
    return NextResponse.json(
      { error: 'DATABASE_URL is not configured' },
      { status: 503 }
    );
  }

  try {
    await ensureDatabaseSchema();
    const body = await req.json();
    const { action, table, payload, match, filter } = body;

    // Fast-path: Load all data at once for initial hydration
    if (action === 'loadAll') {
      const [
        txnsRes,
        budgetRes,
        partiesRes,
        debtTxnRes,
        goalsRes,
        catsRes,
        settingsRes,
      ] = await Promise.all([
        pool.query('SELECT * FROM transactions ORDER BY date DESC, created_at DESC'),
        pool.query('SELECT * FROM budget_pos ORDER BY created_at ASC'),
        pool.query('SELECT * FROM debt_parties ORDER BY created_at ASC'),
        pool.query('SELECT * FROM debt_transactions ORDER BY date DESC, created_at DESC'),
        pool.query('SELECT * FROM saving_goals ORDER BY created_at ASC'),
        pool.query('SELECT * FROM categories ORDER BY name ASC'),
        pool.query('SELECT * FROM app_settings WHERE id = 1 LIMIT 1'),
      ]);

      return NextResponse.json({
        data: {
          transactions: txnsRes.rows,
          budget_pos: budgetRes.rows,
          debt_parties: partiesRes.rows,
          debt_transactions: debtTxnRes.rows,
          saving_goals: goalsRes.rows,
          categories: catsRes.rows,
          app_settings: settingsRes.rows[0] || { id: 1, user_name: 'Pengguna', dark_mode: false },
        },
      });
    }

    if (!table || !ALLOWED_TABLES.has(table)) {
      return NextResponse.json({ error: 'Invalid or missing table' }, { status: 400 });
    }

    if (action === 'select') {
      let query = `SELECT * FROM ${table}`;
      const params: any[] = [];
      const conditions: string[] = [];

      if (match && typeof match === 'object') {
        for (const [key, value] of Object.entries(match)) {
          // Verify key contains only safe column chars
          if (!/^[a-z_][a-z0-9_]*$/i.test(key)) continue;
          params.push(value);
          conditions.push(`${key} = $${params.length}`);
        }
      }

      if (conditions.length > 0) {
        query += ` WHERE ${conditions.join(' AND ')}`;
      }

      const res = await pool.query(query, params);
      return NextResponse.json({ data: res.rows });
    }

    if (action === 'insert' || action === 'upsert') {
      const rows = Array.isArray(payload) ? payload : [payload];
      if (rows.length === 0) {
        return NextResponse.json({ data: [] });
      }

      const insertedRows: any[] = [];
      for (const row of rows) {
        const keys = Object.keys(row).filter((k) => /^[a-z_][a-z0-9_]*$/i.test(k));
        const values = keys.map((k) => row[k]);
        const placeholders = keys.map((_, i) => `$${i + 1}`).join(', ');

        let query = `INSERT INTO ${table} (${keys.join(', ')}) VALUES (${placeholders})`;

        if (action === 'upsert') {
          const conflictTarget = table === 'app_settings' ? 'id' : 'id';
          const updateSets = keys
            .filter((k) => k !== conflictTarget)
            .map((k) => `${k} = EXCLUDED.${k}`)
            .join(', ');

          if (updateSets.length > 0) {
            query += ` ON CONFLICT (${conflictTarget}) DO UPDATE SET ${updateSets}`;
          } else {
            query += ` ON CONFLICT (${conflictTarget}) DO NOTHING`;
          }
        }

        query += ' RETURNING *';

        const res = await pool.query(query, values);
        if (res.rows[0]) insertedRows.push(res.rows[0]);
      }

      return NextResponse.json({ data: Array.isArray(payload) ? insertedRows : insertedRows[0] || null });
    }

    if (action === 'update') {
      if (!match || !match.id) {
        return NextResponse.json({ error: 'Update requires match.id' }, { status: 400 });
      }

      const keys = Object.keys(payload || {}).filter((k) => /^[a-z_][a-z0-9_]*$/i.test(k) && k !== 'id');
      if (keys.length === 0) {
        return NextResponse.json({ data: null });
      }

      const sets = keys.map((k, i) => `${k} = $${i + 1}`).join(', ');
      const values = keys.map((k) => payload[k]);
      values.push(match.id);

      const query = `UPDATE ${table} SET ${sets} WHERE id = $${values.length} RETURNING *`;
      const res = await pool.query(query, values);
      return NextResponse.json({ data: res.rows[0] || null });
    }

    if (action === 'delete') {
      let query = `DELETE FROM ${table}`;
      const params: any[] = [];

      if (filter && filter.neq) {
        const { column, value } = filter.neq;
        if (/^[a-z_][a-z0-9_]*$/i.test(column)) {
          params.push(value);
          query += ` WHERE ${column} != $1`;
        }
      } else if (match && typeof match === 'object') {
        const conditions: string[] = [];
        for (const [key, value] of Object.entries(match)) {
          if (!/^[a-z_][a-z0-9_]*$/i.test(key)) continue;
          params.push(value);
          conditions.push(`${key} = $${params.length}`);
        }
        if (conditions.length > 0) {
          query += ` WHERE ${conditions.join(' AND ')}`;
        }
      }

      await pool.query(query, params);
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (err: any) {
    console.error('Database API error:', err);
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}

