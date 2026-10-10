'use server';

import { createServerSupabaseClient } from '@/lib/db/server';
import { PLANS, DEFAULT_PLAN, type PlanId } from '@/lib/plans';
import { createHash, randomBytes } from 'crypto';

/**
 * Creates a form in the current user's workspace and returns the plaintext
 * secret exactly once (it is stored only as a SHA-256 hash).
 * Server action — authorization comes from the authenticated session + RLS.
 */
export async function createFormAction(
  name: string,
): Promise<
  | { ok: true; publicId: string; secret: string; endpoint: string }
  | { ok: false; error: string }
> {
  const trimmed = name.trim();
  if (!trimmed || trimmed.length > 100) {
    return { ok: false, error: 'Please provide a form name (max 100 characters).' };
  }

  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, error: 'You must be signed in to create a form.' };
  }

  const { data: membership } = await supabase
    .from('workspace_memberships')
    .select('workspace_id, role, workspace:workspaces(id)')
    .eq('user_id', user.id)
    .maybeSingle();

  if (!membership?.workspace) {
    return { ok: false, error: 'Create a workspace before creating forms.' };
  }

  // Form limit check (entitlement service — plans.ts is the single source).
  const { data: subscription } = await supabase
    .from('subscriptions')
    .select('plan')
    .eq('workspace_id', membership.workspace_id)
    .maybeSingle();

  const planId = (subscription?.plan as PlanId) ?? DEFAULT_PLAN;
  const limit = PLANS[planId].forms;

  const { count: formCount } = await supabase
    .from('forms')
    .select('id', { count: 'exact', head: true })
    .eq('workspace_id', membership.workspace_id);

  if (limit !== null && (formCount ?? 0) >= limit) {
    return {
      ok: false,
      error: `You've reached the ${PLANS[planId].displayName} plan limit of ${limit} form${limit === 1 ? '' : 's'}. Upgrade to create more.`,
    };
  }

  const publicId = 'frm_' + randomBytes(9).toString('hex');
  const secret = 'fmv_' + randomBytes(32).toString('hex');
  const secretHash = createHash('sha256').update(secret).digest('hex');

  const { error } = await supabase.from('forms').insert({
    workspace_id: membership.workspace_id,
    public_id: publicId,
    name: trimmed,
    secret_hash: secretHash,
  });

  if (error) {
    console.error('[form_created_failed]', { code: error.code });
    return { ok: false, error: 'Could not create the form. Please try again.' };
  }

  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '') || 'http://localhost:3000';

  console.log('[form_created]', { publicId, workspaceId: membership.workspace_id });

  return {
    ok: true,
    publicId,
    secret,
    endpoint: `${appUrl}/api/v1/forms/${publicId}/submissions`,
  };
}
