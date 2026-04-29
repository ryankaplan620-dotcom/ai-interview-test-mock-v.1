# Company Intelligence System

## Overview
The Company Intelligence system enriches persona prompts with real, sourced, current company data at session start.

## How it works
1. User selects a target company in the session picker
2. At session start, `fetchCompanyIntel()` is called with a 3s budget
3. Data is fetched from multiple sources in parallel
4. Results are synthesized, scored, and cached
5. A prompt block is composed and injected into the Tavus persona context
6. The persona interviews with real knowledge of the company

## Data sources
| Source | Status | API | Rate limit | Feature flag |
|---|---|---|---|---|
| SEC EDGAR | Active | Public, free | 10 req/sec | INTEL_FETCHER_SEC |
| Company pages | Active | Public | N/A | INTEL_FETCHER_COMPANY_PAGES |
| Reddit | Active | Public JSON | 60 req/min | INTEL_FETCHER_REDDIT |
| Levels.fyi | Active | Public | N/A | INTEL_FETCHER_LEVELS |
| News | Active | NewsAPI / RSS | Varies | INTEL_FETCHER_NEWS |
| User contributed | Active | Internal DB | N/A | Always on |
| Glassdoor | Disabled | Pending legal | — | INTEL_FETCHER_GLASSDOOR |
| WSO | Disabled | Pending legal | — | INTEL_FETCHER_WSO |
| Blind | Disabled | Pending legal | — | INTEL_FETCHER_BLIND |
| Fishbowl | Disabled | Pending legal | — | INTEL_FETCHER_FISHBOWL |

## Refresh cadence
- Top 200 companies (by session volume): nightly via cron
- Tail companies: on-demand at session start with 3s budget
- TTLs: news 7d, questions 30d, comp 90d, culture 180d, filings 365d

## Schema
See `lib/intel/schema.ts` for the full `CompanyIntel` type.

## Cache
Stored in `company_intel_cache` Supabase table. Keyed by normalized company name.

## Admin
- Dashboard: `/admin/intel` (requires INTEL_ADMIN_EMAILS)
- Per-company: `/admin/intel/[company]`
- Manual refresh: `/api/admin/intel/refresh?company=name`

## Takedown process
Any company can request removal of specific data entries:
1. Email support@folio.io with the company name and specific entries
2. Admin removes entries via the admin dashboard within 72 hours
3. Entries are hard-deleted from intel_questions and company_intel_cache

## Privacy
- No user PII stored in intel tables
- User contributions are anonymous (user_id linked but not exposed in intel)
- Source URLs stored for attribution and audit
