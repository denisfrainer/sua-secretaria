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
    console.log(`🔄 [AUTH CALLBACK] Received OAuth code. Exchanging for session...`);
    
    const supabase = await createClient();
    
    // Exchange the authorization code for a session
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    
    if (error) {
      console.error(`❌ [AUTH CALLBACK] Supabase exchangeCodeForSession error:`, error.message);
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
