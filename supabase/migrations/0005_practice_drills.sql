-- Enable uuid-ossp if not already
create extension if not exists "uuid-ossp" with schema extensions;

-- ==========================================================================
-- Folio — Migration 0005: Practice drills (Engine 2)
--
-- Engine 2 is "targeted practice" — standalone drill sessions outside a full
-- interview. MVP supports Story Polishing, where a user rehearses the same
-- answer 5 times in a row with feedback each attempt.
--
-- Schema is designed to generalize: `drill_type` is a text column so new
-- drill types (pause-coaching, 60-second-pitch, pushback-handling) can ship
-- as content additions without migrations.
-- ==========================================================================

-- ---- Drills -------------------------------------------------------------

create table public.drills (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.user_profiles(id) on delete cascade,

  -- Drill classification
  drill_type text not null,     -- e.g. 'story_polishing', 'pitch_60s'
  prompt_id text not null,      -- e.g. 'lead_team', 'tell_me_about_yourself' — references registry
  prompt_text text not null,    -- frozen at start so registry changes don't affect in-flight drills

  -- Configuration (shape varies by drill_type; stored as jsonb for flexibility)
  config jsonb not null default '{}'::jsonb,
  -- For story_polishing, config is { "target_attempts": 5 }

  -- Progress
  status text not null default 'in_progress'
    check (status in ('in_progress', 'completed', 'abandoned')),

  -- Timing
  created_at timestamptz not null default now(),
  started_at timestamptz default now(),
  ended_at timestamptz
);

create index drills_user_id_created_at_idx on public.drills (user_id, created_at desc);
create index drills_status_idx on public.drills (status);

-- ---- Drill attempts -----------------------------------------------------
-- Each attempt within a drill. For story_polishing, there will be up to 5.
-- Order determined by attempt_number, monotonically increasing within a drill.

create table public.drill_attempts (
  id uuid primary key default gen_random_uuid(),
  drill_id uuid not null references public.drills(id) on delete cascade,
  attempt_number int not null,

  -- Content
  transcript text not null,
  duration_seconds real not null,

  -- Feedback (populated after analysis completes)
  overall_score int check (overall_score between 0 and 100),
  -- Sub-scores — shape varies by drill_type. Stored as jsonb so new drills
  -- can define their own rubric dimensions without migrations.
  sub_scores jsonb not null default '{}'::jsonb,

  -- Feedback narrative
  summary text,
  strengths text[],
  improvements text[],

  -- Filler word detection (useful across most drill types)
  filler_words jsonb,        -- e.g. { "um": 4, "like": 6, "you_know": 2 }
  filler_count int default 0,

  -- Pace
  words_per_minute real,

  created_at timestamptz not null default now(),

  -- Exactly one attempt per (drill, attempt_number)
  unique (drill_id, attempt_number)
);

create index drill_attempts_drill_id_attempt_idx
  on public.drill_attempts (drill_id, attempt_number);

-- ---- RLS ----------------------------------------------------------------
-- Users can only see their own drills + the attempts for those drills.

alter table public.drills enable row level security;
alter table public.drill_attempts enable row level security;

create policy drills_select_own on public.drills
  for select using (user_id = auth.uid());
create policy drills_insert_own on public.drills
  for insert with check (user_id = auth.uid());
create policy drills_update_own on public.drills
  for update using (user_id = auth.uid());

create policy drill_attempts_select_own on public.drill_attempts
  for select using (
    drill_id in (select id from public.drills where user_id = auth.uid())
  );
create policy drill_attempts_insert_own on public.drill_attempts
  for insert with check (
    drill_id in (select id from public.drills where user_id = auth.uid())
  );
create policy drill_attempts_update_own on public.drill_attempts
  for update using (
    drill_id in (select id from public.drills where user_id = auth.uid())
  );
