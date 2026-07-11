-- Outreach — contacts scouted via lib/outreach/scout.ts and the drafts
-- generated for them (lib/outreach/draft.ts). Neither table was ever created
-- by a migration — app/api/outreach/scout/route.ts's own fallback comment
-- ("If that column doesn't exist yet... fall back") shows the gap was known.
-- Created here, defensively, before the enrichment columns that reference it.

create table if not exists public.outreach_contacts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,

  name text not null,
  title text,
  company text,
  status text not null default 'suggested'
    check (status in ('suggested', 'contacted', 'replied', 'dismissed')),

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.outreach_drafts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  contact_id uuid references public.outreach_contacts(id) on delete cascade,

  subject text not null,
  body text not null,
  status text not null default 'draft' check (status in ('draft', 'sent')),
  tone text,
  sent_at timestamptz,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists outreach_contacts_user_id_idx on public.outreach_contacts (user_id, created_at desc);
create index if not exists outreach_drafts_user_id_idx on public.outreach_drafts (user_id, created_at desc);
create index if not exists outreach_drafts_contact_id_idx on public.outreach_drafts (contact_id);

alter table public.outreach_contacts enable row level security;
alter table public.outreach_drafts enable row level security;

do $$ begin
  create policy outreach_contacts_select_own on public.outreach_contacts
    for select using (user_id = auth.uid());
exception when duplicate_object then null; end $$;
do $$ begin
  create policy outreach_contacts_insert_own on public.outreach_contacts
    for insert with check (user_id = auth.uid());
exception when duplicate_object then null; end $$;
do $$ begin
  create policy outreach_contacts_update_own on public.outreach_contacts
    for update using (user_id = auth.uid());
exception when duplicate_object then null; end $$;
do $$ begin
  create policy outreach_contacts_delete_own on public.outreach_contacts
    for delete using (user_id = auth.uid());
exception when duplicate_object then null; end $$;

do $$ begin
  create policy outreach_drafts_select_own on public.outreach_drafts
    for select using (user_id = auth.uid());
exception when duplicate_object then null; end $$;
do $$ begin
  create policy outreach_drafts_insert_own on public.outreach_drafts
    for insert with check (user_id = auth.uid());
exception when duplicate_object then null; end $$;
do $$ begin
  create policy outreach_drafts_update_own on public.outreach_drafts
    for update using (user_id = auth.uid());
exception when duplicate_object then null; end $$;
do $$ begin
  create policy outreach_drafts_delete_own on public.outreach_drafts
    for delete using (user_id = auth.uid());
exception when duplicate_object then null; end $$;

-- ---- Enrichment columns ---------------------------------------------------
-- Stores the web_search-derived mini-profile data per scouted contact
-- (LinkedIn URL, inferred email + confidence, role signal, tenure signal,
-- etc). JSONB so we can extend the shape without further migrations.

alter table public.outreach_contacts
  add column if not exists enrichment jsonb;

alter table public.outreach_contacts
  add column if not exists relevance_reason text;

alter table public.outreach_contacts
  add column if not exists suggested_approach text;
