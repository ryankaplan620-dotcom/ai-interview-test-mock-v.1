-- ==========================================================================
-- Folio — Migration 0007: Cycle-based pricing
-- Creates subscriptions table + overage tracking from scratch.
-- Pre-launch — no existing data to migrate.
-- ==========================================================================

-- ---- 1. Subscription tier enum ------------------------------------------

do $$ begin
  create type public.subscription_tier as enum ('cycle', 'pro', 'max');
exception when duplicate_object then null;
end $$;

-- ---- 2. Subscriptions table ---------------------------------------------

create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.user_profiles(id) on delete cascade,

  tier public.subscription_tier not null default 'cycle',
  status text not null default 'active'
    check (status in ('active', 'trialing', 'canceled', 'past_due', 'paused')),

  -- Stripe references
  stripe_customer_id text,
  stripe_subscription_id text unique,

  -- Cycle tracking
  cycle_start timestamptz not null default now(),
  cycle_end timestamptz not null default (now() + interval '90 days'),
  sessions_used_this_cycle int not null default 0,
  overages_used_this_cycle int not null default 0,
  auto_renew boolean not null default true,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists subscriptions_user_cycle_idx
  on public.subscriptions (user_id, cycle_end);
create unique index if not exists subscriptions_stripe_sub_idx
  on public.subscriptions (stripe_subscription_id) where stripe_subscription_id is not null;

-- RLS
alter table public.subscriptions enable row level security;

create policy subscriptions_select_own on public.subscriptions
  for select using (user_id = auth.uid());
create policy subscriptions_insert_own on public.subscriptions
  for insert with check (user_id = auth.uid());
create policy subscriptions_update_own on public.subscriptions
  for update using (user_id = auth.uid());

-- ---- 3. Overage purchases -----------------------------------------------

create table if not exists public.overage_purchases (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.user_profiles(id) on delete cascade,
  subscription_id uuid references public.subscriptions(id) on delete set null,
  session_id uuid references public.sessions(id) on delete set null,

  amount int not null,
  stripe_payment_intent_id text,
  stripe_charge_id text,

  status text not null default 'pending'
    check (status in ('pending', 'succeeded', 'failed', 'refunded')),

  created_at timestamptz not null default now(),
  succeeded_at timestamptz,
  refunded_at timestamptz
);

create index if not exists overage_purchases_user_id_idx
  on public.overage_purchases (user_id, created_at desc);

alter table public.overage_purchases enable row level security;

create policy overages_select_own on public.overage_purchases
  for select using (user_id = auth.uid());
create policy overages_insert_own on public.overage_purchases
  for insert with check (user_id = auth.uid());

-- ---- 4. User tiers view -------------------------------------------------

create or replace view public.user_tiers as
select
  s.user_id,
  s.tier as effective_tier,
  s.tier,
  s.status,
  s.cycle_start,
  s.cycle_end,
  s.sessions_used_this_cycle,
  s.overages_used_this_cycle,
  t.included_sessions,
  greatest(0, t.included_sessions - s.sessions_used_this_cycle) as sessions_remaining_this_cycle,
  s.auto_renew
from public.subscriptions s
join (values
  ('cycle'::public.subscription_tier, 8),
  ('pro'::public.subscription_tier, 24),
  ('max'::public.subscription_tier, 40)
) as t(tier, included_sessions) on t.tier = s.tier
where s.status in ('active', 'trialing');

-- ---- 5. Sessions overage flag --------------------------------------------

alter table public.sessions
  add column if not exists is_overage boolean not null default false;

-- ---- 6. Increment helper RPC --------------------------------------------

create or replace function public.increment_subscription_counter(
  p_user_id uuid,
  p_field text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_field not in ('sessions_used_this_cycle', 'overages_used_this_cycle') then
    raise exception 'invalid counter field: %', p_field;
  end if;

  if p_field = 'sessions_used_this_cycle' then
    update public.subscriptions
    set sessions_used_this_cycle = sessions_used_this_cycle + 1
    where user_id = p_user_id
      and status in ('active', 'trialing')
      and cycle_end > now();
  else
    update public.subscriptions
    set overages_used_this_cycle = overages_used_this_cycle + 1
    where user_id = p_user_id
      and status in ('active', 'trialing')
      and cycle_end > now();
  end if;
end;
$$;

revoke all on function public.increment_subscription_counter(uuid, text) from public;
grant execute on function public.increment_subscription_counter(uuid, text) to authenticated;
