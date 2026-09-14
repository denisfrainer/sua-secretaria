import React from 'react';
import { notFound } from 'next/navigation';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { RouletteWheel } from '@/components/storefront/RouletteWheel';
import { Sparkles, ShieldCheck, Gift, Clock, Smartphone, MessageCircle } from 'lucide-react';
import type { Tenant, Premio } from '@/lib/supabase/types';

export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

/**
 * PUBLIC TENANT PROMOTIONAL ROULETTE PAGE
 * Dynamic route: /[slug] (e.g. roletavantajosa.com/padaria-central)
 */
export default async function PublicRoulettePage({
  params
}: {
  params: Promise<{ slug: string }>;
}) {
  const resolvedParams = await params;
  const rawSlug = resolvedParams?.slug;

  if (!rawSlug || rawSlug === 'undefined') {
    notFound();
  }

  const decodedSlug = decodeURIComponent(rawSlug).trim().toLowerCase();

  if (!supabaseAdmin) {
    console.error('❌ [PUBLIC_ROULETTE] Supabase Admin client not configured.');
    return (
      <div className="min-h-screen flex items-center justify-center p-6 text-center text-red-600 font-bold">
        Erro de conexão com o banco de dados.
      </div>
    );
  }

  // 1. Fetch Tenant Record by Slug
  let { data: tenant, error: tenantError } = await supabaseAdmin
    .from('tenants')
    .select('*')
    .eq('slug', decodedSlug)
    .eq('is_active', true)
    .maybeSingle();

  // Fallback 1: UUID match
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!tenant && uuidRegex.test(decodedSlug)) {
    const { data: tenantById } = await supabaseAdmin
      .from('tenants')
      .select('*')
      .eq('id', decodedSlug)
      .eq('is_active', true)
      .maybeSingle();
    tenant = tenantById;
  }

  // Fallback 2: WhatsApp Phone match
  if (!tenant) {
    const potentialPhone = decodedSlug.replace(/\D/g, '');
    if (potentialPhone.length >= 10) {
      const { data: tenantByPhone } = await supabaseAdmin
        .from('tenants')
        .select('*')
        .eq('whatsapp', potentialPhone)
        .eq('is_active', true)
        .maybeSingle();
      tenant = tenantByPhone;
    }
  }

  // Fallback 3: Check legacy profiles/vitrine_profiles and on-the-fly provision
  if (!tenant) {
    const { data: legacyProfile } = await supabaseAdmin
      .from('profiles')
      .select('id, full_name, display_name, slug, avatar_url')
      .eq('slug', decodedSlug)
      .maybeSingle();

    if (legacyProfile) {
      const { data: provisionedTenant } = await supabaseAdmin
        .from('tenants')
        .insert({
          id: legacyProfile.id,
          name: legacyProfile.display_name || legacyProfile.full_name || 'Meu Estabelecimento',
          slug: legacyProfile.slug || decodedSlug,
          whatsapp: '5500000000000',
          logo_url: legacyProfile.avatar_url,
          primary_color: '#f43f5e',
          secondary_color: '#fda4af',
          background_color: '#fffbfb',
          cooldown_hours: 24,
          plan_tier: 'STARTER',
          is_active: true
        })
        .select()
        .single();

      tenant = provisionedTenant;
    }
  }

  // If still not found, return 404
  if (!tenant) {
    notFound();
  }

  // 2. Fetch Active Prizes for this Tenant
  const { data: dbPremios, error: premiosError } = await supabaseAdmin
    .from('premios')
    .select('*')
    .eq('tenant_id', tenant.id)
    .eq('is_active', true)
    .order('created_at', { ascending: true });

  if (premiosError) {
    console.warn('⚠️ [PUBLIC_ROULETTE] Warning fetching premios:', premiosError.message);
  }

  // Fallback starter slices if merchant hasn't configured custom prizes yet
  const activePremios = (dbPremios && dbPremios.length > 0) ? dbPremios : [
    { id: '1', title: '10% de Desconto', color_hex: tenant.primary_color || '#f43f5e', text_color_hex: '#ffffff', probability_weight: 40 },
    { id: '2', title: 'Brinde Especial', color_hex: '#ec4899', text_color_hex: '#ffffff', probability_weight: 20 },
    { id: '3', title: 'Tente Novamente', color_hex: '#64748b', text_color_hex: '#ffffff', probability_weight: 20, is_losing_slice: true },
    { id: '4', title: '15% OFF Próxima Compra', color_hex: '#8b5cf6', text_color_hex: '#ffffff', probability_weight: 20 },
  ];

  const primaryColor = tenant.primary_color || '#f43f5e';
  const secondaryColor = tenant.secondary_color || '#fda4af';
  const backgroundColor = tenant.background_color || '#FFFBFB';
  const storeName = tenant.name || 'Estabelecimento Parceiro';
  const whatsapp = tenant.whatsapp || '5500000000000';

  return (
    <div
      style={{ backgroundColor }}
      className="min-h-screen text-slate-800 font-sans selection:bg-rose-200 selection:text-rose-900 scroll-smooth flex flex-col relative overflow-x-hidden"
    >
      {/* Dynamic Ambient Background Accents */}
      <div
        style={{ backgroundColor: primaryColor }}
        className="absolute -top-32 left-1/2 -translate-x-1/2 w-[600px] h-[350px] rounded-full blur-[130px] opacity-15 pointer-events-none -z-10"
      />

      {/* Top Header */}
      <header className="w-full bg-white/80 backdrop-blur-md border-b border-slate-200/50 sticky top-0 z-40 shadow-xs">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {tenant.logo_url ? (
              <img
                src={tenant.logo_url}
                alt={storeName}
                className="w-9 h-9 rounded-xl object-cover border border-slate-200/80 shadow-xs"
              />
            ) : (
              <div
                style={{ backgroundColor: primaryColor }}
                className="w-9 h-9 rounded-xl flex items-center justify-center text-white font-black text-sm shadow-xs"
              >
                {storeName.slice(0, 1).toUpperCase()}
              </div>
            )}

            <div className="flex flex-col">
              <span className="text-sm font-black text-slate-800 tracking-tight leading-tight">
                {storeName}
              </span>
              <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1 uppercase tracking-wider">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse inline-block" />
                Roleta Oficial de Prêmios
              </span>
            </div>
          </div>

          {/* Direct WhatsApp Contact button */}
          {whatsapp && whatsapp !== '5500000000000' && (
            <a
              href={`https://wa.me/${whatsapp}?text=${encodeURIComponent(
                `Olá! Acessei a página da roleta de *${storeName}* e gostaria de tirar uma dúvida.`
              )}`}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
            >
              <MessageCircle size={14} />
              <span className="hidden sm:inline">WhatsApp</span>
            </a>
          )}
        </div>
      </header>

      {/* Main Centerpiece Area */}
      <main className="flex-1 w-full max-w-4xl mx-auto px-4 sm:px-6 pt-8 pb-20 flex flex-col items-center">
        {/* Hero Title & Motivation */}
        <div className="text-center max-w-xl mb-6">
          <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-white/90 border border-slate-200/80 shadow-2xs text-[11px] font-black text-slate-700 uppercase tracking-wider mb-3">
            <Sparkles size={13} style={{ color: primaryColor }} />
            <span>Rodada Promocional</span>
          </div>

          <h1 className="text-3xl sm:text-4xl md:text-5xl font-black text-slate-900 tracking-tight leading-tight">
            Gire & Ganhe Descontos Exclusivos!
          </h1>

          <p className="text-xs sm:text-sm text-slate-500 font-medium mt-2 leading-relaxed">
            Participe do sorteio oficial no espaço <strong className="text-slate-800">{storeName}</strong>. Digite seu WhatsApp abaixo para girar e resgatar seu cupom na hora!
          </p>
        </div>

        {/* Centerpiece Wheel Experience */}
        <div className="w-full bg-white/80 backdrop-blur-md rounded-3xl p-6 sm:p-10 border border-slate-200/70 shadow-xl relative my-2">
          <RouletteWheel
            tenantId={tenant.id}
            storeName={storeName}
            whatsappPhone={whatsapp}
            premios={activePremios}
            primaryColor={primaryColor}
            secondaryColor={secondaryColor}
          />
        </div>

        {/* 3-Step Trust & Explanation Section */}
        <div className="w-full mt-14 grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-5 rounded-2xl bg-white border border-slate-200/60 shadow-xs flex flex-col items-center text-center">
            <div
              style={{ backgroundColor: `${primaryColor}15`, color: primaryColor }}
              className="w-12 h-12 rounded-2xl flex items-center justify-center mb-3"
            >
              <Smartphone size={22} />
            </div>
            <h4 className="text-sm font-black text-slate-800">1. Digite seu WhatsApp</h4>
            <p className="text-xs text-slate-500 font-medium mt-1 leading-relaxed">
              Identificação rápida e segura para registrar seu cupom de premiação.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-white border border-slate-200/60 shadow-xs flex flex-col items-center text-center">
            <div
              style={{ backgroundColor: `${primaryColor}15`, color: primaryColor }}
              className="w-12 h-12 rounded-2xl flex items-center justify-center mb-3"
            >
              <Gift size={22} />
            </div>
            <h4 className="text-sm font-black text-slate-800">2. Gire a Roleta</h4>
            <p className="text-xs text-slate-500 font-medium mt-1 leading-relaxed">
              Sorteio auditado pelo servidor com chances reais e prêmios imediatos.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-white border border-slate-200/60 shadow-xs flex flex-col items-center text-center">
            <div
              style={{ backgroundColor: `${primaryColor}15`, color: primaryColor }}
              className="w-12 h-12 rounded-2xl flex items-center justify-center mb-3"
            >
              <ShieldCheck size={22} />
            </div>
            <h4 className="text-sm font-black text-slate-800">3. Resgate seu Cupom</h4>
            <p className="text-xs text-slate-500 font-medium mt-1 leading-relaxed">
              Apresente o código único no balcão ou envie direto pelo WhatsApp oficial.
            </p>
          </div>
        </div>

        {/* Security & Anti-Fraud Footer Notice */}
        <div className="w-full mt-10 p-4 rounded-2xl bg-slate-50/70 border border-slate-200/50 flex flex-wrap items-center justify-center gap-6 text-[11px] font-bold text-slate-400">
          <span className="flex items-center gap-1.5">
            <ShieldCheck size={14} className="text-emerald-500" />
            Cupom autenticado com código digital único
          </span>
          <span className="flex items-center gap-1.5">
            <Clock size={14} className="text-slate-400" />
            Válido por 7 dias a partir do giro
          </span>
          <span className="flex items-center gap-1.5">
            🔒 Sorteio antifraude auditado
          </span>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full bg-white/70 border-t border-slate-200/50 py-8 text-center text-slate-400 text-xs">
        <div className="max-w-4xl mx-auto px-4 flex flex-col items-center gap-2">
          <p className="font-black text-slate-700 tracking-tight">{storeName}</p>
          <p className="text-[11px] text-slate-400">
            © {new Date().getFullYear()} Todos os direitos reservados • Roleta Promocional Oficial
          </p>
          <p className="text-[10px] text-slate-300 font-bold uppercase tracking-widest mt-1">
            Tecnologia Roleta Vantajosa
          </p>
        </div>
      </footer>
    </div>
  );
}
