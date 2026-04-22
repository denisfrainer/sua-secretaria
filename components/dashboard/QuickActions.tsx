'use client';

import { useEffect, useState } from 'react';
import { Calendar, Link as LinkIcon, Settings, Link2, Check, MessageSquare, Bot, Sparkles, CreditCard } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { motion, AnimatePresence } from 'framer-motion';

interface QuickActionsProps {
  planTier?: string;
  trialEndsAt?: string;
}

const planStatusMap: Record<string, string> = {
  'FREE': 'Gratuito',
  'TRIAL': 'Teste',
  'ACTIVE': 'Ativo',
  'PAST_DUE': 'Pendente',
  'CANCELED': 'Cancelado',
  'PAUSED': 'Pausado',
  'trial': 'Teste',
  'free': 'Gratuito',
  'pro': 'Profissional',
  'PRO': 'Profissional'
};

export default function QuickActions({ planTier, trialEndsAt }: QuickActionsProps) {
  const router = useRouter();
  const supabase = createClient();
  const [userId, setUserId] = useState<string | null>(null);
  const [slug, setSlug] = useState<string | null>(null);
  const [showToast, setShowToast] = useState(false);

  // Calculate Trial Days Left
  const getTrialStatus = () => {
    const rawTier = planTier?.toUpperCase() || 'FREE';
    const localizedTier = planStatusMap[rawTier] || planStatusMap[planTier || 'free'] || planTier || 'Gratuito';

    if (planTier && planTier !== 'trial' && planTier !== 'free') {
      return { label: 'Plano Ativo', value: localizedTier };
    }
    
    if (!trialEndsAt) return { label: 'Plano', value: localizedTier };

    const end = new Date(trialEndsAt);
    const now = new Date();
    const diff = end.getTime() - now.getTime();
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));

    if (days <= 0) return { label: 'Trial', value: 'Expirado' };
    return { label: 'Trial', value: `${days} ${days === 1 ? 'dia' : 'dias'} restantes` };
  };

  const trialStatus = getTrialStatus();

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setUserId(session.user.id);

        const { data: profile } = await supabase
          .from('profiles')
          .select('slug, phone')
          .eq('id', session.user.id)
          .single();

        if (profile?.slug) {
          setSlug(profile.slug);
        } else if (profile?.phone) {
          setSlug(profile.phone);
        }
      }
    };
    fetchUser();
  }, [supabase]);

  const copyToClipboard = async () => {
    if (!userId) return;

    const baseUrl = window.location.origin;
    // Updated to ROOT level slug
    const bookingUrl = slug
      ? `${baseUrl}/${slug}`
      : `${baseUrl}/${userId}`;

    try {
      await navigator.clipboard.writeText(bookingUrl);
      setShowToast(true);
      setTimeout(() => setShowToast(false), 3000);
      console.log('[CLIPBOARD] Link copied:', bookingUrl);
    } catch (err) {
      console.error('[CLIPBOARD] Failed to copy:', err);
    }
  };

  const actions = [
    {
      title: 'Agenda',
      icon: <Calendar className="w-5 h-5" />,
      colorClass: 'text-blue-600 bg-blue-50 ring-blue-100',
      action: () => router.push('/dashboard/agenda'),
    },
    {
      title: 'Link de agendamento',
      icon: <Link2 className="w-5 h-5" />,
      colorClass: 'text-rose-600 bg-rose-50 ring-rose-100',
      action: () => router.push('/dashboard/settings/booking-link'),
    },
    {
      title: 'Cadastro da profissional',
      icon: <MessageSquare className="w-5 h-5" />,
      colorClass: 'text-indigo-600 bg-indigo-50 ring-indigo-100',
      action: () => router.push('/dashboard/settings/studio'),
    },
    {
      title: 'Conexões',
      icon: <LinkIcon className="w-5 h-5" />,
      colorClass: 'text-orange-600 bg-orange-50 ring-orange-100',
      action: () => router.push('/dashboard/settings/integrations'),
    },
    {
      title: 'Robô de menu',
      icon: <Bot className="w-5 h-5" />,
      colorClass: 'text-purple-600 bg-purple-50 ring-purple-100',
      action: () => router.push('/dashboard/settings/whatsapp'),
    },
    {
      title: 'Agente IA',
      icon: <Sparkles className="w-5 h-5" />,
      colorClass: 'text-fuchsia-600 bg-fuchsia-50 ring-fuchsia-100',
      action: () => router.push('/dashboard/settings/agents'),
    },
    {
      title: 'Planos',
      icon: <CreditCard className="w-5 h-5" />,
      colorClass: 'text-emerald-600 bg-emerald-50 ring-emerald-100',
      action: () => router.push('/dashboard/settings/payments'),
    },
  ];

  return (
    <div className="relative space-y-8">
      {/* SECTION 1: BUSINESS & SCHEDULING */}
      <div className="grid grid-cols-2 gap-3">
        {actions.slice(0, 4).map((item, index) => (
          <motion.button
            key={index}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              duration: 0.3,
              ease: [0.25, 0.1, 0.25, 1],
              delay: 0.05 * index
            }}
            onClick={item.action}
            className="flex flex-col items-start p-4 w-full bg-white border border-gray-100 rounded-2xl shadow-[0_2px_8px_rgba(0,0,0,0.04)] hover:shadow-sm hover:border-gray-200 active:scale-[0.98] transition-all duration-200 group text-left"
          >
            <div
              className={`p-2.5 rounded-xl mb-3 ring-1 ring-inset transition-colors duration-200 ${item.colorClass}`}
            >
              {item.icon}
            </div>

            <span className="font-bold text-gray-950 text-base tracking-tight">
              {item.title}
            </span>
          </motion.button>
        ))}
      </div>

      {/* SECTION 2: WHATSAPP AUTOMATION */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-2 px-1">
          <div className="w-1 h-4 bg-purple-600 rounded-full" />
          <h2 className="text-sm font-black uppercase tracking-widest text-gray-400">Automação de WhatsApp</h2>
        </div>
        
        <div className="grid grid-cols-2 gap-3">
          {actions.slice(4, 6).map((item, index) => (
            <motion.button
              key={index + 4}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                duration: 0.3,
                ease: [0.25, 0.1, 0.25, 1],
                delay: 0.05 * (index + 4)
              }}
              onClick={item.action}
              className="flex flex-col items-start p-4 w-full bg-white border border-gray-100 rounded-2xl shadow-[0_2px_8px_rgba(0,0,0,0.04)] hover:shadow-sm hover:border-gray-200 active:scale-[0.98] transition-all duration-200 group text-left"
            >
              <div
                className={`p-2.5 rounded-xl mb-3 ring-1 ring-inset transition-colors duration-200 ${item.colorClass}`}
              >
                {item.icon}
              </div>

              <span className="font-bold text-gray-950 text-base tracking-tight">
                {item.title}
              </span>
            </motion.button>
          ))}
        </div>
      </div>

      {/* SECTION 3: SUBSCRIPTION */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-2 px-1">
          <div className="w-1 h-4 bg-emerald-600 rounded-full" />
          <h2 className="text-sm font-black uppercase tracking-widest text-gray-400">Planos de assinatura</h2>
        </div>
        
        <div className="grid grid-cols-2 gap-3">
          {actions.slice(6).map((item, index) => (
            <motion.button
              key={index + 6}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                duration: 0.3,
                ease: [0.25, 0.1, 0.25, 1],
                delay: 0.05 * (index + 6)
              }}
              onClick={item.action}
              className="flex flex-col items-start p-4 w-full bg-white border border-gray-100 rounded-2xl shadow-[0_2px_8px_rgba(0,0,0,0.04)] hover:shadow-sm hover:border-gray-200 active:scale-[0.98] transition-all duration-200 group text-left"
            >
              <div
                className={`p-2.5 rounded-xl mb-3 ring-1 ring-inset transition-colors duration-200 ${item.colorClass}`}
              >
                {item.icon}
              </div>

              <span className="font-bold text-gray-950 text-base tracking-tight">
                {item.title}
              </span>
            </motion.button>
          ))}

          {/* DYNAMIC PLAN STATUS CARD */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              duration: 0.3,
              ease: [0.25, 0.1, 0.25, 1],
              delay: 0.05 * 7
            }}
            className="flex flex-col items-start p-4 w-full bg-emerald-50/30 border border-emerald-100 rounded-2xl shadow-sm group text-left"
          >
            <div
              className="p-2.5 rounded-xl mb-2.5 bg-emerald-500 text-white shadow-sm shadow-emerald-500/20"
            >
              <Check className="w-5 h-5" strokeWidth={3} />
            </div>

            <div className="flex flex-col">
              <span className="text-[10px] font-black uppercase tracking-widest text-emerald-600/60 mb-0.5">
                {trialStatus.label}
              </span>
              <span className="font-bold text-gray-950 text-sm tracking-tight leading-tight">
                {trialStatus.value}
              </span>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Elegant Framer Motion Toast */}
      <AnimatePresence>
        {showToast && (
          <motion.div
            initial={{ opacity: 0, y: 20, x: '-50%', scale: 0.95 }}
            animate={{ opacity: 1, y: 0, x: '-50%', scale: 1 }}
            exit={{ opacity: 0, y: 10, x: '-50%', scale: 0.95 }}
            className="fixed bottom-10 left-1/2 z-50 flex items-center gap-2 px-5 py-3 bg-white text-gray-900 rounded-full shadow-[0_8px_30px_rgb(0,0,0,0.12)] border border-gray-100"
          >
            <Check size={16} className="text-green-500" />
            <span className="text-sm font-medium tracking-tight">Link copiado!</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
