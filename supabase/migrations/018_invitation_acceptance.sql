-- 018_invitation_acceptance.sql
--
-- Invitation acceptance is the single operation where a non-owner must read an
-- invitation row and create access records, while every other invitations /
-- client_form_access policy stays owner-only (013_rls_policies.sql).
--
-- Instead of widening RLS, both operations are exposed as SECURITY DEFINER
-- functions that re-validate every condition inside one transaction:
--   * get_invitation_by_token  — read-only preview of a token-matched invitation
--   * accept_invitation        — atomic accept with row locking
--
-- The application hashes the raw token (sha256 hex) before calling, so the raw
-- token never reaches the database.

alter table public.invitations
  add column if not exists accepted_by uuid;

-- ── Preview: who may look up an invitation by token hash? ───────────
-- Anyone holding the link (anon or authenticated). The token hash is the
-- secret: without it the function returns no rows, so nothing is enumerable.
create or replace function public.get_invitation_by_token(p_token_hash text)
returns table (
  form_id uuid,
  workspace_id uuid,
  invited_email text,
  status public.invitation_status,
  expires_at timestamptz,
  form_name text
)
language sql
security definer
set search_path = public, pg_temp
as $$
  select i.form_id,
         i.workspace_id,
         i.email,
         i.status,
         i.expires_at,
         f.name
    from public.invitations i
    join public.forms f on f.id = i.form_id
   where i.token_hash = p_token_hash
   limit 1;
$$;

revoke all on function public.get_invitation_by_token(text) from public;
grant execute on function public.get_invitation_by_token(text) to anon, authenticated, service_role;

-- ── Accept: explicit user action only, never on link open ───────────
-- Returns the form/workspace so the caller can redirect to the client portal.
-- Raises with a stable SQLSTATE message the API maps to a user-facing error.
create or replace function public.accept_invitation(p_token_hash text)
returns table (form_id uuid, workspace_id uuid, form_name text)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid uuid := auth.uid();
  v_email text;
  v_inv public.invitations%rowtype;
begin
  if v_uid is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;

  -- Identity comes from the verified session, never from the request body.
  select lower(u.email) into v_email
    from auth.users u
   where u.id = v_uid;

  if v_email is null then
    raise exception 'email_unverified' using errcode = '28000';
  end if;

  select * into v_inv
    from public.invitations
   where token_hash = p_token_hash
   order by created_at desc
   limit 1
      for update;

  if not found then
    raise exception 'invitation_not_found' using errcode = 'P0002';
  end if;

  if v_inv.status = 'revoked' then
    raise exception 'invitation_revoked' using errcode = '28000';
  end if;

  if v_inv.status = 'expired' or v_inv.expires_at <= now() then
    raise exception 'invitation_expired' using errcode = '28000';
  end if;

  if v_inv.status = 'accepted' then
    -- Retries by the same user are idempotent; anyone else is a conflict.
    if v_inv.accepted_by is not null and v_inv.accepted_by = v_uid then
      return query
        select v_inv.form_id, v_inv.workspace_id, f.name
          from public.forms f where f.id = v_inv.form_id;
      return;
    end if;
    raise exception 'invitation_already_accepted' using errcode = '23505';
  end if;

  if lower(v_inv.email) <> v_email then
    raise exception 'email_mismatch' using errcode = '28000';
  end if;

  insert into public.workspace_memberships (workspace_id, user_id, role)
  values (v_inv.workspace_id, v_uid, 'client')
  on conflict (workspace_id, user_id) do nothing;

  insert into public.client_form_access (workspace_id, form_id, user_id)
  values (v_inv.workspace_id, v_inv.form_id, v_uid)
  on conflict (form_id, user_id) do nothing;

  update public.invitations
     set status = 'accepted',
         accepted_at = now(),
         accepted_by = v_uid
   where id = v_inv.id;

  return query
    select v_inv.form_id, v_inv.workspace_id, f.name
      from public.forms f where f.id = v_inv.form_id;
end;
$$;

revoke all on function public.accept_invitation(text) from public;
revoke all on function public.accept_invitation(text) from anon;
grant execute on function public.accept_invitation(text) to authenticated, service_role;

-- ── Owner view of who has access ─────────────────────────────────────
-- profiles is row-level restricted to its own owner, and email lives in
-- auth.users (profiles has no email column). SECURITY DEFINER lets the owner
-- look up the invited address server-side while RLS stays closed.
create or replace function public.list_form_client_access(p_form_id uuid)
returns table (
  access_id uuid,
  user_id uuid,
  email text,
  full_name text,
  granted_at timestamptz
)
language sql
security definer
set search_path = public, pg_temp
as $$
  select c.id, c.user_id, u.email, p.full_name, c.created_at
    from public.client_form_access c
    join public.profiles p on p.id = c.user_id
    join auth.users u on u.id = c.user_id
   where c.form_id = p_form_id
     and public.is_workspace_owner(c.workspace_id)
   order by c.created_at desc;
$$;

revoke all on function public.list_form_client_access(uuid) from public;
revoke all on function public.list_form_client_access(uuid) from anon;
grant execute on function public.list_form_client_access(uuid) to authenticated, service_role;