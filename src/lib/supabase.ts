/**
 * Supabase browser client for Client Components only.
 * This module does NOT import next/headers, so it can be used in Client Components.
 */
import { createBrowserClient } from '@supabase/ssr';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

let _browserClient: ReturnType<typeof createBrowserClient> | null = null;

export function createBrowserSupabaseClient() {
  if (_browserClient) return _browserClient;
  _browserClient = createBrowserClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  return _browserClient;
}
