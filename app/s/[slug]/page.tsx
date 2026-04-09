import { supabaseAdmin } from '@/lib/supabase/admin';
import { notFound } from 'next/navigation';
import SchedulingInterface from '@/components/scheduling/SchedulingInterface';

/**
 * UNIVERSAL SCHEDULING ROUTE
 * Supports both personalized slugs (/rubia) and legacy UUID IDs.
 */
export default async function SlugSchedulePage({ params }: { params: Promise<{ slug: string }> }) {
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

  let { data: profile, error: slugError } = await supabaseAdmin
    .from('profiles')
    .select('*')
    .eq('slug', decodedSlug)
    .maybeSingle();

  if (slugError) {
    console.error('[SLUG_RESOLVER] DB Error (Slug):', slugError.message);
  }

  // 2. FALLBACK: Check if slug is a valid UUID (Legacy ID support)
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  
  if (!profile && uuidRegex.test(decodedSlug)) {
    console.log(`[SLUG_RESOLVER] Falling back to UUID lookup for: ${decodedSlug}`);
    const { data: profileById } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('id', decodedSlug)
      .maybeSingle();
      
    profile = profileById;
  }

  // 3. Final Check
  if (!profile) {
    console.warn(`[SLUG_RESOLVER] No profile found for slug/id: ${decodedSlug}`);
    notFound();
  }

  console.log(`[SLUG_RESOLVER] Resolved profile for: ${decodedSlug} -> ${profile.full_name}`);

  return (
    <div className="min-h-screen bg-gray-50/50 flex flex-col items-center justify-center p-4 md:p-8">
      <SchedulingInterface profile={profile} />
    </div>
  );
}
