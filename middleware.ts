import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export default async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  
  // 1. FAST PATH: Early return for public assets and public booking routes
  // This bypasses ALL database/auth overhead for critical paths
  if (
    pathname.startsWith('/booking/') || 
    pathname.startsWith('/api/') ||
    pathname.includes('.') ||
    pathname === '/'
  ) {
    return NextResponse.next()
  }

  let supabaseResponse = NextResponse.next({
    request,
  })

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

  // 2. LAZY AUTH: Only invoke getUser() for protected routes
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
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - auth/callback (auth api)
     */
    '/((?!_next/static|_next/image|favicon.ico|auth/callback).*)',
  ],
}
