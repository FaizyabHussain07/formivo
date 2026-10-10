-- 010_idempotency_keys.sql
-- Duplicate-submission protection. Scope: (form_id, key). Same key + same
-- request hash replays the stored response; same key + different hash is a
-- conflict. Records expire after 24h (§47–49).

create table if not exists public.idempotency_keys (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  form_id uuid not null references public.forms (id) on delete cascade,
  key text not null check (char_length(key) between 8 and 255),
  request_hash text not null,
  response_status integer,
  response_body jsonb,
  lead_id uuid references public.leads (id) on delete set null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  unique (form_id, key)
);

create index if not exists idempotency_keys_expires_at_idx on public.idempotency_keys (expires_at);
