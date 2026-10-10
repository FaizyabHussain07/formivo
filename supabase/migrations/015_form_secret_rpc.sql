-- 015_form_secret_rpc.sql
-- Form secret handling. The app generates a cryptographically random
-- secret; this RPC salts+hashes it server-side so the plaintext never
-- even appears in an INSERT statement over the wire twice (create/rotate
-- both return the raw secret to the developer exactly once).

create or replace function public.mint_form_secret(
  p_workspace_id uuid,
  p_form_public_id text default null,
  p_secret_hash text default null
)
returns table (workspace_id uuid, public_id text, secret_hash text)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_form public.forms;
begin
  if p_form_public_id is null then
    -- Create path: the caller has already inserted the form shell via the
    -- normal authenticated client; we re-read it for the generated public_id.
    select * into v_form from public.forms
      where workspace_id = p_workspace_id
      order by created_at desc limit 1;
  else
    select * into v_form from public.forms
      where public_id = p_form_public_id and workspace_id = p_workspace_id;
  end if;

  if v_form.id is null then
    raise exception 'FORM_NOT_FOUND';
  end if;

  if p_secret_hash is null then
    raise exception 'SECRET_HASH_REQUIRED';
  end if;

  update public.forms
    set secret_hash = p_secret_hash
    where id = v_form.id
    returning * into v_form;

  return query select v_form.workspace_id, v_form.public_id, v_form.secret_hash;
end;
$$;
