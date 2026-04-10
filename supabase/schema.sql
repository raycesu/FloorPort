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

create table transactions (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  holding_id uuid references holdings(id) on delete cascade not null,
  symbol text not null,
  asset_type text not null,
  type text not null,
  quantity numeric not null,
  price numeric not null,
  executed_at timestamp with time zone default now(),
  notes text
);

alter table transactions enable row level security;

create policy "Users manage own transactions" on transactions for all using (auth.uid() = user_id);

create table watchlist (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  symbol text not null,
  name text not null,
  asset_type text not null,
  added_at timestamp with time zone default now(),
  unique(user_id, symbol)
);

alter table watchlist enable row level security;

create policy "Users manage own watchlist" on watchlist for all using (auth.uid() = user_id);
