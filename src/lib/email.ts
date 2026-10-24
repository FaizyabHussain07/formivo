export type EmailProviderResult =
  | { success: true; providerMessageId?: string }
  | { success: false; code: string; message: string };

function escHtml(value: unknown): string {
  const raw = value == null ? '' : String(value);
  return raw
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function escUrl(value: unknown): string {
  const raw = value == null ? '' : String(value);
  try {
    return new URL(raw).href;
  } catch {
    return escHtml(raw);
  }
}

function invitationEmailBody({
  inviterName,
  workspaceName,
  formName,
  invitationUrl,
  expiresAt,
  brandYear,
}: {
  inviterName: string;
  workspaceName: string;
  formName: string;
  invitationUrl: string;
  expiresAt: Date;
  brandYear: number;
}) {
  const formattedExpiry = expiresAt.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
  });

  return {
    subject: `You're invited to view leads in Formivo`,
    text: [
      `You've been invited to view leads in Formivo.`,
      '',
      `${inviterName} from ${workspaceName} invited you to access:`,
      `${formName}`,
      '',
      `You'll be able to view leads and basic analytics for this form — without seeing any technical configuration or billing information.`,
      '',
      `Accept your invitation:`,
      `${invitationUrl}`,
      '',
      `This invitation expires on ${formattedExpiry}.`,
      '',
      `If you weren't expecting this invitation, you can safely ignore this email.`,
    ].join('\n'),
    html: [
      '<!DOCTYPE html>',
      '<html>',
      '  <head>',
      '    <meta name="viewport" content="width=device-width, initial-scale=1" />',
      '    <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />',
      '  </head>',
      '  <body style="margin:0;padding:0;background-color:#f5f5f5;font-family:-apple-system,BlinkMacSystemFont,\'Segoe UI\',Roboto,Helvetica,Arial,sans-serif">',
      '    <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f5f5f5;padding:40px 0">',
      '      <tr>',
      '        <td align="center">',
      '          <table width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:10px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.08)">',
      '            <tr>',
      '              <td style="padding:30px 40px;background-color:#0B0D10;text-align:center">',
      '                <h1 style="color:#f5f7fa;font-size:22px;font-weight:700;margin:0;letter-spacing:-0.01em">You\'re invited to Formivo</h1>',
      '              </td>',
      '            </tr>',
      '            <tr>',
      '              <td style="padding:32px 40px;color:#18181b;font-size:15px;line-height:1.6">',
      `                <p><strong>${escHtml(formName)}</strong> has invited you to view their leads dashboard.</p>`,
      '                <p style="margin:0 0 24px">You\'ll be able to view leads and basic analytics for this form — without seeing any technical configuration or billing information.</p>',
      '                <table cellpadding="0" cellspacing="0" style="margin:32px 0">',
      '                  <tr>',
      '                    <td style="background-color:#2DD4BF;border-radius:8px;text-align:center">',
      `                      <a href="${escUrl(invitationUrl)}" style="display:inline-block;padding:12px 24px;color:#0B0D10;font-size:15px;font-weight:600;text-decoration:none;text-align:center">Accept Invitation</a>`,
      '                    </td>',
      '                  </tr>',
      '                </table>',
      '                <p style="margin:0 0 16px;color:#52525b;font-size:13px">This invitation expires on ${formattedExpiry}.</p>',
      '                <p style="margin:0;color:#a1a1aa;font-size:12px">If you weren\'t expecting this invitation, you can safely ignore this email.</p>',
      '              </td>',
      '            </tr>',
      '            <tr>',
      '              <td style="padding:20px 40px;background-color:#fafafa;border-top:1px solid #e4e4e7;text-align:center;color:#a1a1aa;font-size:12px">',
      `                © ${brandYear} Formivo`,
      '              </td>',
      '            </tr>',
      '          </table>',
      '        </td>',
      '      </tr>',
      '    </table>',
      '  </body>',
      '</html>',
    ].join(''),
  };
}

export async function sendInvitationEmail({
  recipientEmail,
  inviterName,
  workspaceName,
  formName,
  invitationUrl,
  expiresAt,
  resendApiKey,
  fromEmail,
}: {
  recipientEmail: string;
  inviterName: string;
  workspaceName: string;
  formName: string;
  invitationUrl: string;
  expiresAt: Date;
  resendApiKey?: string | null;
  fromEmail?: string | null;
}): Promise<EmailProviderResult> {
  if (!resendApiKey) {
    return {
      success: false,
      code: 'EMAIL_CONFIGURATION_ERROR',
      message: 'Email is not configured.',
    };
  }

  const body = invitationEmailBody({
    inviterName,
    workspaceName,
    formName,
    invitationUrl,
    expiresAt,
    brandYear: new Date().getFullYear(),
  });

  const emailRes = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${resendApiKey}`,
    },
    body: JSON.stringify({
      from: fromEmail || 'Formivo <onboarding@resend.dev>',
      to: [recipientEmail],
      subject: body.subject,
      text: body.text,
      html: body.html,
    }),
  });

  if (!emailRes.ok) {
    const text = await textSafe(emailRes).catch(() => '');

    console.error('[invitation_email_failed]', {
      recipientEmail,
      status: emailRes.status,
      body: text,
    });

    return {
      success: false,
      code: 'INVITATION_SEND_FAILED',
      message: `Could not deliver the invitation email: ${emailRes.status} ${emailRes.statusText}`,
    };
  }

  const responseBody = (await jsonSafe(emailRes).catch(() => ({}))) as
    | { data?: { id?: unknown } }
    | null
    | undefined;
  const providerMessageId = responseBody?.data?.id
    ? String(responseBody.data.id)
    : undefined;

  return { success: true, providerMessageId };
}

async function textSafe(res: Response): Promise<string> {
  const text = await res.text();
  if (text.length > 800) {
    return text.slice(0, 800) + '\n…[truncated]';
  }
  return text;
}

async function jsonSafe(res: Response): Promise<unknown> {
  const text = await res.text();
  if (!text.trim()) return {};
  try {
    return JSON.parse(text);
  } catch {
    return { raw: text.slice(0, 200) };
  }
}
