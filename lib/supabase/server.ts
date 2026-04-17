import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createClient() {
  const cookieStore = await cookies()
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  console.log('🖥️  [SUPABASE SERVER] Initializing with URL:', supabaseUrl);
  console.log('🔑 [SUPABASE SERVER] Anon Key (first 10):', supabaseAnonKey.substring(0, 10));

  return createServerClient(
    supabaseUrl,
    supabaseAnonKey,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // setAll can throw when called from Server Components.
            // This is safe to ignore because the middleware handles
            // cookie refresh on every request.
          }
        },
      },
    }
  )
}
