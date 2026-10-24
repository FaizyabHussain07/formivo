/**
 * Map raw Supabase auth errors to calm, actionable, user-facing copy.
 * Brand doc §45: errors are clear, specific, calm and actionable.
 */
export function humaniseAuthError(message: string): string {
  const lower = message.toLowerCase();

  if (lower.includes('already registered') || lower.includes('already been registered')) {
    return 'An account with this email already exists. Try signing in instead.';
  }
  if (lower.includes('password should be at least')) {
    return 'Password must be at least 8 characters.';
  }
  if (lower.includes('email not confirmed')) {
    return 'Confirm your email first — check your inbox for the verification link.';
  }
  if (lower.includes('invalid login credentials')) {
    return 'Email or password is incorrect.';
  }
  if (lower.includes('rate limit') || lower.includes('too many requests')) {
    return 'Too many attempts. Please wait a moment and try again.';
  }
  if (lower.includes('email rate limit')) {
    return 'We sent too many emails too quickly. Please wait a minute and try again.';
  }
  if (lower.includes('signup is disabled')) {
    return 'Sign-ups are currently disabled.';
  }
  if (lower.includes('user not found')) {
    return 'No account found for that email address.';
  }
  if (lower.includes('same password')) {
    return 'Choose a password you have not used before.';
  }
  return message;
}

/** Sanitise a ?next= value so it can only be an in-app path. */
export function safeNextPath(value: string | null, fallback = '/dashboard'): string {
  if (!value) return fallback;
  if (!value.startsWith('/') || value.startsWith('//')) return fallback;
  return value;
}