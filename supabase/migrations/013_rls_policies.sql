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
