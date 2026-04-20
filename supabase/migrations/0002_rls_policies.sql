-- ==========================================================================
-- Folio — Row-Level Security Policies
-- Migration 0002: RLS policies for all tables
-- ==========================================================================
-- Principle: users can only see/modify their own data.
-- Service role bypasses RLS for admin operations (Stripe webhooks, etc).
-- ==========================================================================

-- ==========================================================================
-- ENABLE RLS
-- ==========================================================================
alter table public.profiles enable row level security;
alter table public.subscriptions enable row level security;
alter table public.student_verifications enable row level security;
alter table public.sessions enable row level security;
alter table public.session_feedback enable row level security;
alter table public.transcript_turns enable row level security;
alter table public.coach_reviews enable row level security;
alter table public.waitlist enable row level security;

-- ==========================================================================
-- PROFILES — users manage their own profile only
-- ==========================================================================
create policy "Users can view own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- Inserts handled by trigger; no user-facing insert policy needed.

-- ==========================================================================
-- SUBSCRIPTIONS — users can view their own, never modify (webhook only)
-- ==========================================================================
create policy "Users can view own subscription"
  on public.subscriptions for select
  using (auth.uid() = user_id);

-- No insert/update/delete policies — only service role (webhook handler) modifies.

-- ==========================================================================
-- STUDENT VERIFICATIONS — users view their own
-- ==========================================================================
create policy "Users can view own verifications"
  on public.student_verifications for select
  using (auth.uid() = user_id);

create policy "Users can initiate verifications"
  on public.student_verifications for insert
  with check (auth.uid() = user_id);

-- Updates/deletes only via service role.

-- ==========================================================================
-- SESSIONS — users manage their own sessions
-- ==========================================================================
create policy "Users can view own sessions"
  on public.sessions for select
  using (auth.uid() = user_id);

create policy "Users can create sessions"
  on public.sessions for insert
  with check (auth.uid() = user_id);

create policy "Users can update own sessions"
  on public.sessions for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete own sessions"
  on public.sessions for delete
  using (auth.uid() = user_id);

-- ==========================================================================
-- SESSION FEEDBACK — readable by session owner
-- ==========================================================================
create policy "Users can view feedback for own sessions"
  on public.session_feedback for select
  using (
    exists (
      select 1 from public.sessions
      where sessions.id = session_feedback.session_id
      and sessions.user_id = auth.uid()
    )
  );

-- Inserts/updates only via service role (backend generates feedback).

-- ==========================================================================
-- TRANSCRIPT TURNS — readable by session owner
-- ==========================================================================
create policy "Users can view transcript for own sessions"
  on public.transcript_turns for select
  using (
    exists (
      select 1 from public.sessions
      where sessions.id = transcript_turns.session_id
      and sessions.user_id = auth.uid()
    )
  );

-- Inserts only via service role (streaming backend writes turns).

-- ==========================================================================
-- COACH REVIEWS — users manage their own
-- ==========================================================================
create policy "Users can view own coach reviews"
  on public.coach_reviews for select
  using (auth.uid() = user_id);

-- Inserts happen via webhook (Stripe payment succeeded); no user insert policy.

-- ==========================================================================
-- WAITLIST — public insert, no public read
-- ==========================================================================
-- Anyone can sign up, nobody but admins can read.
create policy "Anyone can join waitlist"
  on public.waitlist for insert
  with check (true);

-- ==========================================================================
-- HELPER VIEWS
-- ==========================================================================

-- Computed view: user with effective subscription tier
-- Returns the user's current tier, defaulting to 'trial' if no active sub
create or replace view public.user_tiers as
select
  p.id as user_id,
  p.email,
  coalesce(s.tier, 'trial') as effective_tier,
  coalesce(s.status, 'trialing') as status,
  s.current_period_end,
  s.trial_end,
  s.cancel_at_period_end,
  exists (
    select 1 from public.student_verifications sv
    where sv.user_id = p.id
    and sv.status = 'verified'
    and (sv.expires_at is null or sv.expires_at > now())
  ) as is_verified_student
from public.profiles p
left join public.subscriptions s on s.user_id = p.id;

grant select on public.user_tiers to authenticated;
