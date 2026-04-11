import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  // 1. Create a mutable response that we can attach refreshed cookies to
  let supabaseResponse = NextResponse.next({
    request,
  });

  // 2. Create Supabase client wired to read from request cookies
  //    and write refreshed tokens into the outgoing response cookies
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          // Mirror cookies into the request (for downstream server components)
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          // Recreate the response to capture updated request headers
          supabaseResponse = NextResponse.next({
            request,
          });
          // Write cookies into the actual outgoing response
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // 3. IMPORTANT: getUser() forces a token refresh if needed,
  //    which triggers setAll above, syncing cookies to the response.
  //    Do NOT use getSession() — it reads from storage without validation.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // 4. Protected route gate: redirect unauthenticated users away from /dashboard
  if (
    !user &&
    request.nextUrl.pathname.startsWith('/dashboard')
  ) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }

  // 5. MUST return this response — it carries the refreshed auth cookies
  return supabaseResponse;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico (favicon)
     * - public assets (images, manifest, etc.)
     * - API routes that handle their own auth
     */
    '/((?!_next/static|_next/image|favicon.ico|assets/|manifest.json|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
};
