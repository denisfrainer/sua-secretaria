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
  
  // FETCH PROFILE
  let { data: profile, error: slugError } = await supabaseAdmin
    .from('profiles')
    .select('id, full_name, display_name, slug, phone, avatar_url')
    .eq('slug', decodedSlug)
    .maybeSingle();

  if (slugError) {
    console.error('[SLUG_RESOLVER] DB Error (Slug):', slugError.message);
  }

  // FALLBACKS (UUID, Phone) - Supporting legacy IDs and direct phone access
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  
  if (!profile && uuidRegex.test(decodedSlug)) {
    const { data: profileById } = await supabaseAdmin
      .from('profiles')
      .select('id, full_name, display_name, slug, phone, avatar_url')
      .eq('id', decodedSlug)
      .maybeSingle();
      
    profile = profileById;
  }

  if (!profile) {
    const potentialPhone = decodedSlug.replace(/\D/g, '');
    if (potentialPhone.length >= 10) {
      const { data: profileByPhone } = await supabaseAdmin
        .from('profiles')
        .select('id, full_name, display_name, slug, phone, avatar_url')
        .eq('phone', potentialPhone)
        .maybeSingle();
        
      profile = profileByPhone;
    }
  }

  if (!profile) {
    console.timeEnd(`[SSR_RESOLVER] ${decodedSlug} total`);
    console.warn(`[ROUTING] Profile not found for "${decodedSlug}".`);
    notFound();
  }

  // Fetch Business Config
  const { data: businessConfig } = await supabaseAdmin
    .from('business_config')
    .select('*')
    .eq('owner_id', profile.id)
    .maybeSingle();
  
  console.timeEnd(`[SSR_RESOLVER] ${decodedSlug} total`);

  // If Dark Launch is enabled, load the original scheduling interface
  if (isDarkLaunch) {
    return (
      <div className="min-h-screen bg-gray-50/50 flex flex-col items-center justify-center p-4 md:p-8">
        <SchedulingInterface profile={profile} businessConfig={businessConfig} />
      </div>
    );
  }

  // Otherwise, render the premium manicurist Vitrine Virtual Storefront
  const displayName = profile.display_name || profile.full_name || 'Profissional de Beleza';
  const phone = profile.phone || '5541999999999';
  const niche = businessConfig?.business_niche || 'Manicure & Nail Designer • Especialista em unhas em gel';
  const avatarUrl = profile.avatar_url || 'https://images.unsplash.com/photo-1607990283143-e81e7a2c93ab?auto=format&fit=crop&q=80&w=400&h=400';

  // Map services array if present in database configuration json
  const rawServices = (businessConfig?.context_json as any)?.services || [];
  const formattedServices: ServiceItem[] | undefined = rawServices.length > 0
    ? rawServices.map((s: any, idx: number) => ({
        id: s.id || String(idx),
        name: s.name || 'Serviço',
        description: s.description || 'Descrição do serviço oferecido.',
        price: typeof s.price === 'string' ? parseFloat(s.price) : (s.price || 0),
        duration: typeof s.duration === 'string' ? parseInt(s.duration, 10) : (s.duration || 60),
        category: s.category || 'Serviços'
      }))
    : undefined;

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
          coverUrl="https://images.unsplash.com/photo-1607779097040-26e80aa78e66?auto=format&fit=crop&q=80&w=1200&h=400"
          location="Atendimento Domiciliar / Studio"
        />

        {/* Services List Section */}
        <StorefrontServices
          services={formattedServices}
          phone={phone}
          professionalName={displayName}
        />

        {/* Portfolio Section */}
        <StorefrontPortfolio />
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
