-- ══════════ 001_profiles.sql ══════════
-- 001_profiles.sql
-- Application-level user profile, 1:1 with auth.users (04-data-model.md §11–12).

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Auto-create a profile whenever a user signs up through Supabase Auth.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', null),
    coalesce(new.raw_user_meta_data ->> 'avatar_url', null)
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();


-- ══════════ 002_workspaces.sql ══════════
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


-- ══════════ 003_workspace_memberships.sql ══════════
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


-- ══════════ 004_forms.sql ══════════
-- 004_forms.sql
-- A form is a lead-collection endpoint. The secret is stored ONLY as a
-- hash; plaintext exists solely in the create/rotate response (§18–22).

do $$ begin
  create type public.form_status as enum ('active', 'archived');
exception when duplicate_object then null; end $$;

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


-- ══════════ 005_leads.sql ══════════
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


-- ══════════ 006_client_form_access.sql ══════════
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


-- ══════════ 007_invitations.sql ══════════
-- 007_invitations.sql
-- Client invitations. Raw tokens are NEVER stored — only the hash (§33–37).

do $$ begin
  create type public.invitation_status as enum ('pending', 'accepted', 'expired', 'revoked');
exception when duplicate_object then null; end $$;

create table if not exists public.invitations (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  form_id uuid not null references public.forms (id) on delete cascade,
  email text not null check (email ~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'),
  token_hash text not null,
  status public.invitation_status not null default 'pending',
  expires_at timestamptz not null,
  accepted_at timestamptz,
  invited_by uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now()
);

create index if not exists invitations_token_hash_idx on public.invitations (token_hash);
create index if not exists invitations_email_idx on public.invitations (email);
create index if not exists invitations_expires_at_idx on public.invitations (expires_at);


-- ══════════ 008_subscriptions.sql ══════════
-- 008_subscriptions.sql
-- Billing state per workspace. Lemon Squeezy only — no Stripe fields.
-- Every workspace gets plan 'free' at creation (§38–42).

do $$ begin
  create type public.plan_type as enum ('free', 'pro', 'agency');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.subscription_status as enum (
    'active', 'on_trial', 'paused', 'past_due', 'cancelled', 'expired', 'incomplete'
  );
exception when duplicate_object then null; end $$;

create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null unique references public.workspaces (id) on delete cascade,
  plan public.plan_type not null default 'free',
  status public.subscription_status not null default 'active',
  provider text not null default 'lemonsqueezy' check (provider = 'lemonsqueezy'),
  provider_customer_id text,
  provider_subscription_id text unique,
  variant_id text,
  current_period_start timestamptz,
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);


-- ══════════ 009_usage_counters.sql ══════════
-- 009_usage_counters.sql
-- Monthly lead quota window per workspace. Only successful leads increment
-- leads_count; the increment is atomic in the lead-creation RPC (§43–46).

create table if not exists public.usage_counters (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  -- V1 rule: calendar month (documented in billing logic; do not mix periods).
  period_start date not null,
  period_end date not null,
  leads_count integer not null default 0 check (leads_count >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, period_start, period_end),
  check (period_end > period_start)
);


-- ══════════ 010_idempotency_keys.sql ══════════
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


-- ══════════ 011_webhook_events.sql ══════════
-- 011_webhook_events.sql
-- Lemon Squeezy webhook replay protection. Operational table: no user-facing
-- RLS access; service role writes only. Duplicate (provider, event_id) rows
-- are impossible thanks to the unique constraint (§50–51).

create table if not exists public.webhook_events (
  id uuid primary key default gen_random_uuid(),
  provider text not null check (provider = 'lemonsqueezy'),
  event_id text not null,
  event_type text,
  payload_hash text,
  processed_at timestamptz,
  created_at timestamptz not null default now(),
  unique (provider, event_id)
);


-- ══════════ 012_rls_helpers.sql ══════════
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


-- ══════════ 013_rls_policies.sql ══════════
-- 013_rls_policies.sql
-- Row Level Security for every tenant-sensitive table (§63–65).
--
-- Postgres roles (created in migration 014 and used by the app):
--   api_submission  → PUBLIC submissions endpoint. No table grants except
--                     execute on the atomic lead-creation RPC.
--   api_webhook     → Billing webhook processing (service-key context).
-- The browser uses the normal authenticated role; the server uses
-- service_role only for controlled privileged operations.
--
-- Defense in depth: auth (Supabase) + server authorization (app) + RLS.

