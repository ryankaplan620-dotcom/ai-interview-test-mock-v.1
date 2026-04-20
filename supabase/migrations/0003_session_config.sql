-- ==========================================================================
-- Folio — Migration 0003: Session config fields
-- Adds `mode` (easy/standard/hard) and `is_panel` (panel simulation) to sessions.
-- Both are used by the voice-pipeline orchestrator to compose persona prompts
-- and enforce tier gates at runtime.
-- ==========================================================================

alter table public.sessions
  add column if not exists mode text not null default 'standard',
  add column if not exists is_panel boolean not null default false;

-- Constrain mode to the three valid values.
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'sessions_mode_check'
  ) then
    alter table public.sessions
      add constraint sessions_mode_check check (mode in ('easy', 'standard', 'hard'));
  end if;
end $$;

-- Helpful composite index for the dashboard query pattern (user_id + status + created_at desc).
-- The dashboard fetches the user's 10 most recent non-failed sessions.
create index if not exists sessions_user_status_created_idx
  on public.sessions (user_id, status, created_at desc);

-- Index for counting retained sessions per user (used by the tier gate's
-- retention check at session start).
create index if not exists sessions_user_retained_idx
  on public.sessions (user_id)
  where status not in ('failed', 'abandoned');
