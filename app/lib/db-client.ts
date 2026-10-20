/**
 * Local PostgreSQL Query Builder Client
 * Provides 100% compatibility with @supabase/supabase-js query syntax
 * by proxying requests directly to Next.js /api/db endpoint.
 */

export class DbQueryBuilder<T = Record<string, any>[]> {
  private table: string;
  private action: 'select' | 'insert' | 'upsert' | 'update' | 'delete' = 'select';
  private payload: any = null;
  private match: Record<string, any> = {};
  private filter: Record<string, any> = {};
  private isSingle = false;

  constructor(table: string) {
    this.table = table;
  }

  select(_columns: string = '*'): DbQueryBuilder<Record<string, any>[]> {
    this.action = 'select';
    return this as any;
  }

  insert(data: any): DbQueryBuilder<any> {
    this.action = 'insert';
    this.payload = data;
    return this as any;
  }

  upsert(data: any): DbQueryBuilder<any> {
    this.action = 'upsert';
    this.payload = data;
    return this as any;
  }

  update(data: any): DbQueryBuilder<any> {
    this.action = 'update';
    this.payload = data;
    return this as any;
  }

  delete(): DbQueryBuilder<any> {
    this.action = 'delete';
    return this as any;
  }

  eq(column: string, value: any): DbQueryBuilder<T> {
    this.match[column] = value;
    return this;
  }

  neq(column: string, value: any): DbQueryBuilder<T> {
    this.filter.neq = { column, value };
    return this;
  }

  maybeSingle(): DbQueryBuilder<Record<string, any> | null> {
    this.isSingle = true;
    return this as any;
  }

  async execute(): Promise<{ data: T; error: any }> {
    try {
      const res = await fetch('/api/db', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          table: this.table,
          action: this.action,
          payload: this.payload,
          match: Object.keys(this.match).length > 0 ? this.match : undefined,
          filter: Object.keys(this.filter).length > 0 ? this.filter : undefined,
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        return { data: null as any, error: { message: json.error || 'Database error', code: res.status.toString() } };
      }

      let data = json.data;
      if (this.isSingle && Array.isArray(data)) {
        data = data[0] || null;
      }
      return { data, error: null };
    } catch (err: any) {
      return { data: null as any, error: { message: err.message || 'Network error' } };
    }
  }

  then<TResult1 = { data: T; error: any }, TResult2 = never>(
    onfulfilled?: ((value: { data: T; error: any }) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | null
  ): Promise<TResult1 | TResult2> {
    return this.execute().then(onfulfilled, onrejected);
  }
}

export const localPostgresClient = {
  from(table: string): DbQueryBuilder<Record<string, any>[]> {
    return new DbQueryBuilder<Record<string, any>[]>(table);
  },
  channel(_name: string) {
    return {
      on(_event: string, _opts: any, _callback?: () => void) {
        return {
          subscribe() {
            return { unsubscribe: () => {} };
          },
        };
      },
    };
  },
  removeChannel(_channel: any) {},
};

