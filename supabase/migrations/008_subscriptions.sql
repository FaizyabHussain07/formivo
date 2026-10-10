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
