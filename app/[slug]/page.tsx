import { supabaseAdmin } from '@/lib/supabase/admin';
import { notFound } from 'next/navigation';
import SchedulingInterface from '@/components/scheduling/SchedulingInterface';

// Storefront Components
import { Hero as StorefrontHero } from '@/components/storefront/Hero';
import { Services as StorefrontServices, ServiceItem } from '@/components/storefront/Services';
import { Portfolio as StorefrontPortfolio } from '@/components/storefront/Portfolio';
import { StorefrontHeader } from '@/components/storefront/StorefrontHeader';
import { Sparkles } from 'lucide-react';

export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

/**
 * UNIVERSAL ROOT SCHEDULING & STOREFRONT ROUTE
 * This handles dynamic slug mapping (e.g., vitrine-manicure.netlify.app/rubia-beauty).
 */
export default async function PublicBookingPage({ params }: { params: Promise<{ slug: string }> }) {
  const resolvedParams = await params;
  const slug = resolvedParams?.slug;

  if (!slug || slug === 'undefined') {
    notFound();
  }

  const decodedSlug = decodeURIComponent(slug);
  const isDarkLaunch = process.env.NEXT_PUBLIC_DARK_LAUNCH === 'true';

  console.log(`[ROUTING] Handling public slug request: "${decodedSlug}". Feature dark launch is: ${isDarkLaunch}`);

  if (!supabaseAdmin) {
    console.error('[SLUG_RESOLVER] Critical: supabaseAdmin is not configured.');
    return <div className="p-8 text-center text-red-500 font-bold">Erro: Conexão com o banco de dados falhou.</div>;
  }

  console.time(`[SSR_RESOLVER] ${decodedSlug} total`);
  
  console.log(`[SLUG_RESOLVER] Start path resolution for slug: "${decodedSlug}"`);
  
  // 1. Fetch from vitrine_profiles by slug
  console.log(`[SLUG_RESOLVER] [DB_READ] Fetching vitrine_profiles by slug: "${decodedSlug}"`);
  console.time(`[SLUG_RESOLVER] DB_read vitrine_profiles_slug`);
  let { data: vitrineProfile, error: profileError } = await supabaseAdmin
    .from('vitrine_profiles')
    .select('*')
    .eq('slug', decodedSlug)
    .maybeSingle();
  console.timeEnd(`[SLUG_RESOLVER] DB_read vitrine_profiles_slug`);

  if (profileError) {
    console.error(`❌ [SLUG_RESOLVER] DB Error fetching vitrine_profiles by slug:`, profileError.message);
  } else {
    console.log(`[SLUG_RESOLVER] DB success vitrine_profiles:`, vitrineProfile ? `Found user_id=${vitrineProfile.user_id}` : 'Not found');
  }

  // FALLBACKS (UUID, WhatsApp) - Supporting direct user_id (UUID) and whatsapp lookups
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  
  if (!vitrineProfile && uuidRegex.test(decodedSlug)) {
    console.log(`[SLUG_RESOLVER] [DB_READ] Slug matches UUID regex, querying vitrine_profiles by user_id: "${decodedSlug}"`);
    console.time(`[SLUG_RESOLVER] DB_read vitrine_profiles_uuid`);
    const { data: profileById, error: idError } = await supabaseAdmin
      .from('vitrine_profiles')
      .select('*')
      .eq('user_id', decodedSlug)
      .maybeSingle();
    console.timeEnd(`[SLUG_RESOLVER] DB_read vitrine_profiles_uuid`);
    
    if (idError) {
      console.error(`❌ [SLUG_RESOLVER] DB Error fetching vitrine_profiles by user_id fallback:`, idError.message);
    } else {
      vitrineProfile = profileById;
      console.log(`[SLUG_RESOLVER] DB fallback by user_id:`, vitrineProfile ? 'Found' : 'Not found');
    }
  }

  if (!vitrineProfile) {
    const potentialPhone = decodedSlug.replace(/\D/g, '');
    if (potentialPhone.length >= 10) {
      console.log(`[SLUG_RESOLVER] [DB_READ] Querying vitrine_profiles by whatsapp phone fallback: "${potentialPhone}"`);
      console.time(`[SLUG_RESOLVER] DB_read vitrine_profiles_phone`);
      const { data: profileByPhone, error: phoneError } = await supabaseAdmin
        .from('vitrine_profiles')
        .select('*')
        .eq('whatsapp', potentialPhone)
        .maybeSingle();
      console.timeEnd(`[SLUG_RESOLVER] DB_read vitrine_profiles_phone`);
      
      if (phoneError) {
        console.error(`❌ [SLUG_RESOLVER] DB Error fetching vitrine_profiles by phone fallback:`, phoneError.message);
      } else {
        vitrineProfile = profileByPhone;
        console.log(`[SLUG_RESOLVER] DB fallback by phone:`, vitrineProfile ? 'Found' : 'Not found');
      }
    }
  }

  if (!vitrineProfile) {
    console.timeEnd(`[SSR_RESOLVER] ${decodedSlug} total`);
    console.warn(`⚠️ [SLUG_RESOLVER] Showcase profile not found for slug/id/phone: "${decodedSlug}". Invoking notFound().`);
    notFound();
  }

  // 2. Load the corresponding system base profile
  console.log(`[SLUG_RESOLVER] [DB_READ] Fetching base system profile for user_id: "${vitrineProfile.user_id}"`);
  console.time(`[SLUG_RESOLVER] DB_read base_profile`);
  const { data: baseProfile, error: baseProfileError } = await supabaseAdmin
    .from('profiles')
    .select('id, full_name, display_name, slug, avatar_url')
    .eq('id', vitrineProfile.user_id)
    .maybeSingle();
  console.timeEnd(`[SLUG_RESOLVER] DB_read base_profile`);

  if (baseProfileError) {
    console.error(`❌ [SLUG_RESOLVER] DB Error fetching base profiles:`, baseProfileError.message);
  } else {
    console.log(`[SLUG_RESOLVER] DB base profile payload:`, baseProfile);
  }

  // 3. Fetch services from vitrine_services table
  console.log(`[SLUG_RESOLVER] [DB_READ] Fetching services from vitrine_services for user_id: "${vitrineProfile.user_id}"`);
  console.time(`[SLUG_RESOLVER] DB_read vitrine_services`);
  const { data: dbServices, error: servicesError } = await supabaseAdmin
    .from('vitrine_services')
    .select('*')
    .eq('user_id', vitrineProfile.user_id)
    .order('created_at', { ascending: true });
  console.timeEnd(`[SLUG_RESOLVER] DB_read vitrine_services`);

  if (servicesError) {
    console.error(`❌ [SLUG_RESOLVER] DB Error fetching services:`, servicesError.message);
  } else {
    console.log(`[SLUG_RESOLVER] DB services payload length:`, dbServices ? dbServices.length : 0);
  }

  // 4. Fetch portfolio items from vitrine_portfolio table
  console.log(`[SLUG_RESOLVER] [DB_READ] Fetching portfolio items from vitrine_portfolio for user_id: "${vitrineProfile.user_id}"`);
  console.time(`[SLUG_RESOLVER] DB_read vitrine_portfolio`);
  const { data: dbPortfolio, error: portfolioError } = await supabaseAdmin
    .from('vitrine_portfolio')
    .select('*')
    .eq('user_id', vitrineProfile.user_id)
    .order('created_at', { ascending: false });
  console.timeEnd(`[SLUG_RESOLVER] DB_read vitrine_portfolio`);

  if (portfolioError) {
    console.error(`❌ [SLUG_RESOLVER] DB Error fetching portfolio:`, portfolioError.message);
  } else {
    console.log(`[SLUG_RESOLVER] DB portfolio payload length:`, dbPortfolio ? dbPortfolio.length : 0);
  }

  console.timeEnd(`[SSR_RESOLVER] ${decodedSlug} total`);
  console.log(`[SLUG_RESOLVER] Data fetching completed successfully for "${decodedSlug}".`);

  // Build compatible objects for legacy Dark Launch Scheduling interface if enabled
  const formattedServices: ServiceItem[] | undefined = dbServices && dbServices.length > 0
    ? dbServices.map((s: any) => ({
        id: s.id,
        name: s.title,
        description: s.description || 'Descrição do serviço oferecido.',
        price: Number(s.price) || 0,
        duration: Number(s.duration) || 60,
        category: s.category || 'Serviços'
      }))
    : undefined;

  const mockBusinessConfig = {
    context_json: {
      business_info: {
        name: vitrineProfile.name,
        description: vitrineProfile.bio,
        logo_url: vitrineProfile.cover_photo_url,
      },
      services: formattedServices || []
    }
  };

  // If Dark Launch is enabled, load the original scheduling interface
  if (isDarkLaunch) {
    console.log(`[ROUTING] Dark Launch active. Redirecting to SchedulingInterface for owner_id: ${vitrineProfile.user_id}`);
    return (
      <div className="min-h-screen bg-gray-50/50 flex flex-col items-center justify-center p-4 md:p-8">
        <SchedulingInterface 
          profile={{
            id: vitrineProfile.user_id,
            full_name: baseProfile?.full_name || vitrineProfile.name,
            display_name: baseProfile?.display_name || vitrineProfile.name,
            slug: vitrineProfile.slug,
            phone: vitrineProfile.whatsapp,
            avatar_url: baseProfile?.avatar_url
          }} 
          businessConfig={mockBusinessConfig} 
        />
      </div>
    );
  }

  // Otherwise, render the premium manicurist Vitrine Virtual Storefront
  const displayName = vitrineProfile.name || baseProfile?.display_name || baseProfile?.full_name || 'Profissional de Beleza';
  const phone = vitrineProfile.whatsapp || baseProfile?.phone || '5541999999999';
  const niche = vitrineProfile.bio || 'Manicure & Nail Designer • Especialista em unhas em gel';
  const avatarUrl = baseProfile?.avatar_url || 'https://images.unsplash.com/photo-1607990283143-e81e7a2c93ab?auto=format&fit=crop&q=80&w=400&h=400';

  return (
    <div className="min-h-screen bg-[#FFFBFB] text-slate-800 font-sans selection:bg-rose-200 selection:text-rose-900 scroll-smooth w-full">
      <StorefrontHeader
        displayName={displayName}
        phone={phone}
        showLogin={false}
      />

      <main className="pb-24">
        {/* Hero Section */}
        <StorefrontHero
          displayName={displayName}
          niche={niche}
          phone={phone}
          avatarUrl={avatarUrl}
          coverUrl={vitrineProfile.cover_photo_url || "https://images.unsplash.com/photo-1607779097040-26e80aa78e66?auto=format&fit=crop&q=80&w=1200&h=400"}
          location="Atendimento Domiciliar / Studio"
        />

        {/* Services List Section */}
        <StorefrontServices
          services={formattedServices}
          phone={phone}
          professionalName={displayName}
        />

        {/* Portfolio Section */}
        <StorefrontPortfolio items={dbPortfolio || undefined} />
      </main>

      {/* Footer */}
      <footer className="bg-rose-50/40 border-t border-rose-100/50 py-12 text-center text-slate-400">
        <div className="max-w-4xl mx-auto px-4">
          <p className="font-extrabold text-slate-700 text-sm tracking-tight">{displayName}</p>
          <p className="text-xs mt-1 text-slate-400 font-medium">Atendimento Especializado com Hora Marcada</p>
          <p className="text-[10px] text-slate-300 font-bold uppercase tracking-widest mt-6">
            © {new Date().getFullYear()} Todos os direitos reservados
          </p>
        </div>
      </footer>
    </div>
  );
}
