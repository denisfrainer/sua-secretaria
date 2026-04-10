import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { supabaseAdmin } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/dashboard';

  if (code) {
    const cookieStore = await cookies();
    
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value;
          },
          set(name: string, value: string, options: CookieOptions) {
            cookieStore.set({ name, value, ...options });
          },
          remove(name: string, options: CookieOptions) {
            cookieStore.delete({ name, ...options });
          },
        },
      }
    );

    const { data: { session }, error } = await supabase.auth.exchangeCodeForSession(code);
    
    if (!error && session?.user) {
      console.log('[AUTH_CALLBACK] Code exchanged successfully.');

      // Persist Google Refresh Token if available (for future calendar syncs)
      const providerRefreshToken = session.provider_refresh_token;
      if (providerRefreshToken) {
        console.log('[AUTH_CALLBACK] Capturing Google Refresh Token...');
        await supabaseAdmin
          .from('profiles')
          .update({ google_refresh_token: providerRefreshToken })
          .eq('id', session.user.id);
      }

      // 🛡️ GUARANTEE BUSINESS CONFIG EXISTS (Onboarding Safety)
      console.log(`[AUTH_CALLBACK] Ensuring business_config exists for user: ${session.user.id}`);
      const { data: existingBusinessConfig } = await supabaseAdmin
        .from('business_config')
        .select('id')
        .eq('owner_id', session.user.id)
        .maybeSingle();

      if (!existingBusinessConfig) {
        console.log(`[AUTH_CALLBACK] No business_config found. Creating default for ${session.user.id}...`);
        const { error: insertError } = await supabaseAdmin
          .from('business_config')
          .insert({
            owner_id: session.user.id,
            plan_tier: 'ELITE',
            instance_name: `inst-${session.user.id.substring(0, 8)}`,
            context_json: {
              is_ai_enabled: true,
              connection_status: 'DISCONNECTED',
              business_info: { name: '', address: '', parking: '', handoff_phone: '' },
              operating_hours: {
                weekdays: { open: "09:00", close: "18:00", is_closed: false },
                saturday: { open: "09:00", close: "13:00", is_closed: false },
                sunday: { open: "00:00", close: "00:00", is_closed: true },
                observations: ""
              },
              services: [],
              scheduling_rules: [],
              restrictions: [],
              tone_of_voice: { base_style: "Amigável e profissional", custom_instructions: "Responda de forma natural." },
              payment_info: { pix_type: "", pix_key: "", owner_name: "" },
              booking_policies: { minimum_advance_notice: "2 horas", buffer_time_minutes: "15" },
              faq: [],
              updated_at: new Date().toISOString()
            }
          });

        if (insertError) {
          console.error('[AUTH_CALLBACK] Failed to create business_config:', insertError.message);
        } else {
          console.log(`[AUTH_CALLBACK] ✅ business_config created for ${session.user.id}`);
        }
      } else {
        console.log(`[AUTH_CALLBACK] business_config already exists for ${session.user.id}. Skipping.`);
      }

      // Return NextResponse.redirect to ensure cookies are attached to the browser response.
      return NextResponse.redirect(new URL(next, origin));
    }
    
    console.error('[AUTH_CALLBACK_ERROR] Exchange failed:', error?.message);
  }

  // Fallback to error page if something went wrong
  return NextResponse.redirect(new URL('/login?error=auth_failed', origin));
}
