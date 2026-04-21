import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

// ⚡ RESERVED PATHS: Middleware will SKIP all authentication logic for routes NOT in this list.
// Expanded to include common static files that might fall through to dynamic routes.
const RESERVED_PATHS = [
  '/dashboard', 
  '/api', 
  '/login', 
  '/admin', 
  '/auth', 
  '/_next', 
  '/assets',
  '/favicon.ico',
  '/robots.txt',
  '/sitemap.xml',
  '/manifest.json'
];

export default async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  
  // ⚡ INFRASTRUCTURE TRACE: Inbound Heartbeat
  console.log(`📡 [WEB HEARTBEAT] Hit: ${pathname}`);

  // 1. NEGATIVE MATCHER: Fast-track public routes
  // If the path is NOT reserved AND is not the root landing page, skip middleware entirely.
  const isReserved = RESERVED_PATHS.some(path => pathname.startsWith(path));
  
  if (!isReserved && pathname !== '/') {
    // console.log(`[PERF] Middleware skipped for public route: ${pathname}`);
    const response = NextResponse.next();
    response.headers.set('x-middleware-skipped', 'true');
    return response;
  }

  let supabaseResponse = NextResponse.next({
    request,
  })

  // 2. AUTHENTICATION (Only runs for reserved paths / dashboard)
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => request.cookies.set({ name, value, ...options }))
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set({ name, value, ...options })
          )
        },
      },
    }
  )

  // Lazy Auth Recovery
  const isDashboard = pathname.startsWith('/dashboard')
  const isAdmin = pathname.startsWith('/admin')
  const isLogin = pathname === '/login'

  if (isDashboard || isAdmin || isLogin) {
    const { data: { user } } = await supabase.auth.getUser()

    if ((isDashboard || isAdmin) && !user) {
      const url = request.nextUrl.clone()
      url.pathname = '/login'
      url.searchParams.set('clear_session', 'true')
      return NextResponse.redirect(url)
    }

    if (isLogin && user) {
      const url = request.nextUrl.clone()
      url.pathname = '/dashboard'
      return NextResponse.redirect(url)
    }
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for static files with extensions.
     */
    '/((?!.*\\..*|auth/callback).*)',
  ],
}
