-- Make increment_subscription_counter quota-guarded and race-safe.
--
-- The previous version incremented unconditionally. The application layer
-- (app/(app)/session/new/actions.ts) checked the quota, then inserted the
-- session row, then called this RPC — so two concurrent requests (a
-- double-click, two open tabs) could both pass the application-level check
-- against the same pre-fetched count and both insert a session, pushing the
-- user's sessions_used_this_cycle past their tier's included allotment.
--
-- Adding the WHERE guard directly to the UPDATE closes that window: Postgres
-- takes a row lock on the first UPDATE, so a concurrent second UPDATE blocks
-- until the first commits, then evaluates its WHERE clause against the
-- now-current count. The function returns whether it actually incremented,
-- so the caller can atomically "reserve" a slot before inserting the session
-- row, instead of incrementing after the fact.
--
-- p_limit is only meaningful for sessions_used_this_cycle (the included-quota
-- counter). Overage sessions are pay-per-use and uncapped at this layer, so
-- callers pass p_limit = null for overages_used_this_cycle.

create or replace function public.increment_subscription_counter(
  p_user_id uuid,
  p_field text,
  p_limit integer default null
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_reserved boolean;
begin
  if p_field not in ('sessions_used_this_cycle', 'overages_used_this_cycle') then
    raise exception 'invalid counter field: %', p_field;
  end if;

  if p_field = 'sessions_used_this_cycle' then
    update public.subscriptions
    set sessions_used_this_cycle = sessions_used_this_cycle + 1
    where user_id = p_user_id
      and status in ('active', 'trialing')
      and cycle_end > now()
      and (p_limit is null or sessions_used_this_cycle < p_limit)
    returning true into v_reserved;
  else
    update public.subscriptions
    set overages_used_this_cycle = overages_used_this_cycle + 1
    where user_id = p_user_id
      and status in ('active', 'trialing')
      and cycle_end > now()
    returning true into v_reserved;
  end if;

  return coalesce(v_reserved, false);
end;
$$;

-- The old two-arg signature is superseded by the three-arg version above
-- (p_limit defaults to null, so existing two-arg callers still resolve).
drop function if exists public.increment_subscription_counter(uuid, text);

revoke all on function public.increment_subscription_counter(uuid, text, integer) from public;
grant execute on function public.increment_subscription_counter(uuid, text, integer) to authenticated;
