import { createClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import { MapPin, MessageCircle, CalendarCheck, Sparkles } from 'lucide-react';
import Image from 'next/image';

// Next.js 15+ requires params to be a Promise
export default async function PublicBookingPage({ 
  params 
}: { 
  params: Promise<{ slug: string }> 
}) {
  const { slug } = await params;
  const supabase = await createClient();

  // 1. Fetch Profile by Slug
  const { data: profile } = await supabase
    .from('profiles')
    .select('id, full_name, slug, display_name, avatar_url, plan_tier')
    .eq('slug', slug)
    .single();

  if (!profile) {
    notFound(); // Triggers the default 404 page
  }

  // 2. Fetch Business Config for Instance Name and Extra info
  const { data: config } = await supabase
    .from('business_config')
    .select('instance_name, context_json')
    .eq('owner_id', profile.id)
    .single();

  const businessName = profile.display_name || profile.full_name || 'Profissional da Beleza';
  const instanceName = config?.instance_name;
  
  // Create WhatsApp booking link if an instance exists
  const whatsappUrl = instanceName 
    ? `https://wa.me/?text=${encodeURIComponent(`Olá, vim pelo seu link de agendamento (${slug}). Gostaria de marcar um horário!`)}`
    : '#';

  return (
    <div className="min-h-screen bg-[#fafafa] font-sans flex flex-col items-center justify-center p-4">
      {/* Premium Glassmorphism Card */}
      <div className="w-full max-w-sm bg-white rounded-[2.5rem] p-8 shadow-[0_8px_30px_rgb(0,0,0,0.06)] border border-gray-100 flex flex-col items-center text-center relative overflow-hidden animate-in fade-in slide-in-from-bottom-6 duration-700">
        
        {/* Decor Background Glow */}
        <div className="absolute -top-12 -right-12 w-32 h-32 bg-blue-500/10 rounded-full blur-3xl -z-10" />
        <div className="absolute -bottom-12 -left-12 w-32 h-32 bg-purple-500/10 rounded-full blur-3xl -z-10" />

        {/* Profile Avatar Avatar */}
        <div className="relative mb-6">
          <div className="w-24 h-24 rounded-full bg-gradient-to-tr from-blue-500 to-purple-500 p-1 shadow-lg shadow-purple-500/20 relative z-10">
            <div className="w-full h-full rounded-full bg-white border-[3px] border-white overflow-hidden flex items-center justify-center">
              {profile.avatar_url ? (
                <Image 
                  src={profile.avatar_url} 
                  alt={businessName} 
                  fill
                  className="object-cover"
                />
              ) : (
                <div className="w-full h-full bg-gray-50 flex items-center justify-center text-3xl font-black text-gray-300">
                  {businessName.charAt(0)}
                </div>
              )}
            </div>
          </div>
          {/* AI Badge */}
          {instanceName && (
            <div className="absolute -bottom-1 -right-1 bg-gray-900 border-2 border-white text-white w-8 h-8 rounded-full flex items-center justify-center shadow-md z-20" title="Atendimento Inteligente 24/7">
              <Sparkles size={14} className="text-amber-300" />
            </div>
          )}
        </div>

        {/* Studio Info */}
        <h1 className="text-2xl font-black text-gray-900 tracking-tight leading-tight mb-2">
          {businessName}
        </h1>
        <div className="flex items-center gap-1.5 text-xs font-bold text-gray-400 uppercase tracking-widest justify-center mb-8">
          <MapPin size={14} />
          Atendimento Exclusivo
        </div>

        {/* Feature List */}
        <div className="w-full space-y-3 mb-8 text-left">
          <div className="flex items-center gap-4 p-3.5 bg-gray-50 rounded-2xl border border-gray-100">
            <div className="bg-blue-100 text-blue-600 p-2 rounded-xl">
              <CalendarCheck size={18} />
            </div>
            <div>
              <p className="text-sm font-bold text-gray-900">Agendamento Online</p>
              <p className="text-[11px] font-bold text-gray-400">Verifique horários disponíveis</p>
            </div>
          </div>

          <div className="flex items-center gap-4 p-3.5 bg-gray-50 rounded-2xl border border-gray-100">
            <div className="bg-purple-100 text-purple-600 p-2 rounded-xl">
              <MessageCircle size={18} />
            </div>
            <div>
              <p className="text-sm font-bold text-gray-900">Atendimento 100% IA</p>
              <p className="text-[11px] font-bold text-gray-400">Respostas em tempo real 24/7</p>
            </div>
          </div>
        </div>

        {/* Booking CTA */}
        <a 
          href={whatsappUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="w-full relative h-14 bg-gray-900 text-white rounded-2xl text-base font-bold flex items-center justify-center gap-2 overflow-hidden group shadow-xl shadow-gray-900/20 transition-all hover:bg-gray-800 active:scale-95 border hover:border-gray-700"
        >
          <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:animate-shimmer" />
          <MessageCircle size={20} className="text-emerald-400 group-hover:scale-110 transition-transform" />
          Agendar via WhatsApp
        </a>

      </div>

      {/* Branded Footer */}
      <footer className="mt-8 text-center">
        <a href="https://meatende.ai" target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-2 text-xs font-bold text-gray-400 hover:text-gray-900 transition-colors uppercase tracking-widest">
          Powered by 
          <Image src="/assets/robot.png" alt="meatende.ai" width={16} height={16} className="opacity-70 group-hover:opacity-100" />
          meatende.ai
        </a>
      </footer>
    </div>
  );
}
