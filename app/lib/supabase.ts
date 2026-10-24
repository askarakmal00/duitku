import { localPostgresClient } from './db-client';

export const isSupabaseConfigured = true;
export const supabase = localPostgresClient as any;
