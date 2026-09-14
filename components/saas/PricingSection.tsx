'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Check, Sparkles, Shield, ArrowRight, Zap, Crown } from 'lucide-react';

export function PricingSection() {
  const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'annual'>('annual');

  const plans = [
    {
      id: 'mensal',
      name: 'Plano Mensal',
      badge: null,
      price: '16,00',
      period: '/mês',
      billingNote: 'Cobrança mensal no cartão de crédito recorrente',
      description: 'Ideal para experimentar o poder da gamificação no seu comércio sem compromisso longo.',
      features: [
        'Roleta interativa com link exclusivo da sua loja',
        'Giros e clientes ilimitados todos os dias',
        'Cadastro ilimitado de prêmios e regras',
        'Cálculo de probabilidades em tempo real',
        'Validação instantânea de cupons no painel',
        'Bloqueio antifraude de 24h por número e IP',
        'Suporte via WhatsApp em horário comercial'
      ],
      ctaText: 'Começar no Mensal',
      highlight: false,
      ctaGradient: 'bg-slate-900 hover:bg-slate-800 text-white'
    },
    {
      id: 'anual',
      name: 'Plano Anual',
      badge: 'MAIS ESCOLHIDO • MELHOR CUSTO-BENEFÍCIO',
      price: '192,00',
      period: '/ano',
      equivalentMonthly: 'Equivale a apenas R$ 16,00/mês com preço travado',
      billingNote: 'À vista via Pix ou até 12x no cartão de crédito',
      description: 'A escolha favorita dos lojistas para ter estabilidade, economizar e fidelizar o ano inteiro.',
      features: [
        'Tudo incluso no Plano Mensal',
        'QR Code oficial em alta definição para impressão',
        'Prioridade máxima no suporte via WhatsApp',
        'Relatório semanal de contatos de clientes capturados',
        'Preço fixo garantido por 12 meses sem reajustes',
        'Selo digital "Comércio Parceiro Verificado"'
      ],
      ctaText: 'Garantir Plano Anual',
      highlight: true,
      ctaGradient: 'bg-gradient-to-r from-rose-500 via-rose-600 to-pink-600 hover:from-rose-600 hover:to-pink-700 text-white shadow-lg shadow-rose-500/30'
    },
    {
      id: 'trienal',
      name: 'Plano Trienal',
      badge: 'ECONOMIA MÁXIMA • GANHE 1 ANO GRÁTIS',
      price: '384,00',
      period: ' por 3 anos',
      equivalentMonthly: 'Pague 2 anos e ganhe o 3º ano de presente (R$ 10,66/mês)',
      billingNote: 'À vista via Pix ou parcelado no cartão',
      description: 'Para comércios consolidados que querem o melhor custo e tranquilidade garantida por 3 anos.',
      features: [
        'Tudo incluso no Plano Anual',
        '3 anos de acesso completo garantido',
        '33% de desconto em relação ao plano anual',
        'Consultoria inicial de onboarding e prêmios',
        'Acesso antecipado a todos os novos recursos'
      ],
      ctaText: 'Assinar Plano Trienal',
      highlight: false,
      ctaGradient: 'bg-slate-900 hover:bg-slate-800 text-white'
    }
  ];

  return (
    <section id="planos" className="py-20 md:py-28 bg-slate-50 relative scroll-mt-16">
      
      {/* Background soft glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[500px] bg-rose-200/20 blur-[130px] pointer-events-none rounded-full" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
          <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-rose-100/70 border border-rose-200 text-rose-700 text-xs font-extrabold uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5 text-rose-600" />
            <span>Planos & Investimento</span>
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-slate-900 tracking-tight">
            Preço justo e transparente para multiplicar suas vendas
          </h2>
          <p className="text-base sm:text-lg text-slate-600 leading-relaxed">
            Sem pegadinhas, sem taxas por giro e sem limite de clientes. Escolha o plano ideal para a sua loja física ou delivery.
          </p>
        </div>

        {/* Pricing Cards Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-stretch">
          {plans.map((plan) => (
            <div
              key={plan.id}
              className={`relative rounded-3xl transition-all duration-300 flex flex-col justify-between ${
                plan.highlight
                  ? 'bg-white border-2 border-rose-500 shadow-2xl shadow-rose-500/15 lg:-translate-y-2.5 z-20'
                  : 'bg-white/90 backdrop-blur-sm border border-slate-200/90 shadow-md hover:shadow-xl hover:border-slate-300'
              } p-8`}
            >
              {/* Highlight Badge */}
              {plan.badge && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                  <span className="px-4 py-1.5 rounded-full text-[11px] font-black tracking-wide uppercase text-white bg-gradient-to-r from-rose-600 to-pink-600 shadow-md shadow-rose-500/30 whitespace-nowrap">
                    {plan.badge}
                  </span>
                </div>
              )}

              <div>
                {/* Plan Header */}
                <div className="mb-6">
                  <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                    {plan.name}
                    {plan.highlight && <Crown className="w-5 h-5 text-amber-500 fill-amber-400" />}
                  </h3>
                  <p className="text-xs text-slate-500 mt-1 min-h-[36px]">
                    {plan.description}
                  </p>
                </div>

                {/* Price Display */}
                <div className="mb-6 pb-6 border-b border-slate-100">
                  <div className="flex items-baseline gap-1">
                    <span className="text-xs font-bold text-slate-500">R$</span>
                    <span className="text-4xl sm:text-5xl font-black tracking-tight text-slate-900">
                      {plan.price}
                    </span>
                    <span className="text-sm font-semibold text-slate-500">
                      {plan.period}
                    </span>
                  </div>

                  {plan.equivalentMonthly && (
                    <p className="text-xs font-semibold text-rose-600 mt-2 bg-rose-50 py-1 px-2.5 rounded-lg inline-block">
                      {plan.equivalentMonthly}
                    </p>
                  )}

                  <p className="text-[11px] text-slate-400 mt-2">
                    {plan.billingNote}
                  </p>
                </div>

                {/* Feature List */}
                <div className="space-y-3 mb-8">
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-700">
                    O que está incluso:
                  </p>
                  {plan.features.map((feature, idx) => (
                    <div key={idx} className="flex items-start gap-3">
                      <div className={`mt-0.5 w-4 h-4 rounded-full flex items-center justify-center shrink-0 ${
                        plan.highlight ? 'bg-rose-100 text-rose-600' : 'bg-emerald-100 text-emerald-600'
                      }`}>
                        <Check className="w-3 h-3 stroke-[3]" />
                      </div>
                      <span className="text-xs text-slate-600 leading-relaxed font-medium">
                        {feature}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Card CTA */}
              <div>
                <Link
                  href="/login"
                  className={`w-full py-3.5 px-6 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all active:scale-98 ${plan.ctaGradient}`}
                >
                  <span>{plan.ctaText}</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>

            </div>
          ))}
        </div>

        {/* Reassurance Bar */}
        <div className="mt-14 max-w-2xl mx-auto p-4 rounded-2xl bg-white/70 backdrop-blur-sm border border-slate-200/80 text-center flex flex-col sm:flex-row items-center justify-center gap-4 text-xs text-slate-600 font-medium shadow-xs">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-emerald-600" />
            <span>Pagamento 100% seguro via Pagar.me</span>
          </div>
          <span className="hidden sm:inline text-slate-300">•</span>
          <div>
            <span>Sem contratos de fidelidade no mensal</span>
          </div>
          <span className="hidden sm:inline text-slate-300">•</span>
          <div>
            <span>Cancele a qualquer momento</span>
          </div>
        </div>

      </div>
    </section>
  );
}
