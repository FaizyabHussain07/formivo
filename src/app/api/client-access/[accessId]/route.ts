import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/db/server';

/**
 * Revoke one client's access to one form.
 *
 * Deleting the row is enough: every read policy gates on
 * `has_form_access(form_id)`, so the client loses authorization immediately,
 * while their account and any other shared forms stay intact.
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ accessId: string }> },
) {
  const { accessId } = await params;

  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json(
      { error: { code: 'UNAUTHORIZED', message: 'You must be signed in.' } },
      { status: 401 },
    );
  }

  if (!/^[0-9a-f-]{36}$/i.test(accessId)) {
    return NextResponse.json(
      { error: { code: 'INVALID_REQUEST', message: 'Invalid access id.' } },
      { status: 400 },
    );
  }

  const { data: access } = await supabase
    .from('client_form_access')
    .select('id, workspace_id, form_id, user_id')
    .eq('id', accessId)
    .maybeSingle();

  if (!access) {
    return NextResponse.json(
      { error: { code: 'NOT_FOUND', message: 'Access not found.' } },
      { status: 404 },
    );
  }

  const { data: membership } = await supabase
    .from('workspace_memberships')
    .select('role')
    .eq('workspace_id', access.workspace_id)
    .eq('user_id', user.id)
    .maybeSingle();

  if (!membership || membership.role !== 'owner') {
    return NextResponse.json(
      { error: { code: 'FORBIDDEN', message: 'Only workspace owners can revoke client access.' } },
      { status: 403 },
    );
  }

  const { error } = await supabase
    .from('client_form_access')
    .delete()
    .eq('id', access.id);

  if (error) {
    console.error('[client_access_revoke_failed]', { accessId: access.id, code: error.code });
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Could not revoke access.' } },
      { status: 500 },
    );
  }

  return NextResponse.json({ success: true });
}