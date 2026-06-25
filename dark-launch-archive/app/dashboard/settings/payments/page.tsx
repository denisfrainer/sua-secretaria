'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  Check,
  Wallet,
  CheckCircle2,
  Copy,
  ShieldCheck,
  ArrowRight,
  Sparkles,
  Zap,
  TrendingUp,
  Star
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { createClient } from '@/lib/supabase/client';
import { hasAccess, PlanTier } from '@/lib/auth/access-control';

const PLANOS = [
  {
    id: 'starter',
    name: 'Starter',
    subtitle: 'Ideal para começar',
    price: '39,90',
    icon: Zap,
    color: 'text-gray-400',
    features: [
      'Link de Agendamento Online',
      'Bot de Menu Fixo (L1)',
      'Dashboard de Gestão'
    ]
  },
  {
    id: 'pro',
    name: 'Pro',
    subtitle: 'Automação Completa',
    price: '99,00',
    icon: Sparkles,
    color: 'text-[#533CFA]',
    popular: true,
    features: [
      'Agente de IA (Eliza)',
      'Confirmação de PIX Automática',
      'Sincronização Google Sheets'
    ]
  },
  {
    id: 'elite',
    name: 'Elite',
    subtitle: 'Escala Empresarial',
    price: '199,00',
    icon: TrendingUp,
    color: 'text-indigo-600',
    features: [
      'Wolf Agent (Outbound)',
      'CRM de Vendas',
      'Suporte Prioritário'
    ]
  }
];

export default function PaymentsPricingPage() {
  const [selectedPlan, setSelectedPlan] = useState('pro');
  const [tier, setTier] = useState<PlanTier>('STARTER');
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    async function getInitialData() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUser(user);
        const { data: profile } = await supabase
          .from('profiles')
          .select('plan_tier')
          .eq('id', user.id)
          .single();
        if (profile?.plan_tier) setTier(profile.plan_tier as PlanTier);
      }
      setLoading(false);
    }
    getInitialData();
  }, [supabase]);

  const canUsePix = hasAccess(tier, 'AUTOMATED_PAYMENTS_PIX');

  const handlePlanSelection = (planId: string) => {
    setSelectedPlan(planId);
    if (user) {
      console.log('[PRICING_INTERACTION] User selecting tier:', {
        userId: user.id,
        selectedTier: planId,
        currentTier: tier,
        timestamp: new Date().toISOString()
      });
    }
  };

  const currentPlanData = PLANOS.find(p => p.id === selectedPlan);

  return (
    <div className="flex flex-col gap-12 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-32">
      


      {/* 2. SEÇÃO DE PLANOS (GRID) */}
      <section className="flex flex-col gap-8 mt-2">
        <div className="flex flex-col gap-1 text-center lg:text-left">
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">Planos de Serviço</h2>
          <p className="text-sm font-medium text-slate-500">Escolha o motor do seu negócio.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {PLANOS.map((plano) => {
            const isSelected = selectedPlan === plano.id;
            const isCurrent = tier.toLowerCase() === plano.id;
            
            return (
              <motion.div
                key={plano.id}
                onClick={() => handlePlanSelection(plano.id)}
                whileHover={{ y: -4 }}
                className={`
                  relative flex flex-col p-8 rounded-[2rem] border transition-all cursor-pointer h-full
                  ${isSelected 
                    ? 'bg-white border-[#533CFA] shadow-xl shadow-indigo-500/5 ring-1 ring-[#533CFA]/10' 
                    : 'bg-white border-slate-100 hover:border-slate-200 shadow-sm'}
                  ${isCurrent ? 'opacity-90' : ''}
                `}
              >
                {/* Popular Badge */}
                {plano.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#533CFA] text-white text-[9px] font-black uppercase tracking-widest px-4 py-1.5 rounded-full shadow-lg shadow-indigo-500/20 flex items-center gap-1.5 whitespace-nowrap">
                    <Star size={10} fill="currentColor" />
                    Mais Popular
                  </div>
                )}

                {/* header */}
                <div className="flex flex-col gap-2 mb-8">
                  <div className="flex items-center justify-between">
                    <div className={`p-3 rounded-2xl bg-slate-50 ${plano.color}`}>
                      <plano.icon size={24} />
                    </div>
                    {isCurrent && (
                      <span className="text-[10px] font-black text-[#533CFA] bg-indigo-50 px-3 py-1 rounded-lg uppercase tracking-wider">
                        Atual
                      </span>
                    )}
                  </div>
                  <div className="mt-4">
                    <h3 className="text-xl font-bold text-slate-900">{plano.name}</h3>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">{plano.subtitle}</p>
                  </div>
                </div>

                {/* price */}
                <div className="mb-8 flex items-baseline gap-1">
                  <span className="text-sm font-bold text-slate-400">R$</span>
                  <span className="text-4xl font-black text-slate-900 tracking-tight">{plano.price}</span>
                  <span className="text-xs font-bold text-slate-400">/mês</span>
                </div>

                {/* features */}
                <div className="flex flex-col gap-4 flex-1">
                  <p className="text-[10px] font-bold text-slate-300 uppercase tracking-widest border-b border-slate-50 pb-2">O que está incluído</p>
                  <ul className="flex flex-col gap-3">
                    {plano.features.map((feature, i) => (
                      <li key={i} className="flex items-start gap-3 text-sm font-medium text-slate-600 leading-tight">
                        <div className="mt-1 shrink-0 w-4 h-4 rounded-full bg-emerald-50 flex items-center justify-center">
                           <Check size={10} className="text-emerald-600" />
                        </div>
                        {feature}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Subscibe Button (New) */}
                <div className="mt-8">
                  <button
                    className={`
                      w-full h-12 rounded-xl font-black text-sm flex items-center justify-center gap-2 transition-all active:scale-[0.98]
                      ${isSelected 
                        ? 'bg-[#533CFA] text-white shadow-lg shadow-indigo-500/20 px-6' 
                        : 'bg-slate-50 text-slate-400 hover:bg-slate-100 px-6'}
                    `}
                  >
                    Assinar por R$ {plano.price.split(',')[0]}
                    <ArrowRight size={16} />
                  </button>
                </div>
              </motion.div>
            );
          })}
        </div>

      </section>

    </div>
  );
}

