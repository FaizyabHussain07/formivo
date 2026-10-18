import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/db/server';
import { createHash, randomBytes } from 'crypto';
import { z } from 'zod';

const createInvitationSchema = z.object({
  formPublicId: z.string().min(1),
  email: z.string().email(),
});

export async function POST(request: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json(
      { error: { code: 'UNAUTHORIZED', message: 'You must be signed in.' } },
      { status: 401 },
    );
  }

  // Verify workspace owner
  const { data: membership } = await supabase
    .from('workspace_memberships')
    .select('workspace_id, role')
    .eq('user_id', user.id)
    .maybeSingle();

  if (!membership || membership.role !== 'owner') {
    return NextResponse.json(
      { error: { code: 'FORBIDDEN', message: 'Only workspace owners can invite clients.' } },
      { status: 403 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: { code: 'INVALID_REQUEST', message: 'Invalid JSON.' } },
      { status: 400 },
    );
  }

  const parsed = createInvitationSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: { code: 'INVALID_REQUEST', message: 'Invalid request. Provide formPublicId and email.' } },
      { status: 400 },
    );
  }

  const { formPublicId, email } = parsed.data;

  // Find the form
  const { data: form } = await supabase
    .from('forms')
    .select('id, workspace_id, name')
    .eq('public_id', formPublicId)
    .single();

  if (!form) {
    return NextResponse.json(
      { error: { code: 'NOT_FOUND', message: 'Form not found.' } },
      { status: 404 },
    );
  }

  if (form.workspace_id !== membership.workspace_id) {
    return NextResponse.json(
      { error: { code: 'FORBIDDEN', message: 'That form belongs to a different workspace.' } },
      { status: 403 },
    );
  }

  // Check if user already has access to this form
  const { data: existingAccess } = await supabase
    .from('client_form_access')
    .select('id')
    .eq('user_id', user.id) // placeholder — we need to find the profile by email
    .eq('form_id', form.id)
    .single();

  if (existingAccess) {
    return NextResponse.json(
      { error: { code: 'CONFLICT', message: 'This user already has access to this form.' } },
      { status: 409 },
    );
  }

  // Generate invitation token
  const rawToken = 'inv_' + randomBytes(32).toString('hex');
  const tokenHash = createHash('sha256').update(rawToken).digest('hex');
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(); // 7 days

  // Check for existing pending invitation to same email+form
  const { data: existingInvitation } = await supabase
    .from('invitations')
    .select('id, status')
    .eq('workspace_id', form.workspace_id)
    .eq('form_id', form.id)
    .eq('email', email.toLowerCase())
    .eq('status', 'pending')
    .single();

  if (existingInvitation) {
    return NextResponse.json(
      { error: { code: 'CONFLICT', message: 'A pending invitation already exists for this email and form.' } },
      { status: 409 },
    );
  }

  // Create the invitation
  const { data: invitation, error: inviteError } = await supabase
    .from('invitations')
    .insert({
      workspace_id: form.workspace_id,
      form_id: form.id,
      email: email.toLowerCase(),
      token_hash: tokenHash,
      expires_at: expiresAt,
      invited_by: profile.id,
    })
    .select()
    .single();

  if (inviteError) {
    console.error('[invitation_create_failed]', { formPublicId, email, code: inviteError.code });
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Could not create invitation.' } },
      { status: 500 },
    );
  }

  // Generate the invitation URL
  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '') || 'http://localhost:3000';
  const inviteUrl = `${appUrl}/invite/${rawToken}`;

  // Send invitation email via Resend
  const resendKey = process.env.RESEND_API_KEY;
  if (resendKey) {
    try {
      const emailBody = `
        <html>
          <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 0; background-color: #f5f5f5;">
            <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 40px 0;">
              <tr>
                <td align="center">
                  <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
                    <tr>
                      <td style="padding: 32px 40px; background-color: #2DD4BF; text-align: center;">
                        <h1 style="color: #0B0D10; font-size: 24px; font-weight: 700; margin: 0;">You're invited to Formivo</h1>
                      </td>
                    </tr>
                    <tr>
                      <td style="padding: 32px 40px; color: #18181b; font-size: 15px; line-height: 1.6;">
                        <p style="margin: 0 0 16px;">
                          <strong>${form.name}</strong> in <strong>${membership.workspace?.name || 'your workspace'}</strong> has invited you to view their leads dashboard.
                        </p>
                        <p style="margin: 0 0 24px;">
                          You'll be able to view leads and basic analytics for this form — without seeing any technical configuration or billing information.
                        </p>
                        <table cellpadding="0" cellspacing="0" style="margin: 32px 0;">
                          <tr>
                            <td style="background-color: #2DD4BF; border-radius: 6px;">
                              <a href="${inviteUrl}" style="display: inline-block; padding: 12px 24px; color: #0B0D10; font-size: 15px; font-weight: 600; text-decoration: none; text-align: center;">
                                Accept Invitation
                              </a>
                            </td>
                          </tr>
                        </table>
                        <p style="margin: 0 0 16px; color: #52525b; font-size: 13px;">
                          This invitation expires in 7 days.
                        </p>
                        <p style="margin: 0; color: #a1a1aa; font-size: 12px;">
                          If you weren't expecting this invitation, you can safely ignore this email.
                        </p>
                      </td>
                    </tr>
                    <tr>
                      <td style="padding: 20px 40px; background-color: #fafafa; border-top: 1px solid #e4e4e7; text-align: center; color: #a1a1aa; font-size: 12px;">
                        © ${new Date().getFullYear()} Formivo
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
          </body>
        </html>
      `;

      const emailRes = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${resendKey}`,
        },
        body: JSON.stringify({
          from: process.env.RESEND_FROM_EMAIL || 'Formivo <onboarding@resend.dev>',
          to: [email],
          subject: `You're invited to view leads in Formivo`,
          html: emailBody,
        }),
      });

      if (!emailRes.ok) {
        console.error('[invitation_email_failed]', { email, status: emailRes.status });
        // Don't fail the invitation creation if email fails — the invite URL still works
      }
    } catch (err) {
      console.error('[invitation_email_error]', { email, err: String(err) });
    }
  }

  return NextResponse.json({
    success: true,
    invitation: {
      id: invitation.id,
      email: invitation.email,
      formId: invitation.form_id,
      formName: form.name,
      status: invitation.status,
      expiresAt: invitation.expires_at,
    },
  }, { status: 201 });
}
