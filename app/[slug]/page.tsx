import { supabaseAdmin } from '@/lib/supabase/admin';
import { notFound } from 'next/navigation';
import SchedulingInterface from '@/components/scheduling/SchedulingInterface';

/**
 * UNIVERSAL ROOT SCHEDULING ROUTE
 * This is the primary entry point for personalized booking links (e.g., sua-secretaria.netlify.app/rubia-beauty).
 */
export default async function PublicBookingPage({ params }: { params: Promise<{ slug: string }> }) {
  const resolvedParams = await params;
  const slug = resolvedParams?.slug;

  if (!slug || slug === 'undefined') {
    notFound();
  }

  const decodedSlug = decodeURIComponent(slug);

  // 1. Try resolving by SLUG first
  if (!supabaseAdmin) {
    console.error('[SLUG_RESOLVER] Critical: supabaseAdmin is not configured.');
    return <div className="p-8 text-center text-red-500 font-bold">Erro: Conexão com o banco de dados falhou. Verifique as chaves administrativas.</div>;
  }

  console.log(`[ROUTING] Handling public slug: "${decodedSlug}"`);
  console.time(`[SSR_RESOLVER] ${decodedSlug} total`);
  
  // FETCH PROFILE
  console.time(`[SSR_RESOLVER] ${decodedSlug} profile`);
  let { data: profile, error: slugError } = await supabaseAdmin
    .from('profiles')
    .select('id, full_name, display_name, slug, phone')
    .eq('slug', decodedSlug)
    .maybeSingle();
  console.timeEnd(`[SSR_RESOLVER] ${decodedSlug} profile`);

  if (slugError) {
    console.error('[SLUG_RESOLVER] DB Error (Slug):', slugError.message);
  }

  if (profile) {
    console.log(`[SLUG_RESOLVER] SUCCESS: Found profile "${profile.display_name || profile.full_name}" for slug "${decodedSlug}"`);
  }

  // 2. FALLBACKS (UUID, Phone) - Supporting legacy IDs and direct phone access
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  
  if (!profile && uuidRegex.test(decodedSlug)) {
    console.log(`[SLUG_RESOLVER] Falling back to UUID lookup for: ${decodedSlug}`);
    const { data: profileById } = await supabaseAdmin
      .from('profiles')
      .select('id, full_name, display_name, slug, phone')
      .eq('id', decodedSlug)
      .maybeSingle();
      
    profile = profileById;
    if (profile) console.log(`[SLUG_RESOLVER] SUCCESS (UUID): Found profile "${profile.display_name || profile.full_name}"`);
  }

  if (!profile) {
    const potentialPhone = decodedSlug.replace(/\D/g, '');
    if (potentialPhone.length >= 10) {
      console.log(`[SLUG_RESOLVER] Falling back to Phone lookup for: ${potentialPhone}`);
      const { data: profileByPhone } = await supabaseAdmin
        .from('profiles')
        .select('id, full_name, display_name, slug, phone')
        .eq('phone', potentialPhone)
        .maybeSingle();
        
      profile = profileByPhone;
      if (profile) console.log(`[SLUG_RESOLVER] SUCCESS (Phone): Found profile "${profile.display_name || profile.full_name}"`);
    }
  }

  if (!profile) {
    console.timeEnd(`[SSR_RESOLVER] ${decodedSlug} total`);
    console.warn(`[ROUTING] ERROR: Profile not found for "${decodedSlug}". Triggering notFound().`);
    notFound();
  }

  // 3. Fetch Business Config
  console.time(`[SSR_RESOLVER] ${decodedSlug} config`);
  const { data: businessConfig } = await supabaseAdmin
    .from('business_config')
    .select('*')
    .eq('owner_id', profile.id)
    .maybeSingle();
  console.timeEnd(`[SSR_RESOLVER] ${decodedSlug} config`);
  
  if (businessConfig) {
    console.log(`[SLUG_RESOLVER] Business config loaded for: ${profile.id}`);
  } else {
    console.warn(`[SLUG_RESOLVER] No business_config found for profile: ${profile.id}`);
  }
  
  console.timeEnd(`[SSR_RESOLVER] ${decodedSlug} total`);

  return (
    <div className="min-h-screen bg-gray-50/50 flex flex-col items-center justify-center p-4 md:p-8">
      <SchedulingInterface profile={profile} businessConfig={businessConfig} />
    </div>
  );
}