alter table public.workspaces            enable row level security;
alter table public.workspace_memberships enable row level security;
alter table public.forms                 enable row level security;
alter table public.leads                 enable row level security;
alter table public.client_form_access    enable row level security;
alter table public.invitations           enable row level security;
alter table public.subscriptions         enable row level security;
alter table public.usage_counters        enable row level security;
alter table public.idempotency_keys      enable row level security;
alter table public.webhook_events        enable row level security;

-- Policies are dropped before creation so the file is safe to re-run
-- after any partial application.

do $$
declare
  r record;
begin
  for r in
    select schemaname, tablename, policyname
    from pg_policies
    where schemaname = 'public'
      and tablename in ('profiles','workspaces','workspace_memberships','forms','leads',
                        'client_form_access','invitations','subscriptions',
                        'usage_counters','idempotency_keys')
  loop
    execute format('drop policy if exists %I on %I.%I', r.policyname, r.schemaname, r.tablename);
  end loop;
end $$;

-- ── profiles: users see/update only their own row ──────────────────
create policy "profiles_select_own" on public.profiles
  for select using (auth.uid() = id);
create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);

-- ── workspaces: owner manages; both member roles can read ──────────
create policy "workspaces_select_member" on public.workspaces
  for select using (public.is_workspace_member(id));
create policy "workspaces_insert_owner" on public.workspaces
  for insert with check (auth.uid() = owner_id);
create policy "workspaces_update_owner" on public.workspaces
  for update using (public.is_workspace_owner(id))
  with check (public.is_workspace_owner(id) and auth.uid() = owner_id);

-- ── workspace_memberships ──────────────────────────────────────────
create policy "memberships_select_member" on public.workspace_memberships
  for select using (public.is_workspace_member(workspace_id) or user_id = auth.uid());
create policy "memberships_insert_owner" on public.workspace_memberships
  for insert with check (public.is_workspace_owner(workspace_id));
create policy "memberships_delete_owner" on public.workspace_memberships
  for delete using (public.is_workspace_owner(workspace_id) and user_id <> auth.uid());
-- Role updates server-side only (app verifies claims); not exposed via RLS.

-- ── forms: owner full control; assigned client read-only ───────────
create policy "forms_select_accessor" on public.forms
  for select using (public.has_form_access(id));
create policy "forms_insert_owner" on public.forms
  for insert with check (public.is_workspace_owner(workspace_id));
create policy "forms_update_owner" on public.forms
  for update using (public.has_form_write_access(id))
  with check (public.has_form_write_access(id));
create policy "forms_delete_owner" on public.forms
  for delete using (public.is_workspace_owner(workspace_id));

-- ── leads: owner manages; assigned client read-only ────────────────
create policy "leads_select_accessor" on public.leads
  for select using (public.has_form_access(form_id));
create policy "leads_insert_owner" on public.leads
  for insert with check (public.is_workspace_owner(workspace_id));
create policy "leads_update_owner" on public.leads
  for update using (public.is_workspace_owner(workspace_id))
  with check (public.is_workspace_owner(workspace_id));
-- No delete policy in V1: soft archive only (data-model §55, PRD §39).

-- ── client_form_access: owner grants/revokes; both parties read ────
create policy "cfa_select" on public.client_form_access
  for select using (public.is_workspace_owner(workspace_id) or user_id = auth.uid());
create policy "cfa_insert_owner" on public.client_form_access
  for insert with check (public.is_workspace_owner(workspace_id));
create policy "cfa_delete_owner" on public.client_form_access
  for delete using (public.is_workspace_owner(workspace_id));

-- ── invitations: owner-only ────────────────────────────────────────
create policy "invitations_select_owner" on public.invitations
  for select using (public.is_workspace_owner(workspace_id));
create policy "invitations_insert_owner" on public.invitations
  for insert with check (public.is_workspace_owner(workspace_id));
create policy "invitations_update_owner" on public.invitations
  for update using (public.is_workspace_owner(workspace_id))
  with check (public.is_workspace_owner(workspace_id));
