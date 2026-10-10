-- 006_client_form_access.sql
-- Explicit form-level access for client viewers. Never rely on workspace
-- membership alone for client permissions (§30–32).

create table if not exists public.client_form_access (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  form_id uuid not null references public.forms (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (form_id, user_id)
);

create index if not exists client_form_access_user_id_idx on public.client_form_access (user_id);
create index if not exists client_form_access_form_id_idx on public.client_form_access (form_id);
