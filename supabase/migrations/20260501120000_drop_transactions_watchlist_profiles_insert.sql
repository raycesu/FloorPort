-- Irreversible without backup: drops transactions and watchlist (removed features).
-- Adds profiles INSERT policy so users can recover a row if handle_new_user() ever failed.

-- watchlist
drop policy if exists "Users manage own watchlist" on public.watchlist;
drop table if exists public.watchlist;

-- transactions (references holdings)
drop policy if exists "Users manage own transactions" on public.transactions;
drop table if exists public.transactions;

-- profiles: allow authenticated user to insert their own row once
drop policy if exists "Users can insert own profile" on public.profiles;
create policy "Users can insert own profile"
  on public.profiles for insert
  with check (auth.uid() = id);
