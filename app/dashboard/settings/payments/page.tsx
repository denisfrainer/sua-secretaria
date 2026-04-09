'use client';

import React, { useState } from 'react';
import { 
  MessageCircle, 
  Sparkles, 
  Bot, 
  Check,
  CreditCard
} from 'lucide-react';
import { motion, Variants } from 'framer-motion';

const PLANOS = [
  {
    id: 'digital',
    level: 1,
    name: 'Digital',
    description: 'Bot menu e agendamento manual.',
    icon: MessageCircle,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
  },
  {
    id: 'profissional',
    level: 2,
    name: 'Profissional',
    description: 'IA Eliza e agendamento automático.',
    icon: Sparkles,
    color: 'text-purple-600',
    bgColor: 'bg-purple-50',
  },
  {
    id: 'elite',
    level: 3,
    name: 'Elite',
    description: 'Customização total e financeiro.',
    icon: Bot,
    color: 'text-emerald-600',
    bgColor: 'bg-emerald-50',
  }
];

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  }
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0 }
};

export default function PaymentsPricingPage() {
  const [selectedPlan, setSelectedPlan] = useState('profissional');

  return (
    <div className="flex flex-col gap-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
      {/* Header Section */}
      <div className="flex flex-col gap-1 px-1">
        <h2 className="text-2xl font-black text-gray-950 tracking-tight">Planos de Serviço</h2>
        <p className="text-base font-medium text-gray-500">
          Selecione o nível de automação para seu negócio.
        </p>
      </div>

      {/* Pricing Cards List */}
      <motion.div 
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="flex flex-col gap-3"
      >
        {PLANOS.map((plano) => {
          const isSelected = selectedPlan === plano.id;
          
          return (
            <motion.div
              key={plano.id}
              variants={itemVariants}
              onClick={() => setSelectedPlan(plano.id)}
              className={`
                group relative flex items-center gap-4 p-5 rounded-3xl border transition-all w-full cursor-pointer
                ${isSelected 
                  ? 'bg-white border-blue-500 shadow-md ring-1 ring-blue-500/10' 
                  : 'bg-white border-gray-200 hover:border-gray-300 hover:bg-gray-50/50 shadow-sm'}
              `}
            >
              {/* Icon Wrapper */}
              <div className={`w-12 h-12 flex items-center justify-center shrink-0 rounded-2xl ${plano.bgColor} ${plano.color} transition-transform duration-500 group-hover:scale-110`}>
                <plano.icon size={24} />
              </div>

              {/* Text Content */}
              <div className="flex-1 min-w-0 pr-2">
                <h3 className="text-lg font-bold text-gray-900 leading-tight">
                  {plano.name}
                </h3>
                <p className="text-base font-medium text-gray-500 mt-0.5 line-clamp-1">
                  {plano.description}
                </p>
              </div>

              {/* Selection Indicator */}
              <div className="shrink-0 ml-auto">
                <div className={`
                  w-6 h-6 rounded-full border flex items-center justify-center transition-all duration-300
                  ${isSelected 
                    ? 'bg-blue-600 border-blue-600 shadow-sm' 
                    : 'bg-white border-gray-200'}
                `}>
                  {isSelected && <Check size={14} className="text-white" />}
                </div>
              </div>
            </motion.div>
          );
        })}
      </motion.div>

      {/* Final Call to Action */}
      <div className="flex flex-col gap-4 mt-4 px-1">
        <button className="w-full h-16 rounded-3xl bg-gray-950 text-white font-black text-lg flex items-center justify-center gap-3 shadow-xl shadow-black/10 hover:bg-black active:scale-[0.98] transition-all">
          Confirmar Assinatura
        </button>
        <div className="flex items-center justify-center gap-2 text-xs font-bold text-gray-400 uppercase tracking-widest">
          <CreditCard size={14} />
          Pagamento processado via Stripe
        </div>
      </div>
  );
}
