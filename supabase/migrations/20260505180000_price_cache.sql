-- Server-side market data cache (accessed only with service role; RLS blocks anon/auth clients)
create table if not exists public.price_cache (
  key text primary key,
  value jsonb not null,
  fetched_at timestamptz not null default now(),
  soft_expires_at timestamptz not null,
  hard_expires_at timestamptz not null,
  last_status int,
  source text
);

create index if not exists price_cache_hard_expires_idx on public.price_cache (hard_expires_at);

alter table public.price_cache enable row level security;

-- No policies: anon/authenticated users cannot read/write. Service role bypasses RLS.
