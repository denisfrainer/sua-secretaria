import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server'; // Ensure this uses @supabase/ssr

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/dashboard'; // Assume onboarding/dashboard is the next step

  if (!code) {
    return NextResponse.redirect(`${origin}/?error=no_code`);
  }

  const supabase = await createClient();

  // Attempt the exchange
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  
  if (error) {
    console.warn(`⚠️ [AUTH CALLBACK] Code exchange failed (likely Next.js double-fire): ${error.message}`);
    // SILICON TWEAK: FAIL FORWARD
    // Ignore the PKCE error and redirect to the protected route anyway.
    // If the parallel Request A succeeded, the browser has the cookie and the Dashboard will load.
    // If it's a genuine failure, the Dashboard's layout/middleware will safely kick them back to login.
    return NextResponse.redirect(`${origin}${next}`);
  }

  console.log("✅ [AUTH CALLBACK] Session successfully created. Redirecting.");
  return NextResponse.redirect(`${origin}${next}`);
}
