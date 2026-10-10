-- 012_rls_helpers.sql
-- Reusable authorization helpers used by RLS policies (04-data-model.md §63–66).
--
-- SECURITY DEFINER + fixed search_path: policies run as the querying user,
-- so these functions need definer rights to read membership/access tables.
-- They return boolean only and never leak row data.
--
-- Access model:
--   is_workspace_member  → owner OR client (baseline workspace relationship)
--   is_workspace_owner   → owner role only (developer permissions)
--   has_form_access      → owner of the form's workspace OR explicitly
--                          assigned client viewer
--   has_form_write_access→ owner only (status changes, config, secrets)

create or replace function public.is_workspace_member(p_workspace_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.workspace_memberships m
    where m.workspace_id = p_workspace_id
      and m.user_id = auth.uid()
  );
$$;

create or replace function public.is_workspace_owner(p_workspace_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.workspace_memberships m
    where m.workspace_id = p_workspace_id
      and m.user_id = auth.uid()
      and m.role = 'owner'
  );
$$;

create or replace function public.has_form_access(p_form_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.forms f
    where f.id = p_form_id
      and (
        -- Workspace owner/developer
        exists (
          select 1
          from public.workspace_memberships m
          where m.workspace_id = f.workspace_id
            and m.user_id = auth.uid()
            and m.role = 'owner'
        )
        -- Explicitly assigned client viewer
        or exists (
          select 1
          from public.client_form_access c
          where c.form_id = f.id
            and c.user_id = auth.uid()
        )
      )
  );
$$;

create or replace function public.has_form_write_access(p_form_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.forms f
    where f.id = p_form_id
      and exists (
        select 1
        from public.workspace_memberships m
        where m.workspace_id = f.workspace_id
          and m.user_id = auth.uid()
          and m.role = 'owner'
      )
  );
$$;

grant execute on function public.is_workspace_member(uuid) to authenticated, service_role;
grant execute on function public.is_workspace_owner(uuid) to authenticated, service_role;
grant execute on function public.has_form_access(uuid) to authenticated, service_role;
grant execute on function public.has_form_write_access(uuid) to authenticated, service_role;
