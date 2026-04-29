-- Session analytics — stores rich perception data from Tavus conversations

create table if not exists public.session_analytics (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.sessions(id) on delete cascade,

  -- Perception analysis from Tavus
  emotional_states jsonb,          -- e.g. [{"emotion": "calm", "intensity": 0.7, "timestamp_seconds": 45}]
  tone_shifts jsonb,               -- e.g. [{"from": "confident", "to": "hesitant", "at_seconds": 120}]
  key_discussion_points jsonb,     -- e.g. [{"topic": "leadership experience", "sentiment": "positive"}]
  overall_sentiment text,          -- e.g. "calm, engaged, occasionally nervous"
  confidence_level real,           -- 0-1 aggregate confidence score
  engagement_score real,           -- 0-1 aggregate engagement score

  -- Recording
  recording_url text,
  recording_s3_key text,

  -- Raw payload (for future analysis)
  raw_perception_payload jsonb,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique(session_id)
);

create index if not exists session_analytics_session_id_idx
  on public.session_analytics (session_id);

-- RLS: read-only for session owner
alter table public.session_analytics enable row level security;

create policy session_analytics_select_own on public.session_analytics
  for select using (
    session_id in (select id from public.sessions where user_id = auth.uid())
  );
