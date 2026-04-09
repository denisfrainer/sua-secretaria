'use client';

import React from 'react';
import { 
  MessageCircle, 
  Link as LinkIcon, 
  Sparkles, 
  Users, 
  Zap, 
  Bot, 
  Headset, 
  CheckCircle2,
  Lock,
  ArrowRight,
  ShieldCheck,
  CreditCard
} from 'lucide-react';
import { motion, Variants } from 'framer-motion';

const PLANOS = [
  {
    level: 1,
    name: 'Digital',
    tagline: 'Presença básica automatizada',
    icon: MessageCircle,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-100',
    features: [
      { text: 'Bot menu interativo', icon: MessageCircle },
      { text: 'Agendamento manual com link', icon: LinkIcon },
    ],
    buttonText: 'Começar com Digital',
    popular: false,
  },
  {
    level: 2,
    name: 'Profissional',
    tagline: 'O poder da IA no seu atendimento',
    icon: Sparkles,
    color: 'text-purple-600',
    bgColor: 'bg-purple-50',
    borderColor: 'border-purple-100',
    features: [
      { text: 'Agente de IA (Eliza)', icon: Sparkles },
      { text: 'Atendimento humanizado', icon: Users },
      { text: 'Agendamento automático', icon: Zap },
    ],
    buttonText: 'Evoluir para Profissional',
    popular: true,
  },
  {
    level: 3,
    name: 'Elite',
    tagline: 'Gestão total e personalizada',
    icon: Bot,
    color: 'text-emerald-600',
    bgColor: 'bg-emerald-50',
    borderColor: 'border-emerald-100',
    features: [
      { text: 'IA personalizada com seu negócio', icon: Bot },
      { text: 'Suporte prioritário 24/7', icon: Headset },
      { text: 'Identificação de pagamentos', icon: CheckCircle2 },
      { text: 'Confirmação automática', icon: ShieldCheck },
    ],
    buttonText: 'Seja Elite',
    popular: false,
  }
];

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.15
    }
  }
};

const cardVariants: Variants = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' } }
};

export default function PaymentsPricingPage() {
  return (
    <div className="flex flex-col gap-10 pb-32">
      {/* Page header is handled by layout.tsx, but we can add a secondary header here if needed */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600 border border-emerald-100 shadow-sm">
            <CreditCard size={20} />
          </div>
          <h2 className="text-2xl font-black text-gray-950 tracking-tight">Planos de Serviço</h2>
        </div>
        <p className="text-base font-medium text-gray-500 max-w-lg">
          Escolha o nível de automação ideal para escala do seu estabelecimento.
        </p>
      </div>

      <motion.div 
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="grid grid-cols-1 gap-6"
      >
        {PLANOS.map((plano) => (
          <motion.div
            key={plano.level}
            variants={cardVariants}
            className={`
              relative flex flex-col gap-8 p-8 md:p-10 rounded-[2.5rem] border transition-all overflow-hidden group
              ${plano.popular ? 'bg-white border-purple-200 shadow-xl shadow-purple-500/5 ring-1 ring-purple-100' : 'bg-white border-black/5 shadow-sm hover:shadow-md'}
            `}
          >
            {plano.popular && (
              <div className="absolute top-6 right-6">
                <span className="bg-purple-600 text-white text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full shadow-lg shadow-purple-500/20">
                  Mais Popular
                </span>
              </div>
            )}

            <div className="flex flex-col md:flex-row items-center md:items-start gap-6">
              <div className={`w-16 h-16 rounded-2xl ${plano.bgColor} ${plano.color} flex items-center justify-center shrink-0 border ${plano.borderColor} shadow-inner`}>
                <plano.icon size={32} />
              </div>
              <div className="flex flex-col text-center md:text-left">
                <div className="flex items-center justify-center md:justify-start gap-2">
                  <span className="text-xs font-black uppercase tracking-widest text-gray-400">Nível {plano.level}</span>
                </div>
                <h3 className="text-2xl font-black text-gray-950 tracking-tight mt-1">{plano.name}</h3>
                <p className="text-base font-medium text-gray-500 mt-1">{plano.tagline}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4">
              {plano.features.map((feature, idx) => (
                <div key={idx} className="flex items-center gap-3 text-gray-700 bg-gray-50/50 p-4 rounded-2xl border border-black/[0.03]">
                  <div className={`shrink-0 ${plano.color}`}>
                    <feature.icon size={20} />
                  </div>
                  <span className="text-[16px] font-bold tracking-tight">{feature.text}</span>
                </div>
              ))}
            </div>

            <button className={`
              w-full h-16 rounded-2xl font-black text-lg flex items-center justify-center gap-3 transition-all active:scale-[0.98]
              ${plano.popular 
                ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/20 hover:bg-purple-700 hover:shadow-purple-500/30' 
                : 'bg-gray-950 text-white hover:bg-black shadow-lg shadow-black/10'}
            `}>
              {plano.buttonText}
              <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
            </button>

            {/* Subtle Decor */}
            <div className={`absolute -bottom-10 -right-10 w-40 h-40 ${plano.bgColor} rounded-full blur-3xl opacity-50 -z-10 group-hover:opacity-100 transition-opacity duration-700`} />
          </motion.div>
        ))}
      </motion.div>
    </div>
  );
}
