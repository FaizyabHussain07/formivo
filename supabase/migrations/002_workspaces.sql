-- 002_workspaces.sql
-- Workspaces are the primary tenant boundary (04-data-model.md §13–15).
-- One owner per workspace in V1; membership rows carry the role.

create table if not exists public.workspaces (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(trim(name)) between 1 and 100),
  slug text unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)?$'),
  owner_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
