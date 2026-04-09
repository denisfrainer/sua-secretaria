import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function proxy(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  // 1. Create the Supabase client and link it to the response
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        persistSession: true,
        detectSessionInUrl: true,
      },
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, { ...options, path: '/' })
          )
        },
      },
    }
  )

  // 2. Session-First & Refresh check
  const pathname = request.nextUrl.pathname;
  const searchParams = request.nextUrl.searchParams;
  const isAuthCallback = pathname.startsWith('/auth/callback');
  
  // Optimization: Only getUser() if we are in a protected area AND have a session cookie
  // This prevents hitting Supabase API unnecessarily for static assets or landing pages
  const allCookies = request.cookies.getAll();
  const hasAuthToken = allCookies.some(c => c.name.includes('-auth-token'));

  let user = null;
  if (hasAuthToken || pathname.startsWith('/dashboard') || isAuthCallback) {
     const { data } = await supabase.auth.getUser();
     user = data.user;
  }

  console.log(`📡 [MIDDLEWARE_CHECK] Path: ${pathname} | AuthToken: ${hasAuthToken} | User: ${!!user}`);

  // 3. Authorization Logic
  
  // Protect /dashboard routes
  if (pathname.startsWith('/dashboard') && !user && !isAuthCallback) {
    console.error('[AUTH_REDIRECT_TRIGGERED] No user found. Redirecting to login.', {
      cookiesPresent: hasAuthToken,
      path: pathname,
      timestamp: new Date().toISOString()
    });
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // Tier-based route protection for Settings
  if (pathname.startsWith('/dashboard/settings') && user) {
     const { data: profile } = await supabase
       .from('profiles')
       .select('plan_tier')
       .eq('id', user.id)
       .maybeSingle();
     
     const tier = profile?.plan_tier || 'STARTER';

     // Gate WhatsApp and AI (PRO+)
     const isProPath = pathname.startsWith('/dashboard/settings/whatsapp') || 
                      pathname.startsWith('/dashboard/settings/agents');
     
     if (isProPath && tier === 'STARTER') {
       console.log(`🚫 [MIDDLEWARE] Tier mismatch. STARTER user tried to access PRO path: ${pathname}`);
       return NextResponse.redirect(new URL('/dashboard/settings/payments', request.url));
     }

     // Gate Wolf Agent (ELITE only)
     const isElitePath = pathname.startsWith('/dashboard/settings/agents') && 
                        searchParams.get('tab') === 'outbound';
     
     if (isElitePath && tier !== 'ELITE') {
       console.log(`🚫 [MIDDLEWARE] Tier mismatch. ${tier} user tried to access ELITE path: ${pathname}`);
       return NextResponse.redirect(new URL('/dashboard/settings/payments', request.url));
     }
  }

  // Prevent logged users from seeing login/home
  const isLandingOrLogin = pathname === '/' || pathname.startsWith('/login')
  if (isLandingOrLogin && user) {
    console.log(`✅ [MIDDLEWARE] Authenticated user on ${pathname}. Redirecting to /dashboard.`);
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  // IMPORTANT: MUST return the supabaseResponse containing updated cookies!
  return supabaseResponse
}

export const config = {
  runtime: 'edge',
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}

