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

  // 2. Refresh the session (Crititcal for Server Components auth sync)
  const { data: { user } } = await supabase.auth.getUser()

  const pathname = request.nextUrl.pathname;
  const searchParams = request.nextUrl.searchParams;
  const isAuthCallback = pathname.startsWith('/auth/callback');

  console.log(`📡 [MIDDLEWARE_CHECK] Path: ${pathname} | Auth: ${!!user} | Timestamp: ${new Date().toISOString()}`);

  // 3. Authorization Logic
  
  // Protect /dashboard routes
  if (pathname.startsWith('/dashboard') && !user && !isAuthCallback) {
    console.log('🚫 [MIDDLEWARE] Unauthorized access. Redirecting to /login.');
    return NextResponse.redirect(new URL('/login', request.url));
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
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}

