import { createServerSupabaseClient } from '@/lib/db/server';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next');

  if (code) {
    const cookieStore = await cookies();
    const supabase = await createServerSupabaseClient();

    const { data: { session }, error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(
        typeof next === 'string' ? new URL(next, origin).toString() : `${origin}/dashboard`,
      );
    }
  }

  return NextResponse.redirect(`${origin}/sign-in?error=auth_callback_error`);
}
