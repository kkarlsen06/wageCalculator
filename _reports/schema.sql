-- Existing migration history -------------------------------------------------
-- 2025-08-25_on-delete-cascade_user-settings_shifts.sql
alter table user_settings
  drop constraint if exists user_settings_user_id_fkey,
  add constraint user_settings_user_id_fkey
    foreign key (user_id) references auth.users(id) on delete cascade;

-- Inferred schema (based on application usage; adjust to match actual Supabase schema)

create table if not exists public.user_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  profile_picture_url text,
  theme text,
  updated_at timestamptz default now()
);

create table if not exists public.subscriptions (
  user_id uuid primary key references auth.users(id) on delete cascade,
  stripe_customer_id text,
  stripe_subscription_id text,
  status text,
  current_period_end timestamptz,
  price_id text,
  updated_at timestamptz default now()
);

create index if not exists subscriptions_customer_idx
  on public.subscriptions(stripe_customer_id);

create index if not exists subscriptions_subscription_idx
  on public.subscriptions(stripe_subscription_id);

create table if not exists public.audit_log (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid,
  route text,
  method text,
  status integer,
  reason text,
  payload jsonb,
  at timestamptz not null default now()
);

create index if not exists audit_log_route_idx
  on public.audit_log(route, method);
