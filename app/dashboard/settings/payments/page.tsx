'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  MessageCircle, 
  Sparkles, 
  Bot, 
  Check,
  CreditCard,
  Wallet,
  CheckCircle2,
  Copy,
  ExternalLink,
  ShieldCheck,
  ArrowUpCircle
} from 'lucide-react';
import { motion, Variants } from 'framer-motion';
import { createClient } from '@/lib/supabase/client';
import { hasAccess, PlanTier } from '@/lib/auth/access-control';

const PLANOS = [
  {
    id: 'starter',
    name: 'Starter',
    description: 'Anti-No-Show: Agenda digital e PIX manual.',
    price: '97',
    icon: MessageCircle,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
  },
  {
    id: 'pro',
    name: 'Pro',
    description: 'Automação Total: IA Eliza e Pagamentos Automáticos.',
    price: '247',
    icon: Sparkles,
    color: 'text-purple-600',
    bgColor: 'bg-purple-50',
  },
  {
    id: 'elite',
    name: 'Elite',
    description: 'Escala Ativa: Wolf Agent (Outbound) e CRM.',
    price: '497',
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
  const [selectedPlan, setSelectedPlan] = useState('pro');
  const [tier, setTier] = useState<PlanTier>('STARTER');
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    async function getTier() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('plan_tier')
          .eq('id', user.id)
          .single();
        if (profile?.plan_tier) setTier(profile.plan_tier as PlanTier);
      }
      setLoading(false);
    }
    getTier();
  }, [supabase]);

  const canUsePix = hasAccess(tier, 'AUTOMATED_PAYMENTS_PIX');

  const handleUpsellClick = (planName: string) => {
    console.log(`[UPSELL_TRACK] User on ${tier} interacted with ${planName} plan`);
  };

  return (
    <div className="flex flex-col gap-10 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-32">
      
      {/* 1. SEÇÃO DE CONFIGURAÇÃO (PRO/ELITE) */}
      {canUsePix && (
        <section className="flex flex-col gap-6">
          <div className="flex flex-col gap-1 px-1">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-600 border border-emerald-500/10">
                <Wallet size={20} />
              </div>
              <h2 className="text-xl font-black text-gray-900 tracking-tight">Pagamentos Automáticos (PIX)</h2>
            </div>
            <p className="text-sm font-medium text-gray-500">
              Sua conta está habilitada para receber via PIX com baixa automática.
            </p>
          </div>

          <div className="bg-white rounded-[2.5rem] border border-black/5 shadow-sm p-8 flex flex-col gap-8">
            <div className="flex items-center justify-between p-6 bg-emerald-50 rounded-3xl border border-emerald-100">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-emerald-600 shadow-sm">
                  <CheckCircle2 size={24} />
                </div>
                <div>
                  <h4 className="text-base font-black text-emerald-900 tracking-tight">Gateway Ativo</h4>
                  <p className="text-xs font-bold text-emerald-600/70 uppercase tracking-widest">Webhooks sincronizados</p>
                </div>
              </div>
              <ShieldCheck className="text-emerald-500" size={24} />
            </div>

            <div className="flex flex-col gap-4">
              <label className="text-xs font-black text-gray-400 uppercase tracking-widest px-1">URL de Webhook (Mercado Pago / Asaas)</label>
              <div className="flex gap-2">
                <div className="flex-1 h-14 bg-gray-50 rounded-2xl border border-black/5 flex items-center px-5 text-sm font-mono text-gray-500 truncate">
                  https://meatende.ai/api/webhooks/pix
                </div>
                <button className="h-14 w-14 rounded-2xl bg-gray-950 text-white flex items-center justify-center hover:bg-black transition-all active:scale-95">
                  <Copy size={20} />
                </button>
              </div>
              <p className="text-[11px] font-medium text-gray-400 px-1 leading-relaxed">
                Use esta URL no seu painel do Mercado Pago para notificar a Eliza sobre novos pagamentos.
              </p>
            </div>
          </div>
        </section>
      )}

      {/* 2. SEÇÃO DE ASSINATURA / UPSELL */}
      <section className="flex flex-col gap-8 mt-4">
        <div className="flex flex-col gap-1 px-1">
          <div className="flex items-center gap-3">
             <h2 className="text-xl font-black text-gray-900 tracking-tight">
               {canUsePix ? 'Seu Plano Atual' : 'Planos de Serviço'}
             </h2>
             {!canUsePix && (
                <span className="bg-blue-100 text-blue-700 text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-md">
                   Recomendado
                </span>
             )}
          </div>
          <p className="text-sm font-medium text-gray-500">
            {canUsePix 
              ? 'Gerencie sua assinatura e faturas recorrentes.' 
              : 'Faça o upgrade para desbloquear automação financeira e IA avançada.'}
          </p>
        </div>

        <motion.div 
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="flex flex-col gap-3"
        >
          {PLANOS.map((plano) => {
            const isSelected = selectedPlan === plano.id;
            const isCurrent = tier.toLowerCase() === plano.id;
            
            return (
              <motion.div
                key={plano.id}
                variants={itemVariants}
                onClick={() => {
                  setSelectedPlan(plano.id);
                  handleUpsellClick(plano.name);
                }}
                className={`
                  group relative flex items-center gap-4 p-5 rounded-3xl border transition-all w-full cursor-pointer
                  ${isSelected 
                    ? 'bg-white border-blue-500 shadow-md ring-1 ring-blue-500/10' 
                    : 'bg-white border-gray-200 hover:border-gray-300 hover:bg-gray-50/50 shadow-sm'}
                  ${isCurrent ? 'bg-blue-50/20 border-blue-200 pointer-events-none opacity-80' : ''}
                `}
              >
                <div className={`w-12 h-12 flex items-center justify-center shrink-0 rounded-2xl ${plano.bgColor} ${plano.color}`}>
                  <plano.icon size={24} />
                </div>

                <div className="flex-1 min-w-0 pr-2">
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-bold text-gray-900 leading-tight">
                      {plano.name}
                    </h3>
                    {isCurrent && (
                      <span className="text-[9px] font-black text-blue-600 bg-blue-100 px-2 py-0.5 rounded-full uppercase tracking-tighter">
                        Atual
                      </span>
                    )}
                  </div>
                  <p className="text-xs font-medium text-gray-500 mt-0.5">
                    {plano.description}
                  </p>
                </div>

                <div className="shrink-0 ml-auto flex flex-col items-end">
                  <span className="text-lg font-black text-gray-900 leading-none">R$ {plano.price}</span>
                  <span className="text-[10px] font-bold text-gray-400 mt-1 uppercase">/mês</span>
                </div>
              </motion.div>
            );
          })}
        </motion.div>

        {!canUsePix && (
          <div className="flex flex-col gap-4 mt-2 px-1">
            <Link 
              href={`/checkout?plan=${selectedPlan}`}
              className="w-full h-16 rounded-3xl bg-gray-950 text-white font-black text-base flex items-center justify-center gap-3 shadow-xl shadow-black/10 hover:bg-black active:scale-[0.98] transition-all"
            >
              <ArrowUpCircle size={20} />
              Desbloquear Automação PIX
            </Link>
            <div className="flex items-center justify-center gap-6 text-[10px] font-black text-gray-300 uppercase tracking-widest">
              <div className="flex items-center gap-1.5"><ShieldCheck size={14} /> Pagamento Seguro</div>
              <div className="flex items-center gap-1.5"><CheckCircle2 size={14} /> Sem Multa de Cancelamento</div>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

