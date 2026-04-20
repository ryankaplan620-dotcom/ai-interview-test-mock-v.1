-- ==========================================================================
-- Folio — Core Schema
-- Migration 0001: Initial tables, enums, triggers
-- ==========================================================================
-- This migration creates the foundational data model for Folio.
-- Run with: supabase db push
-- ==========================================================================

-- ==========================================================================
-- EXTENSIONS
-- ==========================================================================
create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";
create extension if not exists "vector";

-- ==========================================================================
-- ENUMS
-- ==========================================================================

-- Subscription tiers — match the locked pricing model
create type subscription_tier as enum (
  'trial',        -- 15-day free trial of General features
  'student',      -- $5.99/mo verified student
  'general',      -- $9.99/mo
  'pro',          -- $19.99/mo
  'max'           -- $30/mo
);

-- Subscription billing status (mirrors Stripe's subscription status)
create type subscription_status as enum (
  'trialing',
  'active',
  'past_due',
  'canceled',
  'incomplete',
  'incomplete_expired',
  'unpaid',
  'paused'
);

-- Student verification status
create type verification_status as enum (
  'pending',
  'verified',
  'rejected',
  'expired'
);

-- Interview session status
create type session_status as enum (
  'scheduled',
  'in_progress',
  'completed',
  'abandoned',
  'failed'
);

-- Interview personas — the 5 standard recruiters
create type persona_id as enum (
  'priya',        -- McKinsey / consulting
  'marcus',       -- Goldman / banking
  'sarah',        -- Meta / tech
  'david',        -- Bain Capital / finance
  'jennifer'      -- Stripe / product
);

-- Interview type / round
create type interview_type as enum (
  'behavioral',
  'case',
  'technical',
  'product_sense',
  'superday',       -- Max tier only
  'hard_mode'       -- Max tier only
);

-- ==========================================================================
-- PROFILES TABLE
-- Extends Supabase auth.users with app-specific data
-- ==========================================================================
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text unique not null,
  full_name text,
  avatar_url text,

  -- Target firm / role — used for persona calibration
  target_firms text[] default '{}',
  target_role text,
  target_year int,

  -- Preferences
  preferred_interview_type interview_type,
  timezone text default 'America/New_York',

  -- Timestamps
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_session_at timestamptz
);

comment on table public.profiles is 'User profile data beyond what Supabase auth stores.';

