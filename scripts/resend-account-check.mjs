import { createClient } from '@supabase/supabase-js';

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const fromEmail = process.env.RESEND_FROM_EMAIL ?? 'Formivo <onboarding@resend.dev>';

if (!RESEND_API_KEY) {
  console.log('SKIP: RESEND_API_KEY is not set in process.env');
  process.exit(0);
}

try {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
  });

  const body = await res.json().catch(() => ({}));

  console.log('RESEND_CHECK_STATUS=', res.status);
  console.log('RESEND_CHECK_BODY=', JSON.stringify(body, null, 2));

  if (res.ok) {
    console.log('RESEND_CHECK=OK');
    console.log('RESEND_FROM_EMAIL_CONFIGURED=', fromEmail);
    process.exit(0);
  } else {
    console.log('RESEND_CHECK=NOT_OK');
    process.exit(res.status >= 500 ? 2 : 1);
  }
} catch (err) {
  console.error('RESEND_CHECK_ERROR=', err instanceof Error ? err.message : String(err));
  process.exit(3);
}
