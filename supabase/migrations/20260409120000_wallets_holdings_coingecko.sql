-- Apply in Supabase SQL Editor if you already ran the original schema.
-- Creates wallets, backfills Main wallet per user, migrates holdings.

create table if not exists public.wallets (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  created_at timestamp with time zone default now()
);

alter table public.wallets enable row level security;

create policy "Users manage own wallets"
  on public.wallets for all
  using (auth.uid() = user_id);

-- New installs: skip if columns already exist (run sections manually if needed)
alter table public.holdings add column if not exists wallet_id uuid references public.wallets(id) on delete cascade;
alter table public.holdings add column if not exists coingecko_id text;

-- Default wallet for every user who has a profile
insert into public.wallets (user_id, name)
select p.id, 'Main'
from public.profiles p
where not exists (
  select 1 from public.wallets w where w.user_id = p.id
);

update public.holdings h
set wallet_id = w.id
from public.wallets w
where h.user_id = w.user_id and w.name = 'Main'
  and h.wallet_id is null;

alter table public.holdings alter column wallet_id set not null;

do $$
begin
  alter table public.holdings drop constraint holdings_user_id_symbol_key;
exception
  when undefined_object then null;
end $$;

alter table public.holdings add constraint holdings_user_wallet_symbol_unique unique (user_id, wallet_id, symbol);

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
