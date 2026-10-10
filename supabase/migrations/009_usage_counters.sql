-- 009_usage_counters.sql
-- Monthly lead quota window per workspace. Only successful leads increment
-- leads_count; the increment is atomic in the lead-creation RPC (§43–46).

create table if not exists public.usage_counters (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  -- V1 rule: calendar month (documented in billing logic; do not mix periods).
  period_start date not null,
  period_end date not null,
  leads_count integer not null default 0 check (leads_count >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, period_start, period_end),
  check (period_end > period_start)
);
