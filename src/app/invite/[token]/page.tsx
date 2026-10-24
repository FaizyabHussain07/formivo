import { redirect } from 'next/navigation';

/**
 * Legacy invitation links (`/invite/<token>`) from emails already delivered
 * keep working: they forward to the canonical acceptance route.
 */
export const metadata = { title: 'Accept Invitation' };

export default async function InvitePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  redirect(`/invitations/accept?token=${encodeURIComponent(token)}`);
}