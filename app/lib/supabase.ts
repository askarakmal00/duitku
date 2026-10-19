import { createClient } from '@supabase/supabase-js';
import { localPostgresClient } from './db-client';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const hasValidSupabase = Boolean(
  supabaseUrl &&
  supabaseAnonKey &&
  !supabaseUrl.includes('placeholder') &&
  supabaseUrl.startsWith('http')
);

export const isSupabaseConfigured = true;

export const supabase = hasValidSupabase
  ? (createClient(supabaseUrl!, supabaseAnonKey!) as any)
  : (localPostgresClient as any);
