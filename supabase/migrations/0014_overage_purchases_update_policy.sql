-- Add missing UPDATE policy for overage_purchases.
--
-- overage_purchases rows are created (session_id = null) when a user pays
-- for an overage session before a session row exists. startSession() later
-- consumes the row by setting session_id to the newly-inserted session's
-- id, using the authenticated user's own Supabase client — that requires an
-- UPDATE policy, which 0007_cycle_pricing.sql never defined (only SELECT
-- and INSERT). Mirrors the style of overages_select_own / overages_insert_own.

create policy overages_update_own on public.overage_purchases
  for update using (user_id = auth.uid());
