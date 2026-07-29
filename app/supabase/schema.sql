-- ============================================================
-- FinKu - Supabase Database Schema
-- ============================================================
-- Jalankan query ini di Supabase SQL Editor setelah membuat project

-- Enable UUID extension
create extension if not exists "pgcrypto";

-- ─── Transactions ────────────────────────────────────────────
create table if not exists transactions (
  id           uuid primary key default gen_random_uuid(),
  type         text not null check (type in ('masuk', 'keluar')),
  category     text not null,
  sub_category text,
  budget_pos_id uuid,
  goal_id      uuid,
  amount       numeric(15,2) not null check (amount >= 0),
  note         text default '',
  date         date not null default current_date,
  created_at   timestamptz default now()
);

create index if not exists idx_transactions_date on transactions(date desc);
create index if not exists idx_transactions_type on transactions(type);
create index if not exists idx_transactions_budget_pos on transactions(budget_pos_id);

-- ─── Budget Pos ──────────────────────────────────────────────
create table if not exists budget_pos (
  id                  uuid primary key default gen_random_uuid(),
  name                text not null,
  monthly_allocation  numeric(15,2) not null check (monthly_allocation >= 0),
  rollover            boolean default false,
  created_at          timestamptz default now()
);

-- ─── Debt Parties ────────────────────────────────────────────
create table if not exists debt_parties (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  created_at timestamptz default now()
);

-- ─── Debt Transactions ───────────────────────────────────────
create table if not exists debt_transactions (
  id         uuid primary key default gen_random_uuid(),
  party_id   uuid not null references debt_parties(id) on delete cascade,
  type       text not null check (type in ('tambah', 'bayar')),
  amount     numeric(15,2) not null check (amount >= 0),
  note       text default '',
  date       date not null default current_date,
  created_at timestamptz default now()
);

create index if not exists idx_debt_txn_party on debt_transactions(party_id);

-- ─── Saving Goals ────────────────────────────────────────────
create table if not exists saving_goals (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  target_amount numeric(15,2) not null check (target_amount > 0),
  created_at    timestamptz default now()
);

-- ─── Categories ──────────────────────────────────────────────
create table if not exists categories (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  type       text not null check (type in ('masuk', 'keluar', 'both')),
  is_default boolean default false
);

-- Seed default categories
insert into categories (name, type, is_default) values
  ('Gaji', 'masuk', true),
  ('Bonus', 'masuk', true),
  ('Investasi', 'masuk', true),
  ('Tabungan', 'both', true),
  ('Pengeluaran', 'keluar', true),
  ('Hutang', 'both', true),
  ('Lainnya', 'both', true)
on conflict do nothing;

-- ─── App Settings ────────────────────────────────────────────
create table if not exists app_settings (
  id        integer primary key default 1 check (id = 1), -- singleton
  user_name text default 'Pengguna',
  dark_mode boolean default false,
  updated_at timestamptz default now()
);

insert into app_settings (id, user_name, dark_mode) values (1, 'Pengguna', false)
on conflict (id) do nothing;

-- ─── Row Level Security (RLS) ────────────────────────────────
-- Enable RLS on all tables (untuk multi-user, setiap user hanya lihat datanya sendiri)
-- CATATAN: Untuk single user personal, bisa skip RLS dan gunakan anon key saja

-- alter table transactions enable row level security;
-- alter table budget_pos enable row level security;
-- alter table debt_parties enable row level security;
-- alter table debt_transactions enable row level security;
-- alter table saving_goals enable row level security;
-- alter table categories enable row level security;
-- alter table app_settings enable row level security;
