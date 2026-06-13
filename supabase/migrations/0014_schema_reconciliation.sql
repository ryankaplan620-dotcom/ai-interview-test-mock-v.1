-- ==========================================================================
-- Folio — Migration 0014: Schema reconciliation
--
-- Fixes discovered pre-launch before any real subscriber data exists:
--   1. Rename subscription_tier 'cycle' → 'basic', add 'free'
--   2. Re-target subscriptions.user_id FK to users(id) (auth user id)
--   3. Add missing columns needed by the Stripe webhook handler
--   4. Create student_verifications table (missing from applied migrations)
--   5. Rebuild user_tiers view with all fields the app expects
-- ==========================================================================

-- ---- 1. Fix subscription_tier enum -----------------------------------------
-- PostgreSQL 10+ supports RENAME VALUE; DB is on PG17.
ALTER TYPE public.subscription_tier RENAME VALUE 'cycle' TO 'basic';
ALTER TYPE public.subscription_tier ADD VALUE IF NOT EXISTS 'free' BEFORE 'basic';

-- ---- 2. Fix subscriptions FK ------------------------------------------------
-- The FK previously pointed to user_profiles(id). The app expects
-- user_id = auth.uid() which lives in users(id). No data to migrate (pre-launch).
ALTER TABLE public.subscriptions
  DROP CONSTRAINT IF EXISTS subscriptions_user_id_fkey;
ALTER TABLE public.subscriptions
  ADD CONSTRAINT subscriptions_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;

-- ---- 3. Add missing columns to subscriptions --------------------------------
-- The Stripe webhook handler (syncSubscription) writes all of these.
ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS stripe_price_id text,
  ADD COLUMN IF NOT EXISTS current_period_start timestamptz,
  ADD COLUMN IF NOT EXISTS current_period_end timestamptz,
  ADD COLUMN IF NOT EXISTS trial_start timestamptz,
  ADD COLUMN IF NOT EXISTS trial_end timestamptz,
  ADD COLUMN IF NOT EXISTS cancel_at_period_end boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS canceled_at timestamptz;

-- ---- 4. Create student_verifications table ----------------------------------
-- This table was referenced in migration 0002's user_tiers view and in
-- lib/verification/student.ts but was never applied to the live schema.

DO $$ BEGIN
  CREATE TYPE public.verification_status AS ENUM ('pending', 'verified', 'rejected', 'expired');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS public.student_verifications (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,

  method        text NOT NULL CHECK (method IN ('sheerid', 'edu_email')),

  -- SheerID fields
  sheerid_verification_id text,
  sheerid_program_id      text,

  -- .edu email fallback
  edu_email               text,
  edu_email_verified_at   timestamptz,

  -- State
  status           public.verification_status NOT NULL DEFAULT 'pending',
  verified_at      timestamptz,
  expires_at       timestamptz,
  rejection_reason text,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS student_verifications_user_id_idx
  ON public.student_verifications (user_id);
CREATE INDEX IF NOT EXISTS student_verifications_status_idx
  ON public.student_verifications (status);

-- Users can only read their own verification status
ALTER TABLE public.student_verifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS student_verifications_select_own ON public.student_verifications;
CREATE POLICY student_verifications_select_own
  ON public.student_verifications FOR SELECT
  USING (user_id = auth.uid());

-- ---- 5. Rebuild user_tiers view --------------------------------------------
-- Drop then recreate to allow column reordering and additions.
-- Joins users for email, student_verifications for is_verified_student.
-- Corrects included_sessions to match lib/tiers.ts (basic=3, pro=8, max=9999).
DROP VIEW IF EXISTS public.user_tiers;

CREATE VIEW public.user_tiers AS
SELECT
  s.user_id,
  u.email,
  s.tier                                                          AS effective_tier,
  s.tier,
  s.status,
  s.cycle_start,
  s.cycle_end,
  s.current_period_end,
  s.trial_end,
  s.cancel_at_period_end,
  s.sessions_used_this_cycle,
  s.overages_used_this_cycle,
  t.included_sessions,
  GREATEST(0, t.included_sessions - s.sessions_used_this_cycle)  AS sessions_remaining_this_cycle,
  s.auto_renew,
  EXISTS (
    SELECT 1
    FROM   public.student_verifications sv
    WHERE  sv.user_id = s.user_id
      AND  sv.status  = 'verified'
      AND  (sv.expires_at IS NULL OR sv.expires_at > now())
  )                                                               AS is_verified_student
FROM public.subscriptions s
JOIN public.users u ON u.id = s.user_id
JOIN (VALUES
  ('basic'::public.subscription_tier, 3),
  ('pro'::public.subscription_tier,   8),
  ('max'::public.subscription_tier,   9999)
) AS t(tier, included_sessions) ON t.tier = s.tier
WHERE s.status IN ('active', 'trialing');

GRANT SELECT ON public.user_tiers TO authenticated;
