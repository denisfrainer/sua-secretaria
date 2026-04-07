import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
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

  const { data: { user } } = await supabase.auth.getUser()

  const pathname = request.nextUrl.pathname;
  const searchParams = request.nextUrl.searchParams;
  const hasCode = searchParams.has('code') || searchParams.has('access_token');
  const isAuthCallback = pathname.startsWith('/auth/callback');

  console.log(`📡 [MIDDLEWARE] Path: ${pathname} | Auth: ${!!user} | HasCode: ${hasCode}`);

  // GRACE PERIOD: Never redirect to login if we are in the middle of an auth exchange
  if (isAuthCallback || hasCode) {
    console.log('🔒 [MIDDLEWARE] Auth exchange detected. Allowing request to proceed.');
    return supabaseResponse;
  }

  const isProtectedRoute = pathname.startsWith('/dashboard')
  
  if (isProtectedRoute && !user) {
    console.log('🚫 [MIDDLEWARE] Unauthorized access to protected route. Redirecting to /login.');
    const url = request.nextUrl.clone()
    url.pathname = '/login' 
    return NextResponse.redirect(url)
  }

  // Prevenir que usuário logado veja a tela de login
  if ((pathname.startsWith('/login')) && user) {
    console.log('✅ [MIDDLEWARE] Authenticated user on login page without code. Redirecting to /dashboard.');
    const url = request.nextUrl.clone()
    url.pathname = '/dashboard'
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}

