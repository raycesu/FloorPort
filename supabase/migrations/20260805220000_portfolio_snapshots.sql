-- Weekly portfolio price snapshots (written by the cron endpoint via service role only).
-- Used to diff week-over-week portfolio value and per-asset price movement for the
-- Telegram summary, and to keep the Supabase project active with regular writes.
create table if not exists public.portfolio_snapshots (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  created_at timestamptz not null default now(),
  total_value_usd numeric not null,
  holdings jsonb not null
);

create index if not exists portfolio_snapshots_user_created_idx
  on public.portfolio_snapshots (user_id, created_at desc);

alter table public.portfolio_snapshots enable row level security;

-- No policies: anon/authenticated users cannot read/write. Service role (cron) bypasses RLS.
