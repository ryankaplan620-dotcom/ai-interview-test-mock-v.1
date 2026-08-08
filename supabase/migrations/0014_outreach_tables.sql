-- ==========================================================================
-- Folio — Migration 0014: Outreach tables (backfill)
--
-- `outreach_contacts` and `outreach_drafts` have been read/written by
-- app/api/outreach/{scout,draft,send}/route.ts and app/(app)/outreach/
-- since those features shipped, but no migration ever created them — 0013
-- only ALTERs `outreach_contacts` to add columns, which only makes sense if
-- the base tables were created out-of-band (e.g. directly in the Supabase
-- dashboard). That means fresh environments can't provision this schema
-- from migrations alone, the tables are missing from generated TS types
-- (both routes cast `supabase.from(...) as any`), and — most importantly —
-- there is no tracked guarantee that RLS is enabled on them. Both tables
-- are read via the anon-key + user-session server client
-- (lib/db/server.ts createServerClient), which relies on RLS for
-- per-user isolation; the `.eq("user_id", user.id)` filters in the route
-- handlers are defense in depth, not the actual boundary.
--
-- `create table if not exists` is a no-op if the tables already exist live,
-- so this is safe to apply against an environment where they were already
-- created manually — it backfills tracked schema + enforces RLS either way.
-- ==========================================================================

create table if not exists public.outreach_contacts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.user_profiles(id) on delete cascade,
  name text not null,
  title text,
  company text,
  source text not null default 'scout',
  status text not null default 'suggested',
  relevance_reason text,
  suggested_approach text,
  enrichment jsonb,
  created_at timestamptz not null default now()
);

create index if not exists outreach_contacts_user_idx
  on public.outreach_contacts (user_id, created_at desc);

create table if not exists public.outreach_drafts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.user_profiles(id) on delete cascade,
  contact_id uuid references public.outreach_contacts(id) on delete set null,
  subject text not null,
  body text not null,
  status text not null default 'draft',
  tone text,
  sent_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists outreach_drafts_user_idx
  on public.outreach_drafts (user_id, created_at desc);

-- ---- RLS ----------------------------------------------------------------
alter table public.outreach_contacts enable row level security;
alter table public.outreach_drafts enable row level security;

drop policy if exists outreach_contacts_owner_select on public.outreach_contacts;
create policy outreach_contacts_owner_select
  on public.outreach_contacts
  for select
  using (user_id = auth.uid());

drop policy if exists outreach_contacts_owner_insert on public.outreach_contacts;
create policy outreach_contacts_owner_insert
  on public.outreach_contacts
  for insert
  with check (user_id = auth.uid());

drop policy if exists outreach_contacts_owner_update on public.outreach_contacts;
create policy outreach_contacts_owner_update
  on public.outreach_contacts
  for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists outreach_contacts_owner_delete on public.outreach_contacts;
create policy outreach_contacts_owner_delete
  on public.outreach_contacts
  for delete
  using (user_id = auth.uid());

drop policy if exists outreach_drafts_owner_select on public.outreach_drafts;
create policy outreach_drafts_owner_select
  on public.outreach_drafts
  for select
  using (user_id = auth.uid());

drop policy if exists outreach_drafts_owner_insert on public.outreach_drafts;
create policy outreach_drafts_owner_insert
  on public.outreach_drafts
  for insert
  with check (user_id = auth.uid());

drop policy if exists outreach_drafts_owner_update on public.outreach_drafts;
create policy outreach_drafts_owner_update
  on public.outreach_drafts
  for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists outreach_drafts_owner_delete on public.outreach_drafts;
create policy outreach_drafts_owner_delete
  on public.outreach_drafts
  for delete
  using (user_id = auth.uid());
