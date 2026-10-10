-- 005_leads.sql
-- Every valid submission becomes a lead. data/metadata are flexible JSONB;
-- ownership is explicit on BOTH workspace_id and form_id and integrity is
-- enforced by a trigger (§23–29, §57).

do $$ begin
  create type public.lead_status as enum ('new', 'contacted', 'qualified', 'converted', 'archived');
exception when duplicate_object then null; end $$;

create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  form_id uuid not null references public.forms (id) on delete cascade,
  data jsonb not null,
  metadata jsonb,
  status public.lead_status not null default 'new',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz
);

create index if not exists leads_workspace_id_idx on public.leads (workspace_id);
create index if not exists leads_form_id_idx on public.leads (form_id);
create index if not exists leads_created_at_idx on public.leads (created_at desc);
create index if not exists leads_form_created_idx on public.leads (form_id, created_at desc);
create index if not exists leads_workspace_created_idx on public.leads (workspace_id, created_at desc);
