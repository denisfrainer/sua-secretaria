import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  
  if (!code) {
    console.error('🚨 [AUTH CALLBACK] No code found in URL search parameters.');
    return NextResponse.redirect(`${origin}?error=${encodeURIComponent('Authentication failed: No code provided')}`);
  }

  try {
    const supabase = await createClient();

    // 1. Double-fire protection: Fast-path if session already established
    const { data: { session: initialSession } } = await supabase.auth.getSession();
    if (initialSession) {
      console.log(`✅ [AUTH CALLBACK] Session already active. Bypassing code exchange. Redirecting to dashboard.`);
      return NextResponse.redirect(`${origin}/dashboard`);
    }

    console.log(`🔄 [AUTH CALLBACK] Received OAuth code. Exchanging for session...`);
    
    // 2. Exchange the authorization code for a session
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    
    if (error) {
      console.error(`❌ [AUTH CALLBACK] Supabase exchangeCodeForSession error:`, error.message);
      
      // 3. Graceful Error Handling: Check if parallel request just succeeded milliseconds ago
      const { data: { session: fallbackSession } } = await supabase.auth.getSession();
      
      if (fallbackSession) {
         console.log(`⚠️ [AUTH CALLBACK] Exchange failed with PKCE error, BUT session is active (Race condition averted).`);
         return NextResponse.redirect(`${origin}/dashboard`);
      }
      
      return NextResponse.redirect(`${origin}?error=${encodeURIComponent(error.message)}`);
    }

    console.log(`✅ [AUTH CALLBACK] Session successfully created. Redirecting to dashboard.`);
    // Successful login router redirection
    return NextResponse.redirect(`${origin}/dashboard`);
    
  } catch (error) {
    console.error(`💥 [AUTH CALLBACK] Unexpected error during code exchange:`, error);
    return NextResponse.redirect(`${origin}?error=${encodeURIComponent('Internal server error')}`);
  }
}
