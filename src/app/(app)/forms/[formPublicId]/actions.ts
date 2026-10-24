'use server';

import { createServerSupabaseClient } from '@/lib/db/server';
import { createHash, randomBytes } from 'crypto';

type RotateResult =
  | { ok: true; secret: string }
  | { ok: false; error: string };

export async function rotateFormSecretAction(
  formPublicId: string,
): Promise<RotateResult> {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, error: 'You must be signed in.' };
  }

  // Verify ownership via workspace membership
  const { data: membership } = await supabase
    .from('workspace_memberships')
    .select('workspace_id, role')
    .eq('user_id', user.id)
    .maybeSingle();

  if (!membership || membership.role !== 'owner') {
    return { ok: false, error: 'Only the workspace owner can rotate secrets.' };
  }

  // Find the form and verify it belongs to this workspace
  const { data: form } = await supabase
    .from('forms')
    .select('id, workspace_id')
    .eq('public_id', formPublicId)
    .maybeSingle();

  if (!form) {
    return { ok: false, error: 'Form not found.' };
  }

  if (form.workspace_id !== membership.workspace_id) {
    return { ok: false, error: 'You do not have access to this form.' };
  }

  // Generate new secret
  const newSecret = 'fmv_' + randomBytes(32).toString('hex');
  const newSecretHash = createHash('sha256').update(newSecret).digest('hex');

  // Update the form's secret hash
  const { error } = await supabase
    .from('forms')
    .update({ secret_hash: newSecretHash })
    .eq('id', form.id);

  if (error) {
    console.error('[secret_rotation_failed]', { formPublicId, code: error.code });
    return { ok: false, error: 'Could not rotate the secret. Please try again.' };
  }

  console.log('[secret_rotated]', { formPublicId, userId: user.id });

  return { ok: true, secret: newSecret };
}
