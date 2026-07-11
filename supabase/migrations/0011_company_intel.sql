-- ==========================================================================
-- Folio — Migration 0011: Company Intelligence cache
--
-- Stores structured company data used to enrich persona system prompts
-- at session start. Refreshed nightly for top companies, on-demand for
-- tail companies.
-- ==========================================================================

-- ---- Company intel cache ---------------------------------------------------
-- One row per company. The `data` column holds the full CompanyIntel JSON.
-- Keyed by normalized company name (lowercased, trimmed).

create table if not exists public.company_intel_cache (
  id uuid primary key default gen_random_uuid(),
  company_name text not null,
  company_name_normalized text not null unique,
  data jsonb not null,
  freshness_generated_at timestamptz not null default now(),
  ttl_hours int not null default 168,
  session_count int not null default 0,
  last_accessed_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists company_intel_cache_normalized_idx
  on public.company_intel_cache (company_name_normalized);

create index if not exists company_intel_cache_session_count_idx
  on public.company_intel_cache (session_count desc);

-- ---- Intel questions -------------------------------------------------------
-- Denormalized question rows for fast filtering by company + type + role.
-- Also stored inside the JSON blob, but this table enables SQL queries
-- across companies (e.g., "all behavioral questions for consulting firms").

create table if not exists public.intel_questions (
  id uuid primary key default gen_random_uuid(),
  company_name_normalized text not null,
  text text not null,
  interview_type text not null,
  role text not null default '',
  level text not null default '',
  round text not null default '',
  source text not null default 'other',
  source_url text,
  posted_date text,
  confidence int not null default 0 check (confidence between 0 and 3),
  last_seen text not null,
  created_at timestamptz not null default now()
);

create index if not exists intel_questions_company_idx
  on public.intel_questions (company_name_normalized, interview_type);

create index if not exists intel_questions_confidence_idx
  on public.intel_questions (confidence desc, last_seen desc);

-- ---- Intel sources ---------------------------------------------------------
-- Track every URL fetched, when, and whether it succeeded. For ops + auditing.

create table if not exists public.intel_sources (
  id uuid primary key default gen_random_uuid(),
  company_name_normalized text not null,
  url text not null,
  fetcher text not null,
  status text not null default 'ok' check (status in ('ok', 'stale', 'error')),
  fetched_at timestamptz not null default now(),
  error_message text
);

create index if not exists intel_sources_company_idx
  on public.intel_sources (company_name_normalized, fetched_at desc);

-- ---- User-contributed questions --------------------------------------------
-- First-class source. Users report real questions from real interviews.
-- Stored separately from scraped questions for attribution and quality control.

create table if not exists public.intel_user_contributions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  company_name text not null,
  company_name_normalized text not null,
  question_text text not null,
  interview_type text not null default 'behavioral',
  role text not null default '',
  level text not null default '',
  round text not null default '',
  interview_date text,
  notes text,
  verified boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists intel_user_contributions_company_idx
  on public.intel_user_contributions (company_name_normalized);

-- ---- RLS -------------------------------------------------------------------

alter table public.company_intel_cache enable row level security;
alter table public.intel_questions enable row level security;
alter table public.intel_sources enable row level security;
alter table public.intel_user_contributions enable row level security;

-- Intel cache and questions are readable by all authenticated users
create policy intel_cache_select_all on public.company_intel_cache
  for select using (true);
create policy intel_questions_select_all on public.intel_questions
  for select using (true);
create policy intel_sources_select_all on public.intel_sources
  for select using (true);

-- User contributions: users can read and insert their own
create policy intel_contributions_select_own on public.intel_user_contributions
  for select using (user_id = auth.uid());
create policy intel_contributions_insert_own on public.intel_user_contributions
  for insert with check (user_id = auth.uid());

-- ---- Helper: normalize company name ----------------------------------------

create or replace function public.normalize_company_name(name text)
returns text
language sql
immutable
as $$
  select lower(trim(regexp_replace(name, '\s+', ' ', 'g')))
$$;
