import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import createMiddleware from 'next-intl/middleware'

const locales = ['pt', 'en', 'es']
const defaultLocale = 'pt'

// 1. Initialize next-intl middleware
const intlMiddleware = createMiddleware({
  locales,
  defaultLocale,
  localePrefix: 'as-needed'
})

export default async function middleware(request: NextRequest) {
  // 2. Obtain the locale-aware response from next-intl
  let response = intlMiddleware(request)

  // 3. Initialize Supabase Client (Linked to the intl response)
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
          // Important: We modify the 'response' object that next-intl already created!
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // 4. Identity Check (Identity ONLY, no DB queries for performance)
  const { data: { user } } = await supabase.auth.getUser()

  const { pathname } = request.nextUrl
  
  // Locale-aware path detection
  // This matches paths like /dashboard, /pt/dashboard, /en/dashboard, etc.
  const isDashboard = /^\/([a-z]{2}\/)?dashboard/.test(pathname)
  const isLogin = /^\/([a-z]{2}\/)?login/.test(pathname)
  const isAuthCallback = pathname.includes('/auth/callback')

  // 5. Protected Route Logic
  if (isDashboard && !user && !isAuthCallback) {
    // Redirect to login if accessing dashboard without session
    // We preserve the locale if present, otherwise default to /login
    const localeMatch = pathname.match(/^\/([a-z]{2})\//)
    const localePrefix = localeMatch ? `/${localeMatch[1]}` : ''
    return NextResponse.redirect(new URL(`${localePrefix}/login`, request.url))
  }

  if (isLogin && user) {
    // Redirect to dashboard if already logged in
    const localeMatch = pathname.match(/^\/([a-z]{2})\//)
    const localePrefix = localeMatch ? `/${localeMatch[1]}` : ''
    return NextResponse.redirect(new URL(`${localePrefix}/dashboard`, request.url))
  }

  /**
   * NOTE ON PERFORMANCE:
   * Do NOT add database queries (e.g., supabase.from('profiles').select()) here.
   * Middleware runs on the Edge; database latency will slow down every single page load.
   * Tier-based protection (PRO/ELITE) should be handled inside Server Components 
   * (e.g., app/dashboard/settings/whatsapp/page.tsx) or Layouts.
   */

  return response
}

export const config = {
  matcher: [
    // Skip all internal paths (_next) and static files
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
