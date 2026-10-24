/**
 * App-wide runtime configuration (Master Prompt §74).
 * Server-only env reads here; never import this module from client components
 * if a server-only value is needed. Public values are explicitly marked.
 */

/**
 * Canonical production origin. Every endpoint URL and integration example a
 * developer copies always uses this domain, regardless of where the dashboard
 * itself is being served from (local dev, preview deploy, production).
 */
export const PRODUCTION_URL = "https://formivo.faizyab.me";

/**
 * Public app URL for links, emails, and metadata. Localhost is never used in
 * product URLs: unset env falls back to the production domain.
 */
export const APP_URL =
  process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ||
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : PRODUCTION_URL);

/** True when required third-party credentials are present (drives degrade-gracefully UI). */
export const hasResendConfig = () => Boolean(process.env.RESEND_API_KEY);
export const hasLemonSqueezyConfig = () =>
  Boolean(
    process.env.LEMON_SQUEEZY_API_KEY &&
      process.env.LEMON_SQUEEZY_STORE_ID &&
      process.env.LEMON_SQUEEZY_WEBHOOK_SECRET,
  );
export const hasSupabaseConfig = () =>
  Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

/**
 * Invitation lifetime in milliseconds. Spec default is 72 hours;
 * override with INVITATION_TTL_HOURS. Bad or absent values fall back.
 */
export function invitationTtlMs(): number {
  const raw = Number(process.env.INVITATION_TTL_HOURS);
  const hours = Number.isFinite(raw) && raw > 0 ? raw : 72;
  return hours * 60 * 60 * 1000;
}
