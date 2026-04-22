-- ==========================================================================
-- Folio — Migration 0009: End-of-interview Q&A feedback (Upgrade 08)
--
-- Most candidates are dreadful at "do you have any questions for me?" — they
-- ask generic things from blog posts, fail to demonstrate research, and miss
-- the chance to signal genuine interest. No product trains this specifically.
--
-- Folio reserves the final ~3 minutes of every session for the candidate to
-- ask questions. The persona answers in character. After the session, a
-- separate Claude pass evaluates the Q&A portion against its own rubric:
--   - preparation        — did they clearly research the firm / role / person?
--   - specificity        — concrete questions vs generic blog-post questions?
--   - engagement         — did they reference something the interviewer said?
--   - composure          — did they ask anything at all, and with confidence?
--
-- Two tables are added here:
--   1. session_qa_feedback — the rubric scores + commentary for the Q&A section
--   2. session_qa_boundary — where in the transcript the Q&A started, so
--      the Q&A pass and the regular feedback pass can each look at their own
--      portion of the turns (and we can visualise it later if we want)
-- ==========================================================================

-- --------------------------------------------------------------------------
-- session_qa_boundary
--   One row per session for which Q&A detection was attempted. Records the
--   first turn index that counts as "candidate Q&A time" — the persona's
--   transition line, the candidate's first question, or a timestamp
--   heuristic if neither could be detected.
-- --------------------------------------------------------------------------

create type public.qa_boundary_method as enum (
  'transition_detected', -- Claude pass found the persona's invitation turn
  'fallback_timestamp',  -- no clean invitation; used 15%-from-end heuristic
  'absent'               -- not enough transcript to detect (short session)
);

create table if not exists public.session_qa_boundary (
  session_id uuid primary key references public.sessions(id) on delete cascade,
  -- Transcript-turn index (0-based) where Q&A starts. NULL when method='absent'.
  -- The turn at this index is the persona's invitation ("what questions do you
  -- have?") — the candidate's first question is typically the next turn.
  start_turn_index int check (start_turn_index is null or start_turn_index >= 0),
  -- Time offset from session start where Q&A begins (seconds).
  start_seconds numeric(10, 3) check (start_seconds is null or start_seconds >= 0),
  method public.qa_boundary_method not null,
  -- Count of candidate (user) turns inside the Q&A section. If 0, the
  -- candidate was invited to ask but didn't — a distinct failure mode worth
  -- capturing in its own feedback dimension.
  candidate_questions_count int not null default 0 check (candidate_questions_count >= 0),
  created_at timestamptz not null default now()
);

-- --------------------------------------------------------------------------
-- session_qa_feedback
--   The Q&A rubric scores + commentary. One row per session that had a
--   detectable Q&A section (method <> 'absent').
-- --------------------------------------------------------------------------

create table if not exists public.session_qa_feedback (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null unique references public.sessions(id) on delete cascade,

  -- Scores are 0-100 to match the main feedback rubric.
  overall_score smallint not null check (overall_score between 0 and 100),
  preparation_score smallint not null check (preparation_score between 0 and 100),
  specificity_score smallint not null check (specificity_score between 0 and 100),
  engagement_score smallint not null check (engagement_score between 0 and 100),
  composure_score smallint not null check (composure_score between 0 and 100),

  -- 1-3 sentence prose summary.
  summary text not null check (char_length(summary) between 10 and 2000),

  -- Per-question analysis. Each entry: what they asked, what it signalled,
  -- how it could have been stronger. Matches the FeedbackQuote shape of the
  -- main rubric so the UI treatment is consistent.
  question_breakdown jsonb not null default '[]'::jsonb,

  -- Flat list of things to do differently next time.
  improvements text[] not null default array[]::text[] check (array_length(improvements, 1) is null or array_length(improvements, 1) <= 10),

  -- Counts matching what was actually observed. Used by the UI to show
  -- "you asked 2 questions" even if the LLM decided to only deeply analyse one.
  questions_asked_count smallint not null default 0 check (questions_asked_count >= 0),

  created_at timestamptz not null default now()
);

-- --------------------------------------------------------------------------
-- RLS
-- --------------------------------------------------------------------------

alter table public.session_qa_boundary enable row level security;
alter table public.session_qa_feedback enable row level security;

-- Read: user can see rows tied to their own sessions.
create policy qa_boundary_select_own
  on public.session_qa_boundary
  for select
  using (
    exists (
      select 1 from public.sessions s
      where s.id = session_qa_boundary.session_id
        and s.user_id = auth.uid()
    )
  );

create policy qa_feedback_select_own
  on public.session_qa_feedback
  for select
  using (
    exists (
      select 1 from public.sessions s
      where s.id = session_qa_feedback.session_id
        and s.user_id = auth.uid()
    )
  );

-- No user insert/update policies — all writes go via the service role in
-- the feedback generation route.
