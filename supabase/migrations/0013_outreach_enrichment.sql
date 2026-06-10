-- Outreach enrichment — stores the web_search-derived mini-profile data per
-- scouted contact (LinkedIn URL, inferred email + confidence, role signal,
-- tenure signal, etc). JSONB so we can extend the shape without further
-- migrations.

alter table public.outreach_contacts
  add column if not exists enrichment jsonb;

-- relevance_reason / suggested_approach are populated by scout but may not
-- exist on legacy installs. Add defensively.
alter table public.outreach_contacts
  add column if not exists relevance_reason text;

alter table public.outreach_contacts
  add column if not exists suggested_approach text;
