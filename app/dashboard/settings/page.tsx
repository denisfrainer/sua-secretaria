'use client';

import Link from 'next/link';
import { 
  User, 
  Calendar, 
  MessageSquare, 
  Sparkles, 
  ChevronRight,
  Lock,
  Bot
} from 'lucide-react';
import { motion } from 'framer-motion';

const SETTINGS_OPTIONS = [
  {
    id: 'perfil',
    title: 'Perfil do estabelecimento',
    description: 'Dados básicos, endereço e horário de funcionamento.',
    icon: User,
    iconColor: 'text-blue-600',
    iconBg: 'bg-blue-50',
    href: '/dashboard/settings/business',
    locked: false,
  },
  {
    id: 'integracoes',
    title: 'Integrações',
    description: 'Conecte seu Google Calendar.',
    image: '/assets/google-calendar-logo.svg',
    iconBg: 'bg-white border border-gray-200',
    href: '/dashboard/settings/integrations',
    locked: false,
  },
  {
    id: 'whatsapp',
    title: 'Conexão WhatsApp',
    description: 'Vincule seu número para o agente de IA responder.',
    image: '/assets/whatsapp.svg',
    iconBg: 'bg-gray-50',
    href: '#',
    locked: true,
  },
  {
    id: 'ai',
    title: 'Inteligência artificial',
    description: 'Treine o comportamento e as regras da sua IA.',
    icon: Bot,
    iconColor: 'text-gray-400',
    iconBg: 'bg-gray-50',
    href: '#',
    locked: true,
  }
];

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

export default function SettingsHubPage() {
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
            group relative flex items-center gap-4 p-6 rounded-2xl border transition-all w-full
            ${option.locked 
              ? 'bg-gray-50/50 border-gray-200 opacity-60 cursor-not-allowed pointer-events-none' 
              : 'bg-white border-gray-200 hover:border-blue-200 hover:bg-gray-50 cursor-pointer shadow-sm'}
          `}>
            {/* Icon Wrapper */}
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 overflow-hidden ${option.iconBg} ${(option.locked && option.image) ? 'grayscale' : ''}`}>
              {option.image ? (
                <img src={option.image} alt={option.title} className="w-6 h-6 object-contain" />
              ) : option.icon ? (
                <option.icon size={22} className={option.iconColor} />
              ) : null}
            </div>

            {/* Text Content */}
            <div className="flex-1 min-w-0">
              <h3 className="text-base font-semibold text-gray-900 leading-tight">
                {option.title}
              </h3>
              <p className="text-sm text-gray-500 mt-1 line-clamp-1">
                {option.description}
              </p>
            </div>

            {/* Status Indicator */}
            <div className="flex items-center gap-3 shrink-0">
              {option.locked ? (
                <div className="flex items-center gap-2">
                  <span className="bg-purple-100 text-purple-700 text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-md">
                    Plano IA
                  </span>
                  <Lock size={14} className="text-gray-400" />
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
