-- 011_webhook_events.sql
-- Lemon Squeezy webhook replay protection. Operational table: no user-facing
-- RLS access; service role writes only. Duplicate (provider, event_id) rows
-- are impossible thanks to the unique constraint (§50–51).

create table if not exists public.webhook_events (
  id uuid primary key default gen_random_uuid(),
  provider text not null check (provider = 'lemonsqueezy'),
  event_id text not null,
  event_type text,
  payload_hash text,
  processed_at timestamptz,
  created_at timestamptz not null default now(),
  unique (provider, event_id)
);
