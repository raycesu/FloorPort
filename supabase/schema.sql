-- Run this in Supabase SQL Editor. If trigger fails, use: EXECUTE FUNCTION handle_new_user();

create table profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  display_name text,
  preferred_currency text default 'USD',
  created_at timestamp with time zone default now()
);

alter table profiles enable row level security;

create policy "Users can view own profile" on profiles for select using (auth.uid() = id);
create policy "Users can update own profile" on profiles for update using (auth.uid() = id);
create policy "Users can insert own profile" on profiles for insert with check (auth.uid() = id);

create table wallets (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  created_at timestamp with time zone default now()
);

alter table wallets enable row level security;

create policy "Users manage own wallets" on wallets for all using (auth.uid() = user_id);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'display_name', new.email));
  insert into public.wallets (user_id, name) values (new.id, 'Main');
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create table holdings (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  wallet_id uuid references wallets(id) on delete cascade not null,
  symbol text not null,
  name text not null,
  asset_type text not null,
  quantity numeric not null,
  avg_buy_price numeric not null,
  coingecko_id text,
  added_at timestamp with time zone default now(),
  unique(user_id, wallet_id, symbol)
);

alter table holdings enable row level security;

create policy "Users manage own holdings" on holdings for all using (auth.uid() = user_id);

-- Server-side market cache (service role only; see migration 20260505180000_price_cache.sql)
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
