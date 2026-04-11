import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export default async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
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
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Identity Check (Identity ONLY, no DB queries for performance)
  const { data: { user } } = await supabase.auth.getUser()

  const { pathname } = request.nextUrl
  
  // Clean route protection (No more locale prefixes)
  const isDashboard = pathname.startsWith('/dashboard')
  const isLogin = pathname.startsWith('/login')
  const isAuthCallback = pathname.includes('/auth/callback')

  // Protected Route Logic
  if (isDashboard && !user && !isAuthCallback) {
    // Redirect to login if accessing dashboard without session
    return NextResponse.redirect(new URL('/login', request.url))
  }

  if (isLogin && user) {
    // Redirect to dashboard if already logged in
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  return response
}

export const config = {
  matcher: [
    // 1. Skip all internal paths (_next, _vercel)
    // 2. Skip all files with extensions (static assets, PWA manifest, sw.js)
    // 3. Skip auth callback API
    '/((?!api|_next|_vercel|auth/callback|.*\\..*).*)'
  ],
}
