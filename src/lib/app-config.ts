/**
 * App-wide runtime configuration (Master Prompt §74).
 * Server-only env reads here; never import this module from client components
 * if a server-only value is needed. Public values are explicitly marked.
 */

/** Public app URL, used for links, emails, and API examples. */
export const APP_URL =
  process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ||
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");

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
