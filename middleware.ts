import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export default async function middleware(request: NextRequest) {
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

  // IMPORTANT: Avoid using getUser() in middleware if performance is a priority, 
  // but as per your request and official SSR guide for session refresh, we use it here.
  const { data: { user } } = await supabase.auth.getUser()

  const { pathname } = request.nextUrl
  
  // Route Protection Logic
  const isDashboard = pathname.startsWith('/dashboard')
  const isLogin = pathname.startsWith('/login')
  const isAuthCallback = pathname.includes('/auth/callback')

  if (isDashboard && !user && !isAuthCallback) {
    // Redirect to login if accessing dashboard without session
    const url = request.nextUrl.clone()
    url.searchParams.set('clear_session', 'true')
    return NextResponse.redirect(url)
  }

  if (isLogin && user) {
    // Redirect to dashboard if already logged in
    const url = request.nextUrl.clone()
    url.pathname = '/dashboard'
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    // 1. Skip all internal paths (_next, _vercel)
    // 2. Skip all files with extensions (static assets, PWA manifest, sw.js)
    // 3. Skip auth callback API
    '/((?!api|_next|_vercel|auth/callback|.*\\..*).*)'
  ],
}
