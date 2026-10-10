-- 016_owner_membership_trigger.sql
-- Fixes the membership chicken-and-egg deadlock:
--   workspaces SELECT policy requires a membership row,
--   membership INSERT policy requires an existing owner membership.
-- Solution: every new workspace AUTOMATICALLY receives its owner
-- membership row in the same statement (definer trigger). The app
-- layer can then never forget it, and insert-with-returning works.

create or replace function public.create_owner_membership()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.workspace_memberships (workspace_id, user_id, role)
  values (new.id, new.owner_id, 'owner')
  on conflict (workspace_id, user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists trg_workspace_owner_membership on public.workspaces;
create trigger trg_workspace_owner_membership
  after insert on public.workspaces
  for each row execute function public.create_owner_membership();

-- Backfill safety: any workspace created before this trigger without an
-- owner membership gets one now.
insert into public.workspace_memberships (workspace_id, user_id, role)
select w.id, w.owner_id, 'owner'
from public.workspaces w
where not exists (
  select 1 from public.workspace_memberships m
  where m.workspace_id = w.id and m.user_id = w.owner_id
)
on conflict (workspace_id, user_id) do nothing;

grant execute on function public.create_owner_membership() to authenticated, service_role;
