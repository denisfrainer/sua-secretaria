'use client';

import React from 'react';
import { 
  Check, 
  Bot, 
  MessageSquare, 
  LineChart, 
  Zap,
  TrendingUp,
  Layout
} from 'lucide-react';
import { motion } from 'framer-motion';

const PLANS = [
  {
    level: 1,
    name: 'Essencial',
    price: '49,90',
    description: 'Ideal para automação básica de atendimento.',
    features: [
      'Menu Bot Interativo',
      'Encaminhamento automático',
      'Horário de funcionamento',
      'Suporte via e-mail'
    ],
    icon: Layout,
    color: 'bg-blue-500',
    buttonText: 'Selecionar Plano',
    current: true
  },
  {
    level: 2,
    name: 'Premium',
    price: '99,90', // Assuming a price for mockup
    description: 'O poder da IA integrado ao seu WhatsApp.',
    features: [
      'Agente de IA (Eliza)',
      'Atendimento 24/7 via WhatsApp',
      'Treinamento personalizado',
      'Integração com Google Calendar'
    ],
    icon: Bot,
    color: 'bg-indigo-500',
    buttonText: 'Upgrade para Premium',
    current: false,
    highlight: true
  },
  {
    level: 3,
    name: 'Enterprise',
    price: '199,90', // Assuming a price for mockup
    description: 'Operação completa e automação financeira.',
    features: [
      'Reativação de base inativa',
      'Gestão de Planilhas (Sheets)',
      'Relatórios Financeiros',
      'Suporte Prioritário'
    ],
    icon: TrendingUp,
    color: 'bg-black',
    buttonText: 'Contactar Vendas',
    current: false
  }
];

export default function PaymentsPage() {
  return (
    <div className="flex flex-col gap-8 pb-10">
      <header className="pt-4 pb-2">
        <h1 className="text-[34px] font-bold text-black tracking-tight leading-tight">Planos e Assinatura</h1>
        <p className="text-gray-500 text-base mt-1">Escolha o nível ideal para o seu negócio.</p>
      </header>

      <div className="flex flex-col gap-6">
        {PLANS.map((plan, index) => (
          <motion.div
            key={plan.level}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className={`
              relative bg-white rounded-3xl p-6 shadow-sm border border-transparent flex flex-col gap-5
              ${plan.highlight ? 'ring-2 ring-indigo-500 ring-offset-4' : ''}
            `}
          >
            {plan.highlight && (
              <div className="absolute -top-3 right-6 bg-indigo-500 text-white text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full shadow-lg">
                Recomendado
              </div>
            )}

            <div className="flex items-start justify-between">
              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-2xl ${plan.color} flex items-center justify-center text-white shadow-inner`}>
                  <plan.icon size={24} />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900 leading-tight">Nível {plan.level}: {plan.name}</h3>
                  <div className="flex items-baseline gap-1 mt-1">
                    <span className="text-sm font-medium text-gray-400">R$</span>
                    <span className="text-2xl font-black text-gray-900">{plan.price}</span>
                    <span className="text-sm font-medium text-gray-400">/mês</span>
                  </div>
                </div>
              </div>
            </div>

            <p className="text-gray-500 text-sm leading-relaxed">
              {plan.description}
            </p>

            <div className="space-y-3">
              {plan.features.map((feature, fIndex) => (
                <div key={fIndex} className="flex items-center gap-3">
                  <div className="w-5 h-5 rounded-full bg-green-50 flex items-center justify-center shrink-0">
                    <Check size={12} className="text-green-600 font-bold" />
                  </div>
                  <span className="text-sm font-medium text-gray-700">{feature}</span>
                </div>
              ))}
            </div>

            <button 
              className={`
                w-full py-4 rounded-2xl font-bold text-base transition-all active:scale-95
                ${plan.current 
                  ? 'bg-gray-100 text-gray-400 cursor-default' 
                  : plan.highlight 
                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200' 
                    : 'bg-black text-white hover:bg-gray-900'}
              `}
            >
              {plan.current ? 'Plano Atual' : plan.buttonText}
            </button>
          </motion.div>
        ))}
      </div>

      <div className="mt-4 p-6 bg-blue-50 rounded-3xl border border-blue-100 flex flex-col gap-3">
        <div className="flex items-center gap-2 text-blue-700">
          <Zap size={18} fill="currentColor" />
          <span className="font-bold text-sm uppercase tracking-wider">Dica Especial</span>
        </div>
        <p className="text-blue-900/70 text-sm leading-relaxed">
          Assine o plano anual e ganhe 2 meses grátis. Fale com nosso suporte para ativar.
        </p>
      </div>
    </div>
  );
}
