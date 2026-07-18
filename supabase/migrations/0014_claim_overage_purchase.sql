-- ==========================================================================
-- Folio — Migration 0014: atomic overage-purchase claiming
--
-- Closes a free-session bypass: `startSession` used to trust a client-
-- supplied `overageAccepted` boolean to waive the cycle quota, with no
-- server-side proof a payment ever happened. The fix requires an actual
-- succeeded, unconsumed `overage_purchases` row (written only by the Stripe
-- webhook) before a session can be created past quota. This function
-- performs the "find an unconsumed credit and link it to the new session"
-- step atomically, so two concurrent requests can't both claim one credit.
-- ==========================================================================

create or replace function public.claim_overage_purchase(
  p_user_id uuid,
  p_session_id uuid
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  select id into v_id
  from public.overage_purchases
  where user_id = p_user_id
    and status = 'succeeded'
    and session_id is null
  order by created_at asc
  limit 1
  for update skip locked;

  if v_id is null then
    return false;
  end if;

  update public.overage_purchases
  set session_id = p_session_id
  where id = v_id;

  return true;
end;
$$;

revoke all on function public.claim_overage_purchase(uuid, uuid) from public;
grant execute on function public.claim_overage_purchase(uuid, uuid) to authenticated;
