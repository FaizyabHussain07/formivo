import { redirect } from 'next/navigation';

/**
 * Public invitation link: `https://formivo.faizyab.me/invite/<token>`.
 *
 * Link-only visitors get a clear gateway page telling them to sign in with the
 * invited email. Authenticated users are forwarded directly to the accept
 * route so they land on a server-side accept attempt.
 */
export const metadata = { title: 'Accept Invitation' };

export default async function InvitePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const supabase = await import('@/lib/db/server').then((m) => m.createServerSupabaseClient());
  const { data: { user } } = await supabase.auth.getUser();

  if (user?.email) {
    // Authenticated visitor: go straight to the accept route.
    redirect(`/invitations/accept?token=${encodeURIComponent(token)}`);
  }

  // Link-only visitor: the sign-in page carries the accept token ahead of time.
  redirect(`/sign-in?next=/invitations/accept?token=${encodeURIComponent(token)}`);
}