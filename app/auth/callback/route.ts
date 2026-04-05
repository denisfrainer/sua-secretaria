import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server'; // Ensure this uses @supabase/ssr

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/dashboard';

  if (!code) {
    return NextResponse.redirect(`${origin}/?error=no_code`);
  }

  const supabase = await createClient();

  try {
    // Attempt the exchange
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    
    if (error) {
      // If it fails (likely PKCE already consumed by race condition), check if session exists anyway
      console.warn(`⚠️ [AUTH CALLBACK] Code exchange failed: ${error.message}. Checking for existing session...`);
      
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session) {
        console.log("✅ [AUTH CALLBACK] Session found despite exchange error. Proceeding to dashboard.");
        return NextResponse.redirect(`${origin}${next}`);
      } else {
        throw error; // No session and exchange failed, this is a real error
      }
    }

    // Exchange successful
    console.log("✅ [AUTH CALLBACK] Session successfully created. Redirecting.");
    return NextResponse.redirect(`${origin}${next}`);

  } catch (err: any) {
    console.error("❌ [AUTH CALLBACK FATAL ERROR]:", err.message);
    return NextResponse.redirect(`${origin}/?error=auth_failed`);
  }
}
