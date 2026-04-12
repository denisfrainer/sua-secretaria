'use client';

import Link from 'next/link';
import {
  User,
  Calendar,
  MessageSquare,
  Sparkles,
  ChevronRight,
  Lock,
  Bot,
  CreditCard,
  TrendingUp,
  Building2
} from 'lucide-react';
import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { hasAccess } from '@/lib/auth/access-control';
import { PlanTier } from '@/lib/supabase/types';

export default function SettingsHubPage() {
  const [tier, setTier] = useState<PlanTier>('STARTER');

  useEffect(() => {
    async function getTier() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        // Fetch from profile or business_config. 
        // We'll prioritize profiles as it's the standard for user-level tiers.
        const { data: profile } = await supabase
          .from('profiles')
          .select('plan_tier')
          .eq('id', user.id)
          .single();

        if (profile?.plan_tier) {
          setTier(profile.plan_tier as PlanTier);
        }
      }
    }
    getTier();
  }, []);

  const SETTINGS_OPTIONS = [
    {
      id: 'studio',
      title: 'Configurações do Estúdio',
      description: 'Catálogo de serviços, horários e regras da IA.',
      icon: Building2,
      iconColor: 'text-blue-600',
      href: '/dashboard/settings/studio',
      locked: false,
    },
    {
      id: 'integracoes',
      title: 'Integrações',
      description: 'Conecte Google Calendar e Sheets.',
      image: '/assets/google-calendar-logo.svg',
      href: '/dashboard/settings/integrations',
      locked: false,
    },
    {
      id: 'pagamentos',
      title: 'Pagamentos',
      description: 'Configure PIX Automático e faturamento.',
      icon: CreditCard,
      iconColor: 'text-emerald-600',
      href: '/dashboard/settings/payments',
      locked: false,
    },
    {
      id: 'whatsapp',
      title: 'Conexão WhatsApp',
      description: 'Vincule seu número para o agente.',
      image: '/assets/whatsapp.svg',
      href: '/dashboard/settings/whatsapp',
      locked: !hasAccess(tier, 'WHATSAPP_CONNECT'),
      requiredTier: 'PRO',
    },
    {
      id: 'ai',
      title: 'Personalidade da IA',
      description: 'Treine o comportamento da sua Eliza.',
      icon: Bot,
      iconColor: 'text-indigo-600',
      href: '/dashboard/settings/agents',
      locked: !hasAccess(tier, 'AI_CONFIGURATION'),
      requiredTier: 'PRO',
    },
    {
      id: 'elite-outbound',
      title: 'Ferramenta de Prospecção',
      description: 'Prospecte a sua base de clientes com mensagens personalizadas.',
      icon: TrendingUp,
      iconColor: 'text-rose-600',
      href: '/dashboard/settings/agents?tab=outbound',
      locked: !hasAccess(tier, 'WOLF_AGENT_OUTBOUND'),
      requiredTier: 'ELITE',
    }
  ];

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="flex flex-col gap-3"
    >
      <Link href="/dashboard/settings/profile">
        <div className="group relative flex items-center gap-4 p-5 rounded-3xl border border-gray-200 bg-white hover:border-blue-200 hover:bg-gray-50 cursor-pointer shadow-sm transition-all mb-4">
          <div className="w-12 h-12 flex items-center justify-center shrink-0">
            <User size={32} className="text-blue-600" />
          </div>
          <div className="flex-1 min-w-0 pr-2">
            <h3 className="text-lg font-bold text-gray-900 leading-tight">Perfil de Usuário</h3>
            <p className="text-base font-medium text-gray-500 mt-0.5">Sua identidade, foto e troca de senha.</p>
          </div>
          <ChevronRight size={20} className="text-gray-300 group-hover:text-blue-500 transition-colors" />
        </div>
      </Link>

      {SETTINGS_OPTIONS.map((option) => {
        // Funnel Logic: If locked, everything redirects to payments/billing
        const destination = option.locked ? '/dashboard/settings/payments' : option.href;

        const CardContent = (
          <div className={`
            group relative flex items-center gap-4 p-5 rounded-3xl border transition-all w-full
            ${option.locked
              ? 'bg-gray-50/50 border-gray-200 opacity-60 cursor-pointer'
              : 'bg-white border-gray-200 hover:border-blue-200 hover:bg-gray-50 cursor-pointer shadow-sm'}
          `}>
            {/* Icon Wrapper */}
            <div className="w-12 h-12 flex items-center justify-center shrink-0">
              {option.image ? (
                <img src={option.image} alt={option.title} className="w-12 h-12 object-contain" />
              ) : option.icon ? (
                <option.icon size={32} className={option.iconColor} />
              ) : null}
            </div>

            {/* Text Content */}
            <div className={`flex-1 min-w-0 pr-2 ${option.locked ? 'pointer-events-none' : ''}`}>
              <h3 className="text-lg font-bold text-gray-900 leading-tight">
                {option.title}
              </h3>
              <p className="text-base font-medium text-gray-500 mt-0.5 whitespace-normal">
                {option.description}
              </p>
            </div>

            {/* Status Indicator */}
            <div className="flex items-center gap-3 shrink-0 ml-auto">
              {option.locked ? (
                <div className="flex items-center gap-2">
                  <span className="hidden xs:inline-block bg-purple-100 text-purple-700 text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-md whitespace-nowrap">
                    {option.requiredTier === 'ELITE' ? 'Plano ELITE' : 'Plano PRO'}
                  </span>
                  <Lock size={18} className="text-gray-400" />
                </div>
              ) : (
                <ChevronRight size={20} className="text-gray-300 group-hover:text-blue-500 transition-colors" />
              )}
            </div>
          </div>
        );

        return (
          <motion.div key={option.id} variants={itemVariants}>
            <Link href={destination}>
              {CardContent}
            </Link>
          </motion.div>
        );
      })}
    </motion.div>
  );
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 }
};
