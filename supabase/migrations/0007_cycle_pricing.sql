-- ==========================================================================
-- Folio — Migration 0007: Cycle-based pricing (corrected)
--
-- This migration originally assumed a `public.user_profiles` table (never
-- created — 0001 created `public.profiles`) and tried to `create table if
-- not exists public.subscriptions` with a shape that conflicts with the
-- `public.subscriptions` table 0001 already created. Because the table
-- already existed, that statement silently no-op'd, so this migration's own
-- `create index ... (user_id, cycle_end)` then errored on a column that was
-- never added — meaning nothing past that point (this table, the view, the
-- RPC, the `sessions.is_overage` column) ever actually landed anywhere.
--
-- Separately, the tier vocabulary here ('cycle' | 'pro' | 'max') never
-- matched what the app has actually shipped since (`lib/tiers.ts`:
-- 'free' | 'basic' | 'pro' | 'max', the pricing model "locked April 2026"),
-- which is what `lib/stripe/checkout.ts` and `lib/stripe/webhook-handlers.ts`
-- write to `subscriptions.tier` today. Every real checkout attempt writes
-- `tier: "basic"` — a value neither this migration's enum nor 0001's
-- original enum (`trial|student|general|pro|max`) accepts, so the very
-- first Stripe checkout in any environment fails on an invalid-enum-value
-- error at the DB layer.
--
-- Pre-launch, no production data depends on the old shape (per the original
-- comment on this file). This migration corrects it in place rather than
-- layering another patch on top of a chain that never successfully ran.
-- ==========================================================================

-- ---- 1. Tier enum — swap to the shipped free/basic/pro/max model --------
-- A brand-new type (not `alter type ... add value`) so its values are usable
-- immediately in this same transaction (Postgres forbids using a value added
-- via ADD VALUE until after commit).
alter type public.subscription_tier rename to subscription_tier_legacy_0001;
create type public.subscription_tier as enum ('free', 'basic', 'pro', 'max');

-- 0002's user_tiers view reads subscriptions.tier — Postgres won't let a
-- column's type change while a view depends on it. Dropped here, rebuilt in
-- step 4 below against the new tier model anyway.
drop view if exists public.user_tiers;

alter table public.subscriptions alter column tier drop default;
alter table public.subscriptions
  alter column tier type public.subscription_tier
  using (
    case tier::text
      when 'pro' then 'pro'
      when 'max' then 'max'
      else 'basic' -- trial/student/general (legacy, pre-launch, no real rows)
    end
  )::public.subscription_tier;
alter table public.subscriptions alter column tier set default 'free';

-- ---- 2. Cycle-tracking columns on the existing subscriptions table -------
alter table public.subscriptions
  add column if not exists cycle_start timestamptz,
  add column if not exists cycle_end timestamptz,
  add column if not exists sessions_used_this_cycle int not null default 0,
  add column if not exists overages_used_this_cycle int not null default 0,
  add column if not exists auto_renew boolean not null default true;

create index if not exists subscriptions_user_cycle_idx
  on public.subscriptions (user_id, cycle_end);

