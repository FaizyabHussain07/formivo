import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/db/server';
import { LEAD_STATUSES, type LeadStatus } from '@/lib/leads';
import { z } from 'zod';

const updateLeadSchema = z.object({
  status: z.enum(LEAD_STATUSES as unknown as [string, ...string[]]),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ leadId: string }> },
) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: { code: 'UNAUTHORIZED', message: 'You must be signed in.' } }, { status: 401 });
  }

  const { leadId } = await params;

  // Resolve workspace membership
  const { data: membership } = await supabase
    .from('workspace_memberships')
    .select('workspace_id, role, workspace:workspaces(*)')
    .eq('user_id', user.id)
    .maybeSingle();

  if (!membership) {
    return NextResponse.json({ error: { code: 'FORBIDDEN', message: 'Access denied.' } }, { status: 403 });
  }

  // Verify lead belongs to user's workspace
  const { data: lead } = await supabase
    .from('leads')
    .select('id, workspace_id, form_id')
    .eq('id', leadId)
    .eq('workspace_id', membership.workspace_id)
    .single();

  if (!lead) {
    return NextResponse.json({ error: { code: 'NOT_FOUND', message: 'Lead not found.' } }, { status: 404 });
  }

  // Only workspace owners can update lead status
  if (membership.role !== 'owner') {
    return NextResponse.json(
      { error: { code: 'FORBIDDEN', message: 'Only workspace owners can update lead status.' } },
      { status: 403 },
    );
  }

  // Validate request body
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: { code: 'INVALID_REQUEST', message: 'Invalid JSON.' } },
      { status: 400 },
    );
  }

  const parsed = updateLeadSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: { code: 'INVALID_REQUEST', message: 'The status field must be a valid lead status.' } },
      { status: 400 },
    );
  }

  const newStatus = parsed.data.status as LeadStatus;

  const { error } = await supabase
    .from('leads')
    .update({ status: newStatus })
    .eq('id', leadId);

  if (error) {
    console.error('[lead_status_update_failed]', { leadId, code: error.code });
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to update lead status.' } },
      { status: 500 },
    );
  }

  return NextResponse.json({
    success: true,
    lead: { id: leadId, status: newStatus },
  });
}