-- ==========================================================================
-- SUBSCRIPTIONS TABLE
-- Stripe-backed subscription records
-- ==========================================================================
create table public.subscriptions (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.profiles(id) on delete cascade,

  -- Stripe identifiers
  stripe_customer_id text unique not null,
  stripe_subscription_id text unique,
  stripe_price_id text,

  -- Tier + status
  tier subscription_tier not null default 'trial',
  status subscription_status not null default 'trialing',

  -- Billing cycle
  billing_cycle text check (billing_cycle in ('monthly', 'yearly')) default 'monthly',
  current_period_start timestamptz,
  current_period_end timestamptz,
  trial_start timestamptz,
  trial_end timestamptz,
  cancel_at_period_end boolean default false,
  canceled_at timestamptz,

  -- Metadata
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index subscriptions_user_id_idx on public.subscriptions(user_id);
create index subscriptions_stripe_customer_idx on public.subscriptions(stripe_customer_id);
create index subscriptions_status_idx on public.subscriptions(status);

comment on table public.subscriptions is 'Subscription state, synced from Stripe via webhooks. One row per user.';

-- ==========================================================================
-- STUDENT VERIFICATION TABLE
-- Tracks SheerID or .edu-email verifications for Student tier eligibility
-- ==========================================================================
create table public.student_verifications (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.profiles(id) on delete cascade,

  -- Method used
  method text not null check (method in ('sheerid', 'edu_email')),

  -- SheerID fields
  sheerid_verification_id text,
  sheerid_program_id text,

  -- .edu email fallback fields
  edu_email text,
  edu_email_verified_at timestamptz,

  -- State
  status verification_status not null default 'pending',
  verified_at timestamptz,
  expires_at timestamptz, -- SheerID verifications expire; we re-verify annually
  rejection_reason text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index student_verifications_user_id_idx on public.student_verifications(user_id);
create index student_verifications_status_idx on public.student_verifications(status);

comment on table public.student_verifications is 'Audit trail of student verification attempts. User qualifies for Student tier if any row has status=verified and expires_at > now().';

-- ==========================================================================
-- INTERVIEW SESSIONS TABLE
-- One row per practice session
-- ==========================================================================
create table public.sessions (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.profiles(id) on delete cascade,

  -- Session config
  persona persona_id not null,
  interview_type interview_type not null default 'behavioral',
  target_firm text,
  target_role text,
  duration_seconds int default 1800, -- default 30 min

  -- Session state
  status session_status not null default 'scheduled',
  started_at timestamptz,
  ended_at timestamptz,
  actual_duration_seconds int,

  -- Storage
  recording_url text, -- R2 URL if recording saved
  recording_size_bytes bigint,
  transcript_url text, -- R2 URL for full transcript JSON

  -- Metrics (populated post-session)
  pause_avg_seconds numeric(5, 2),
  words_per_minute int,
  eye_contact_pct numeric(5, 2), -- Max tier only
  filler_words_count int,

  -- Metadata
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index sessions_user_id_idx on public.sessions(user_id);
create index sessions_status_idx on public.sessions(status);
create index sessions_created_at_idx on public.sessions(created_at desc);
create index sessions_persona_idx on public.sessions(persona);

comment on table public.sessions is 'Interview session records. One row per completed or in-progress session.';

-- ==========================================================================
-- SESSION FEEDBACK TABLE
-- Structured post-session feedback from Claude
-- ==========================================================================
create table public.session_feedback (
  id uuid primary key default uuid_generate_v4(),
  session_id uuid not null references public.sessions(id) on delete cascade,

  -- Overall scoring (0-100)
  overall_score int check (overall_score between 0 and 100),
  structure_score int check (structure_score between 0 and 100),
  specificity_score int check (specificity_score between 0 and 100),
  delivery_score int check (delivery_score between 0 and 100),

  -- Text feedback
  summary text, -- 1-paragraph overview
  strengths text[], -- up to 3 strength points
  improvements text[], -- up to 3 improvement points

  -- Quote-based feedback moments
  feedback_quotes jsonb, -- array of { user_quote, stronger_version, reasoning }

  created_at timestamptz not null default now()
);

create unique index session_feedback_session_id_idx on public.session_feedback(session_id);

comment on table public.session_feedback is 'Post-session structured feedback generated by Claude. One row per completed session.';

-- ==========================================================================
-- TRANSCRIPT TURNS TABLE
-- Individual turn-by-turn utterances within a session
-- ==========================================================================
create table public.transcript_turns (
  id uuid primary key default uuid_generate_v4(),
  session_id uuid not null references public.sessions(id) on delete cascade,

  -- Who spoke
  speaker text not null check (speaker in ('user', 'interviewer')),

  -- Turn content
  text text not null,
  started_at_seconds numeric(8, 2) not null, -- seconds since session start
  ended_at_seconds numeric(8, 2),

  -- For vector search on transcripts (added later when we wire up semantic search)
  embedding vector(1536),

  created_at timestamptz not null default now()
);

create index transcript_turns_session_id_idx on public.transcript_turns(session_id);
create index transcript_turns_started_at_idx on public.transcript_turns(session_id, started_at_seconds);

comment on table public.transcript_turns is 'Turn-by-turn transcript of an interview session. Used for replay and semantic search.';

-- ==========================================================================
-- COACH REVIEWS TABLE
-- $49 one-off human coach review add-on
-- ==========================================================================
create table public.coach_reviews (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  session_id uuid references public.sessions(id) on delete set null,

  -- Payment
  stripe_payment_intent_id text unique not null,
  amount_cents int not null,
  paid_at timestamptz not null,

  -- Review state
  status text not null default 'pending' check (status in ('pending', 'assigned', 'in_progress', 'completed', 'refunded')),
  coach_name text,
  coach_email text,
  assigned_at timestamptz,
  completed_at timestamptz,

  -- Review content
  review_text text,
  review_video_url text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index coach_reviews_user_id_idx on public.coach_reviews(user_id);
create index coach_reviews_status_idx on public.coach_reviews(status);

comment on table public.coach_reviews is 'One-off $49 human coach review add-on purchases.';

-- ==========================================================================
-- WAITLIST TABLE
-- Pre-launch signups (from landing page form)
-- ==========================================================================
create table public.waitlist (
  id uuid primary key default uuid_generate_v4(),
  email text unique not null,
  referral_source text,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  notes text,
  invited_at timestamptz,
  converted_user_id uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create index waitlist_created_at_idx on public.waitlist(created_at desc);

comment on table public.waitlist is 'Pre-launch waitlist signups.';

-- ==========================================================================
-- TRIGGERS — updated_at auto-update
-- ==========================================================================
create or replace function public.handle_updated_at()
returns trigger
language plpgsql
security definer
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_updated_at
  before update on public.profiles
  for each row execute function public.handle_updated_at();

create trigger subscriptions_updated_at
  before update on public.subscriptions
  for each row execute function public.handle_updated_at();

create trigger student_verifications_updated_at
  before update on public.student_verifications
  for each row execute function public.handle_updated_at();

create trigger sessions_updated_at
  before update on public.sessions
  for each row execute function public.handle_updated_at();

create trigger coach_reviews_updated_at
  before update on public.coach_reviews
  for each row execute function public.handle_updated_at();

-- ==========================================================================
-- TRIGGER — auto-create profile + trial subscription on signup
-- ==========================================================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Create profile row
  insert into public.profiles (id, email, full_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1))
  );

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
