'use client';

import Link from 'next/link';
import { 
  User, 
  ChevronRight,
  Lock,
  Bot,
  Bell,
  CreditCard,
  Search
} from 'lucide-react';
import { motion } from 'framer-motion';

const SETTINGS_OPTIONS = [
  {
    id: 'perfil',
    title: 'Perfil do Usuário',
    description: 'Seu nome e e-mail de acesso.',
    icon: User,
    iconColor: 'bg-blue-500',
    href: '/dashboard/settings/business',
    locked: false,
  },
  {
    id: 'notificacoes',
    title: 'Notificações',
    description: 'Envie lembretes automáticos.',
    icon: Bell,
    iconColor: 'bg-red-500',
    href: '#',
    locked: false,
  },
  {
    id: 'pagamento',
    title: 'Pagamento',
    description: 'Gerencie sua assinatura e faturas.',
    icon: CreditCard,
    iconColor: 'bg-green-500',
    href: '/dashboard/settings/payments',
    locked: false,
  },
  {
    id: 'whatsapp',
    title: 'Conexão WhatsApp',
    description: 'Envie lembretes automáticos via WhatsApp.',
    image: '/assets/whatsapp.svg',
    iconColor: 'bg-emerald-500',
    href: '#',
    locked: true,
  },
  {
    id: 'ai',
    title: 'Inteligência Artificial (Wolf Agent)',
    description: 'Reativação inteligente de clientes antigos.',
    icon: Bot,
    iconColor: 'bg-indigo-500',
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
  hidden: { opacity: 0, y: 15 },
  visible: { opacity: 1, y: 0 }
};

export default function SettingsHubPage() {
  return (
    <div className="flex flex-col gap-6">
      {/* iOS Large Title */}
      <div className="pt-4 pb-2">
        <h1 className="text-[34px] font-bold text-black tracking-tight">Configurações</h1>
      </div>

      {/* iOS Search Bar */}
      <div className="relative group">
        <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
          <Search size={18} className="text-gray-400 group-focus-within:text-gray-600" />
        </div>
        <input
          type="text"
          placeholder="Buscar"
          className="w-full bg-gray-200/60 border-none rounded-xl py-2.5 pl-10 pr-4 text-gray-900 placeholder-gray-500 focus:ring-0 focus:bg-gray-200 transition-all text-base"
        />
      </div>

      <motion.div 
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="flex flex-col gap-3"
      >
        {SETTINGS_OPTIONS.map((option) => {
          const CardContent = (
            <div className={`
              group relative flex items-center gap-4 p-4 rounded-2xl transition-all w-full
              ${option.locked 
                ? 'bg-[#E5E5EA] border-transparent opacity-100 cursor-not-allowed' 
                : 'bg-white border-transparent hover:bg-gray-50 active:scale-98 shadow-sm'}
            `}>
              {/* Icon Wrapper */}
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${option.locked ? 'bg-gray-300' : option.iconColor}`}>
                {option.image ? (
                  <img src={option.image} alt={option.title} className={`w-6 h-6 object-contain ${option.locked ? 'grayscale brightness-50' : 'brightness-0 invert'}`} />
                ) : option.icon ? (
                  <option.icon size={22} className="text-white" />
                ) : null}
              </div>

              {/* Text Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className={`text-base font-semibold leading-tight ${option.locked ? 'text-gray-600' : 'text-gray-900'}`}>
                    {option.title}
                  </h3>
                  {option.locked && <Lock size={14} className="text-gray-400" />}
                </div>
                <p className={`text-sm mt-0.5 line-clamp-1 ${option.locked ? 'text-gray-500' : 'text-gray-500'}`}>
                  {option.description}
                </p>
              </div>

              {/* Status Indicator */}
              <div className="flex items-center gap-2 shrink-0">
                {option.locked ? (
                  <span className="bg-black text-white text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-md">
                    Plano IA
                  </span>
                ) : (
                  <ChevronRight size={20} className="text-gray-300" />
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
    </div>
  );
}
