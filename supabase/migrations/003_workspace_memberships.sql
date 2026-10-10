-- 003_workspace_memberships.sql
-- Connects users to workspaces. Client membership alone never grants
-- form access — client_form_access is the form-level gate (§16–17).

do $$ begin
  create type public.workspace_member_role as enum ('owner', 'client');
exception when duplicate_object then null; end $$;

create table if not exists public.workspace_memberships (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  role public.workspace_member_role not null default 'client',
  created_at timestamptz not null default now(),
  unique (workspace_id, user_id)
);

-- Denormalized lookup used heavily by RLS helpers.
create index if not exists workspace_memberships_user_id_idx
  on public.workspace_memberships (user_id);
