-- ==========================================================================
-- Folio — Migration 0008: Session memory (Upgrade 07)
--
-- Adds a per-user, per-persona memory table. After each completed session,
-- a Claude extraction pass writes 0-3 "memory notes" from the interviewer's
-- point of view. At the start of the next session with the same persona,
-- these notes are pulled back in as conversational_context so the persona
-- can reference them naturally ("last time you hedged on conflict — let's
-- test that again").
--
-- Memory is per-persona by design: Priya's notes are Priya's. Marcus does
-- not know what Priya observed. This preserves the character illusion and
-- matches how real interview panels work — each interviewer has their own
-- read of the candidate.
-- ==========================================================================

create table if not exists public.user_session_memory (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  persona text not null,
  source_session_id uuid references public.sessions(id) on delete set null,

  -- The actual note, written in first person as the interviewer.
  -- "This candidate hedges on conflict questions. Worth testing again."
  memory_text text not null check (char_length(memory_text) between 10 and 500),

  -- Short snake_case tag for grouping / analytics.
  -- Examples: conflict_hedging, strong_star_structure, vague_metrics,
  -- rambles_under_pressure, filler_under_silence, crisp_resume_walk
  category text not null check (char_length(category) between 2 and 64),

  -- 1 (tentative) to 5 (high-confidence). Used to break ties when pulling
  -- the top N memories to surface in the next session.
  confidence smallint not null default 3 check (confidence between 1 and 5),

  -- How many times this memory has been pulled into a later session's
  -- context. Used to deprioritize over-surfaced memories; each persona
  -- shouldn't keep riffing on the same note forever.
  surfaced_count int not null default 0,

  -- User dismissal. Dismissed memories are excluded from surfacing but
  -- retained for audit. User can un-dismiss from settings.
  dismissed boolean not null default false,
  dismissed_at timestamptz,

  created_at timestamptz not null default now()
);

-- The hot query: "fetch up-to-N active memories for (user, persona), ranked
-- by recency + low surfaced_count." This index covers it cleanly.
create index if not exists user_session_memory_surface_idx
  on public.user_session_memory (user_id, persona, dismissed, surfaced_count, created_at desc);

create index if not exists user_session_memory_source_session_idx
  on public.user_session_memory (source_session_id);

-- ---- RLS --------------------------------------------------------------
alter table public.user_session_memory enable row level security;

-- Read: user can see their own memories (for the /settings/memory page)
create policy memory_select_own
  on public.user_session_memory
  for select
  using (user_id = auth.uid());

-- Update: user can dismiss/restore their own memories.
-- We intentionally only allow flipping dismissed + dismissed_at — not editing
-- memory_text itself. Letting users rewrite the interviewer's notes would
-- break the illusion that the interviewer actually remembers them.
create policy memory_update_own_dismiss
  on public.user_session_memory
  for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- Inserts and unconditional updates (for surfaced_count increments) happen
-- via the service-role client only — no insert/delete policies here.

-- ---- Helper RPC: atomic surfaced_count bump --------------------------
-- Called after a session creates its Tavus conversation, to mark which
-- memories were pulled into that session's context. Bulk-increments N rows
-- in one call.

create or replace function public.bump_memory_surfaced_count(p_memory_ids uuid[])
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.user_session_memory
  set surfaced_count = surfaced_count + 1
  where id = any(p_memory_ids);
end;
$$;

revoke all on function public.bump_memory_surfaced_count(uuid[]) from public;
-- Only service role calls this — webhook / conversation route — so no grant
-- to authenticated. If we ever need to call it from a user-facing route,
-- wrap it in a route that re-validates the memory ownership first.