-- ---- 3. Overage purchases ------------------------------------------------
create table if not exists public.overage_purchases (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
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

-- lib/stripe/webhook-handlers.ts upserts onConflict: "stripe_payment_intent_id" —
-- that requires a matching unique index, which this migration never had.
create unique index if not exists overage_purchases_stripe_pi_idx
  on public.overage_purchases (stripe_payment_intent_id);

alter table public.overage_purchases enable row level security;

do $$ begin
  create policy overages_select_own on public.overage_purchases
    for select using (user_id = auth.uid());
exception when duplicate_object then null; end $$;
do $$ begin
  create policy overages_insert_own on public.overage_purchases
    for insert with check (user_id = auth.uid());
exception when duplicate_object then null; end $$;

-- ---- 4. User tiers view ---------------------------------------------------
-- included_sessions must track lib/tiers.ts TIERS.*.allotments.interviewSessions.
-- 'max' is unlimited in app config (Infinity); an int column can't hold that,
-- so this uses a large sentinel — the app never gates on this column anyway
-- (lib/gates/session.ts reads TIERS directly), it's display-only.
create or replace view public.user_tiers as
select
  p.id as user_id,
  p.email,
  coalesce(s.tier, 'free'::public.subscription_tier) as effective_tier,
  coalesce(s.status, 'active'::public.subscription_status) as status,
  s.current_period_end,
  s.trial_end,
  coalesce(s.cancel_at_period_end, false) as cancel_at_period_end,
  exists (
    select 1 from public.student_verifications sv
    where sv.user_id = p.id
      and sv.status = 'verified'
      and (sv.expires_at is null or sv.expires_at > now())
  ) as is_verified_student,
  s.cycle_start,
  s.cycle_end,
  coalesce(s.sessions_used_this_cycle, 0) as sessions_used_this_cycle,
  coalesce(s.overages_used_this_cycle, 0) as overages_used_this_cycle,
  t.included_sessions,
  greatest(0, t.included_sessions - coalesce(s.sessions_used_this_cycle, 0)) as sessions_remaining_this_cycle,
  coalesce(s.auto_renew, false) as auto_renew
from public.profiles p
left join public.subscriptions s on s.user_id = p.id
join (values
  ('free'::public.subscription_tier, 1),
  ('basic'::public.subscription_tier, 3),
  ('pro'::public.subscription_tier, 8),
  ('max'::public.subscription_tier, 999999)
) as t(tier, included_sessions) on t.tier = coalesce(s.tier, 'free'::public.subscription_tier);

grant select on public.user_tiers to authenticated;

-- ---- 5. Sessions overage flag --------------------------------------------
alter table public.sessions
  add column if not exists is_overage boolean not null default false;

-- ---- 6. Increment helper RPC ----------------------------------------------
-- p_max, when given, makes this a conditional increment ("only bump if the
-- counter is still below the cap") checked and applied atomically in one
-- UPDATE, closing the TOCTOU window between actions.ts reading the cached
-- tier's used-count and the insert that follows it. Returns whether the
-- increment was applied — callers must treat `false` as "quota already
-- consumed by a concurrent request" and not proceed.
create or replace function public.increment_subscription_counter(
  p_user_id uuid,
  p_field text,
  p_max int default null
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row_count int;
begin
  if p_field not in ('sessions_used_this_cycle', 'overages_used_this_cycle') then
    raise exception 'invalid counter field: %', p_field;
  end if;

  if p_field = 'sessions_used_this_cycle' then
    update public.subscriptions
    set sessions_used_this_cycle = sessions_used_this_cycle + 1
    where user_id = p_user_id
      and status in ('active', 'trialing')
      and (cycle_end is null or cycle_end > now())
      and (p_max is null or sessions_used_this_cycle < p_max);
  else
    update public.subscriptions
    set overages_used_this_cycle = overages_used_this_cycle + 1
    where user_id = p_user_id
      and status in ('active', 'trialing')
      and (cycle_end is null or cycle_end > now())
      and (p_max is null or overages_used_this_cycle < p_max);
  end if;

  get diagnostics v_row_count = row_count;
  return v_row_count > 0;
end;
$$;

-- The old two-arg signature (no cap, always-apply) is superseded — drop it so
-- there isn't an ambiguous overload sitting alongside the three-arg version.
drop function if exists public.increment_subscription_counter(uuid, text);

revoke all on function public.increment_subscription_counter(uuid, text, int) from public;
grant execute on function public.increment_subscription_counter(uuid, text, int) to authenticated;

-- Compensating release for a quota slot claimed via increment_subscription_counter
-- when the session insert that was supposed to follow it never landed.
create or replace function public.decrement_subscription_counter(
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
    set sessions_used_this_cycle = greatest(0, sessions_used_this_cycle - 1)
    where user_id = p_user_id;
  else
    update public.subscriptions
    set overages_used_this_cycle = greatest(0, overages_used_this_cycle - 1)
    where user_id = p_user_id;
  end if;
end;
$$;

revoke all on function public.decrement_subscription_counter(uuid, text) from public;
grant execute on function public.decrement_subscription_counter(uuid, text) to authenticated;
