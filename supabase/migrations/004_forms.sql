-- 004_forms.sql
-- A form is a lead-collection endpoint. The secret is stored ONLY as a
-- hash; plaintext exists solely in the create/rotate response (§18–22).

create type public.form_status as enum ('active', 'archived');

create table if not exists public.forms (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  public_id text not null unique,
  name text not null check (char_length(trim(name)) between 1 and 100),
  description text,
  status public.form_status not null default 'active',
  secret_hash text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz
);

create index if not exists forms_workspace_id_idx on public.forms (workspace_id);
create index if not exists forms_status_idx on public.forms (status);
-- unique(public_id) already indexes lookups from the public API.
