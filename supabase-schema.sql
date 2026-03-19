-- Run this in your Supabase SQL Editor

-- Profiles table (auto-created on signup)
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade primary key,
  email text,
  stripe_customer_id text,
  stripe_subscription_id text,
  subscription_status text default 'free',
  ai_analyses_used int default 0,
  ai_analyses_reset_at timestamptz default date_trunc('month', now()),
  ai_insights jsonb,
  ai_insights_at timestamptz,
  created_at timestamptz default now()
);

alter table public.profiles enable row level security;

create policy "Users can view own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id);

-- Trades table (stores full trade object as JSONB)
create table if not exists public.trades (
  id bigint primary key,
  user_id uuid references auth.users on delete cascade not null,
  data jsonb not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.trades enable row level security;

create policy "Users can manage own trades"
  on public.trades for all
  using (auth.uid() = user_id);

-- Auto-create profile on new user signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email)
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Add these columns if upgrading an existing database:
-- alter table public.profiles add column if not exists ai_insights jsonb;
-- alter table public.profiles add column if not exists ai_insights_at timestamptz;

-- Reset AI analysis counter monthly (run as a cron job in Supabase or pg_cron)
-- update public.profiles
-- set ai_analyses_used = 0, ai_analyses_reset_at = date_trunc('month', now())
-- where ai_analyses_reset_at < date_trunc('month', now());