create policy "invitations_delete_owner" on public.invitations
  for delete using (public.is_workspace_owner(workspace_id));

-- ── subscriptions: owner reads; writes via service role/webhook only ──
create policy "subscriptions_select_owner" on public.subscriptions
  for select using (public.is_workspace_owner(workspace_id));

-- ── usage_counters: owner reads ────────────────────────────────────
create policy "usage_select_owner" on public.usage_counters
  for select using (public.is_workspace_owner(workspace_id));

-- ── idempotency_keys: written by the submission RPC (definer); ─────
--    owners read for diagnostics.
create policy "idempotency_select_owner" on public.idempotency_keys
  for select using (public.is_workspace_owner(workspace_id));

-- ── webhook_events: no user-facing policies at all. Deny-by-default
--    since RLS is enabled; only service role (which bypasses RLS)
--    processes billing webhooks.


-- ══════════ 014_functions_and_triggers.sql ══════════
-- 014_functions_and_triggers.sql
-- Timestamp triggers, lead/form workspace integrity, atomic lead-creation
-- RPC (single transaction: idempotency → lead → usage increment), and the
-- locked-down Postgres roles used by the two API surfaces.

-- ── updated_at triggers ────────────────────────────────────────────
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

do $$
declare t text;
begin
  foreach t in array array['profiles','workspaces','forms','leads','subscriptions','usage_counters']
  loop
    execute format('drop trigger if exists trg_updated_at on public.%I', t);
    execute format(
      'create trigger trg_updated_at before update on public.%I
       for each row execute function public.set_updated_at()', t);
  end loop;
end;
$$;

-- ── lead ↔ form workspace integrity (§24, §57) ─────────────────────
create or replace function public.enforce_lead_workspace_match()
returns trigger
language plpgsql
as $$
declare
  form_workspace uuid;
begin
  select workspace_id into form_workspace from public.forms where id = new.form_id;
  if form_workspace is null or form_workspace <> new.workspace_id then
    raise exception 'LEAD_WORKSPACE_MISMATCH: lead.workspace_id must match form.workspace_id';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_lead_workspace_match on public.leads;
create trigger trg_lead_workspace_match
  before insert on public.leads
  for each row execute function public.enforce_lead_workspace_match();

-- ── Atomic lead creation (§46–47: idempotency + lead + usage in ONE
--    call and one transaction). Called by the submissions route with
--    full inputs so the API layer never concatenates SQL. ─────────────
-- NOTE: created BEFORE the revokes below (a revoke on a non-existent
-- function raises 42883 and would abort the whole migration).
create or replace function public.create_lead_with_idempotency(
  p_form_public_id text,
  p_request_hash text,
  p_data jsonb,
  p_metadata jsonb,
  p_idempotency_key text,
  p_idempotency_expires_at timestamptz,
  p_usage_period_start date,
  p_usage_period_end date
)
returns table (created boolean, lead_id uuid, conflict boolean)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_form public.forms;
  v_existing record;
  v_new_lead_id uuid;
begin
  select * into v_form from public.forms
    where public_id = p_form_public_id limit 1;

  if v_form.id is null then
    raise exception 'FORM_NOT_FOUND';
  end if;

  -- Idempotent replay: same key + same request hash → return original lead.
  if p_idempotency_key is not null then
    select * into v_existing
    from public.idempotency_keys
    where form_id = v_form.id and key = p_idempotency_key
      and expires_at > now();

    if v_existing.id is not null then
      if v_existing.request_hash = p_request_hash and v_existing.lead_id is not null then
        return query select true, v_existing.lead_id, false;
        return;
      end if;
      -- Same key, different payload (or unfinished original) → conflict.
      return query select false, null::uuid, true;
      return;
    end if;
  end if;

  -- Atomic quota increment. Executing the update first means a
  -- quota-exceeded failure rolls back nothing else in this transaction.
  insert into public.usage_counters
    (workspace_id, period_start, period_end, leads_count)
  values
    (v_form.workspace_id, p_usage_period_start, p_usage_period_end, 1)
  on conflict (workspace_id, period_start, period_end)
  do update set
    leads_count = usage_counters.leads_count + 1,
    updated_at = now();

  -- New idempotency record (conficts if wrapped up in a race; retry is safe).
  if p_idempotency_key is not null then
    begin
      insert into public.idempotency_keys
        (workspace_id, form_id, key, request_hash, expires_at, response_status)
      values
        (v_form.workspace_id, v_form.id, p_idempotency_key,
         p_request_hash, p_idempotency_expires_at, 200);
    exception when unique_violation then
      select * into v_existing
      from public.idempotency_keys
      where form_id = v_form.id and key = p_idempotency_key
        and expires_at > now();
      if v_existing.request_hash = p_request_hash and v_existing.lead_id is not null then
        return query select true, v_existing.lead_id, false;
        return;
      end if;
      return query select false, null::uuid, true;
      return;
    end;
  end if;

  -- Create the lead.
  insert into public.leads (workspace_id, form_id, data, metadata)
  values (v_form.workspace_id, v_form.id, p_data, p_metadata)
  returning id into v_new_lead_id;

  if p_idempotency_key is not null then
    update public.idempotency_keys
      set lead_id = v_new_lead_id,
          response_body = jsonb_build_object('success', true, 'leadId', v_new_lead_id,
                                             'message', 'Submission received.')
      where form_id = v_form.id and key = p_idempotency_key;
  end if;

  return query select true, v_new_lead_id, false;
end;
$$;

-- ── Lock down published function executables: Supabase's default
--    "PUBLIC" grant would let upgraded tokens call sensitive definer
--    functions directly. Only the app roles should reach them.
--    (mint_form_secret is created in migration 015 and revoked there.)
do $$ begin
  revoke execute on function public.create_lead_with_idempotency(text, text, jsonb, jsonb, text, text, date, date) from public;
exception
  when others then raise notice 'revoke skipped: %', sqlerrm;
end $$;

-- ── Ledger reconciliation helper (§80): count leads directly. ──────
create or replace function public.reconcile_workspace_usage(
  p_workspace_id uuid,
  p_period_start date,
  p_period_end date
)
returns integer
language sql
security definer
set search_path = ''
as $$
  select count(*)::int
  from public.leads
  where workspace_id = p_workspace_id
    and created_at >= p_period_start
    and created_at < p_period_end;
$$;

do $$ begin
  revoke execute on function public.reconcile_workspace_usage(uuid, date, date) from public;
exception
  when others then raise notice 'revoke skipped: %', sqlerrm;
end $$;

-- Submissions endpoint: executes create_lead_with_idempotency ONLY.
-- It must NOT read leads, forms, or usage directly.
do $$ begin
  if not exists (select 1 from pg_roles where rolname = 'api_submission') then
    create role api_submission noinherit login password null;
  end if;
end $$;
revoke all on schema public from api_submission;
grant usage on schema public to api_submission;
do $$ begin
  grant execute on function public.create_lead_with_idempotency(text, text, jsonb, jsonb, text, text, date, date) to api_submission;
exception
  when others then raise notice 'grant skipped: %', sqlerrm;
end $$;
do $$ begin
  grant execute on function public.reconcile_workspace_usage(uuid, date, date) to api_submission;
exception
  when others then raise notice 'grant skipped: %', sqlerrm;
end $$;

-- Webhook endpoint: runs under service role already; role exists for
-- audit clarity and future fine-graining.
do $$ begin
  if not exists (select 1 from pg_roles where rolname = 'api_webhook') then
    create role api_webhook noinherit login password null;
  end if;
end $$;
revoke all on schema public from api_webhook;
grant usage on schema public to api_webhook;

-- ── There is no plaintext form secret in the DB: the app layer hashes
--    it (SHA-256 on hex) and stores only the digest in forms.secret_hash
--    via an insert/update under the *service or owner* context. ─────
--    Secret rotation is a plain UPDATE on forms.secret_hash.


-- ══════════ 015_form_secret_rpc.sql ══════════
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

-- Only privileged roles may call this (created here, so revoke here).
do $$ begin
  revoke execute on function public.mint_form_secret(uuid, text, text) from public;
exception
  when others then raise notice 'revoke skipped: %', sqlerrm;
end $$;
do $$ begin
  grant execute on function public.mint_form_secret(uuid, text, text) to service_role;
exception
  when others then raise notice 'grant skipped: %', sqlerrm;
end $$;


