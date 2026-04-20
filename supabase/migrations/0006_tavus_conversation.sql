-- ==========================================================================
-- Folio — Migration 0006: Tavus CVI integration
-- Stores the Tavus-side conversation_id + joinable URL on each session so
-- the session-view can resume a live conversation and the webhook can find
-- the right Folio session when events arrive.
-- ==========================================================================

alter table public.sessions
  add column if not exists tavus_conversation_id text,
  add column if not exists tavus_conversation_url text;

-- Webhook lookup uses this column — index it
create index if not exists sessions_tavus_conversation_id_idx
  on public.sessions (tavus_conversation_id)
  where tavus_conversation_id is not null;
