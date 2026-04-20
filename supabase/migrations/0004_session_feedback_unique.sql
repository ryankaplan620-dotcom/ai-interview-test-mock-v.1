-- ==========================================================================
-- Folio — Migration 0004: Session feedback uniqueness
-- One feedback row per session. Protects against race conditions where two
-- concurrent requests might try to generate feedback for the same completed
-- session.
-- ==========================================================================

-- Add unique constraint. If duplicates somehow exist (shouldn't in pre-launch),
-- this will fail — manually clean up first if so.
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'session_feedback_session_id_key'
  ) then
    alter table public.session_feedback
      add constraint session_feedback_session_id_key unique (session_id);
  end if;
end $$;

-- Index for the lookup pattern: "does feedback exist for this session?"
create index if not exists session_feedback_session_id_idx
  on public.session_feedback (session_id);
