/**
 * Server-only submission helpers shared by the public form endpoints.
 *
 * Nothing in this module may be imported from a client component: it reads
 * SUPABASE_SERVICE_ROLE_KEY. Authorization never comes from the request body —
 * the workspace association is always derived from the verified form record.
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { createHash } from 'crypto';
import { DEFAULT_PLAN, PLANS, type PlanId } from '@/lib/plans';

export type SubmissionErrorCode =
  | 'INVALID_REQUEST'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'FORM_INACTIVE'
  | 'PAYLOAD_TOO_LARGE'
  | 'RATE_LIMITED'
  | 'QUOTA_EXCEEDED'
  | 'INTERNAL_ERROR';

export const SUBMISSION_ERROR_STATUS: Record<SubmissionErrorCode, number> = {
  INVALID_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  FORM_INACTIVE: 409,
  PAYLOAD_TOO_LARGE: 413,
  RATE_LIMITED: 429,
  QUOTA_EXCEEDED: 402,
  INTERNAL_ERROR: 500,
};

export class SubmissionError extends Error {
  readonly code: SubmissionErrorCode;
  readonly status: number;
  constructor(code: SubmissionErrorCode, message: string) {
    super(message);
    this.name = 'SubmissionError';
    this.code = code;
    this.status = SUBMISSION_ERROR_STATUS[code];
  }
}

/** Service-role client. Server-only — bypasses RLS by design. */
export function submissionServiceClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export interface ResolvedForm {
  id: string;
  workspace_id: string;
  status: string;
}

/**
 * Resolve a form by its public ID and confirm it still accepts submissions.
 * The form record — never client input — decides workspace association.
 */
export async function resolveActiveForm(
  db: SupabaseClient,
  formPublicId: string,
): Promise<ResolvedForm> {
  const { data, error } = await db
    .from('forms')
    .select('id, workspace_id, status')
    .eq('public_id', formPublicId)
    .maybeSingle();

  if (error) {
    console.error('[submission_form_lookup_failed]', { formPublicId, code: error.code });
    throw new SubmissionError('INTERNAL_ERROR', 'Something went wrong. Please try again.');
  }
  if (!data) {
    throw new SubmissionError('NOT_FOUND', 'No form exists for this endpoint.');
  }
  if (data.status !== 'active') {
    throw new SubmissionError('FORM_INACTIVE', 'This form is archived and no longer accepts submissions.');
  }
  return data as ResolvedForm;
}

/** Calendar-month usage window in UTC (data-model §44). */
export function currentPeriod(): { start: string; end: string } {
  const now = new Date();
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
  return { start: start.toISOString().slice(0, 10), end: end.toISOString().slice(0, 10) };
}

export async function planForWorkspace(
  db: SupabaseClient,
  workspaceId: string,
): Promise<PlanId> {
  const { data } = await db
    .from('subscriptions')
    .select('plan')
    .eq('workspace_id', workspaceId)
    .maybeSingle();
  return (data?.plan as PlanId) ?? DEFAULT_PLAN;
}

/**
 * Fast pre-check against the plan's monthly lead limit. The authoritative
 * enforcement still happens inside the atomic RPC.
 */
export async function isQuotaExceeded(
  db: SupabaseClient,
  workspaceId: string,
  planId: PlanId,
): Promise<boolean> {
  const maxLeads = PLANS[planId].monthlyLeads;
  if (maxLeads === null) return false;

  const period = currentPeriod();
  const { data } = await db
    .from('usage_counters')
    .select('leads_count')
    .eq('workspace_id', workspaceId)
    .eq('period_start', period.start)
    .eq('period_end', period.end)
    .maybeSingle();

  return (data?.leads_count ?? 0) >= maxLeads;
}

export interface CreateLeadInput {
  formPublicId: string;
  data: Record<string, unknown>;
  metadata?: Record<string, unknown> | null;
  /** Raw body hash used for idempotent retries. */
  requestHash: string;
  /** Set only when the caller supplied a valid Idempotency-Key. */
  idempotencyKey?: string | null;
}

/**
 * Atomic create: idempotency + quota + lead in one transaction.
 * Falls back to the pre-migration 8-arg signature when needed.
 */
export async function createLead(
  db: SupabaseClient,
  input: CreateLeadInput,
): Promise<{ leadId: string; duplicate: boolean }> {
  const period = currentPeriod();
  const form = await resolveActiveForm(db, input.formPublicId);
  const planId = await planForWorkspace(db, form.workspace_id);

  if (await isQuotaExceeded(db, form.workspace_id, planId)) {
    throw new SubmissionError('QUOTA_EXCEEDED', 'Monthly lead limit reached.');
  }

  const maxLeads = PLANS[planId].monthlyLeads;
  const expiresAt = new Date(Date.now() + 24 * 3600_000).toISOString();

  const rpcArgs = {
    p_form_public_id: input.formPublicId,
    p_request_hash: input.requestHash,
    p_data: input.data,
    p_metadata: input.metadata ?? null,
    p_idempotency_key: input.idempotencyKey ?? null,
    p_idempotency_expires_at: expiresAt,
    p_usage_period_start: period.start,
    p_usage_period_end: period.end,
    p_max_leads: maxLeads,
  };

  let { data: rpcData, error: rpcError } = await db.rpc('create_lead_with_idempotency', rpcArgs);

  // Migration 017 added p_max_leads; accept the legacy 8-arg signature too.
  if (
    rpcError &&
    (rpcError.code === 'PGRST202' ||
      rpcError.code === '42883' ||
      /could not find the function|does not exist|not find function/i.test(rpcError.message ?? ''))
  ) {
    const { p_max_leads: _drop, ...legacyArgs } = rpcArgs;
    const legacy = await db.rpc('create_lead_with_idempotency', legacyArgs);
    rpcData = legacy.data;
    rpcError = legacy.error;
  }

  if (rpcError) {
    const msg = rpcError.message ?? '';
    if (msg.includes('QUOTA_EXCEEDED')) {
      throw new SubmissionError('QUOTA_EXCEEDED', 'Monthly lead limit reached.');
    }
    if (msg.includes('FORM_NOT_FOUND')) {
      throw new SubmissionError('NOT_FOUND', 'No form exists for this endpoint.');
    }
    console.error('[submission_failed]', { formPublicId: input.formPublicId, code: rpcError.code });
    throw new SubmissionError('INTERNAL_ERROR', 'Something went wrong. Please try again.');
  }

  const result = Array.isArray(rpcData) ? rpcData[0] : rpcData;
  if (!result?.lead_id) {
    console.error('[submission_no_result]', { formPublicId: input.formPublicId });
    throw new SubmissionError('INTERNAL_ERROR', 'Something went wrong. Please try again.');
  }

  return { leadId: result.lead_id, duplicate: Boolean(result.conflict) };
}

/** SHA-256 hex of a string — used for request hashes and secrets. */
export function sha256(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}