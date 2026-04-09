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
  CreditCard
} from 'lucide-react';
import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { createClient } from '../../../lib/supabase/client';
import { checkAccess, FEATURE_REQUIREMENTS } from '../../../lib/auth/access-control';
import { PlanTier } from '../../../lib/supabase/types';

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
      id: 'perfil',
      title: 'Perfil do estabelecimento',
      description: 'Dados básicos, endereço e horário de funcionamento.',
      icon: User,
      iconColor: 'text-blue-600',
      href: '/dashboard/settings/business',
      locked: false,
    },
    {
      id: 'integracoes',
      title: 'Integrações',
      description: 'Conecte seu Google Calendar.',
      image: '/assets/google-calendar-logo.svg',
      href: '/dashboard/settings/integrations',
      locked: false,
    },
    {
      id: 'pagamentos',
      title: 'Pagamentos',
      description: 'Configure seu Stripe ou Mercado Pago.',
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
      href: '#',
      locked: !checkAccess('ui', tier, FEATURE_REQUIREMENTS.WHATSAPP_CONNECT).granted,
    },
    {
      id: 'ai',
      title: 'Inteligência artificial',
      description: 'Treine o comportamento da sua IA.',
      icon: Bot,
      iconColor: 'text-indigo-600',
      href: '#',
      locked: !checkAccess('ui', tier, FEATURE_REQUIREMENTS.ELIZA_AGENT).granted,
    }
  ];
  return (
    <motion.div 
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="flex flex-col gap-3"
    >
      {SETTINGS_OPTIONS.map((option) => {
        const CardContent = (
          <div className={`
            group relative flex items-center gap-4 p-5 rounded-3xl border transition-all w-full
            ${option.locked 
              ? 'bg-gray-50/50 border-gray-200 opacity-60 cursor-not-allowed pointer-events-none' 
              : 'bg-white border-gray-200 hover:border-blue-200 hover:bg-gray-50 cursor-pointer shadow-sm'}
          `}>
            {/* Icon Wrapper */}
            <div className="w-12 h-12 flex items-center justify-center shrink-0">
              {option.image ? (
                <img src={option.image} alt={option.title} className="w-12 h-12 object-contain" />
              ) : option.icon ? (
                <option.icon size={48} className={option.iconColor} />
              ) : null}
            </div>

            {/* Text Content */}
            <div className="flex-1 min-w-0 pr-2">
              <h3 className="text-lg font-bold text-gray-900 leading-tight">
                {option.title}
              </h3>
              <p className="text-base font-medium text-gray-500 mt-0.5">
                {option.description}
              </p>
            </div>

            {/* Status Indicator */}
            <div className="flex items-center gap-3 shrink-0 ml-auto">
              {option.locked ? (
                <div className="flex items-center gap-2">
                  <span className="hidden xs:inline-block bg-purple-100 text-purple-700 text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-md">
                    {option.id === 'ai' ? 'Plano PRO' : 'Restrito'}
                  </span>
                  <Lock size={18} className="text-gray-400" />
                </div>
              ) : (
                <ChevronRight size={20} className="text-gray-300 group-hover:text-blue-500 transition-colors" />
              )}
            </div>
          </div>
        );

        if (option.locked) {
          return (
            <motion.div key={option.id} variants={itemVariants}>
              {CardContent}
            </motion.div>
          );
        }

        return (
          <motion.div key={option.id} variants={itemVariants}>
            <Link href={option.href}>
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
