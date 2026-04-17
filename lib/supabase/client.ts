import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  console.log('🌐 [SUPABASE CLIENT] Initializing with URL:', supabaseUrl);
  console.log('🔑 [SUPABASE CLIENT] Anon Key (first 10):', supabaseAnonKey.substring(0, 10));

  return createBrowserClient(
    supabaseUrl,
    supabaseAnonKey,
    {
      auth: {
        detectSessionInUrl: false,
        persistSession: true,
        autoRefreshToken: true,
      }
    }
  )
}
