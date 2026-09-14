'use client';

import React from 'react';
import Link from 'next/link';
import { 
  Sliders, 
  QrCode, 
  Trophy, 
  ArrowRight, 
  CheckCircle2, 
  Sparkles,
  Smartphone,
  ShieldCheck,
  Percent
} from 'lucide-react';

export function HowItWorksSection() {
  const steps = [
    {
      step: '01',
      title: 'Configure sua roleta',
      subtitle: 'Cadastre prêmios e personalize a identidade',
      description:
        'Cadastre os prêmios da sua loja (descontos, brindes, cortesias), defina as probabilidades de cada fatia e personalize tudo com as cores e logotipo da sua marca.',
      icon: Sliders,
      gradient: 'from-rose-500 to-pink-500',
      badgeBg: 'bg-rose-50 text-rose-600 border-rose-200',
      features: [
        'Controle exato de estoque de prêmios',
        'Cálculo de probabilidade em tempo real',
        'Cores e logotipo 100% personalizáveis'
      ]
    },
    {
      step: '02',
      title: 'Compartilhe com seus clientes',
      subtitle: 'WhatsApp, Redes Sociais e QR Code no balcão',
      description:
        'Imprima um QR Code exclusivo para colocar nas mesas ou no balcão de atendimento, e envie o link direto no WhatsApp e nas suas redes sociais.',
      icon: QrCode,
      gradient: 'from-pink-500 to-rose-600',
      badgeBg: 'bg-pink-50 text-pink-600 border-pink-200',
      features: [
        'Zero download ou instalação de aplicativo',
        'Abre instantaneamente no navegador do celular',
        'QR Code em alta definição pronto para impressão'
      ]
    },
    {
      step: '03',
      title: 'Seus clientes giram e voltam',
      subtitle: 'Eles ganham prêmios e você fideliza',
      description:
        'O cliente digita o WhatsApp para girar, ganha um cupom autenticado na hora e volta ao seu caixa para resgatar o prêmio com um clique.',
      icon: Trophy,
      gradient: 'from-amber-500 to-rose-500',
      badgeBg: 'bg-amber-50 text-amber-700 border-amber-200',
      features: [
        'Bloqueio antifraude de 24h por número',
        'Captura automática do contato de WhatsApp',
        'Validação de cupons em tempo real no painel'
      ]
    }
  ];

  return (
    <section id="como-funciona" className="py-20 md:py-28 bg-white relative scroll-mt-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-50 border border-rose-200/80 text-rose-700 text-xs font-extrabold uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5 text-rose-500" />
            <span>Como Funciona</span>
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-slate-900 tracking-tight">
            Fidelizar clientes nunca foi tão simples
          </h2>
          <p className="text-base sm:text-lg text-slate-600 leading-relaxed">
            Sem complicações técnicas. Em menos de 5 minutos, sua loja tem uma máquina interativa de atração e fidelização funcionando a todo vapor.
          </p>
        </div>

        {/* 3-Column Grid (Stacked on Mobile) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
          {steps.map((item, idx) => {
            const Icon = item.icon;
            return (
              <div
                key={item.step}
                className="group relative bg-slate-50/70 hover:bg-white rounded-3xl border border-slate-200/80 hover:border-rose-300 p-8 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between"
              >
                {/* Top Row: Step Number & Icon */}
                <div>
                  <div className="flex items-center justify-between mb-6">
                    <span className="text-4xl font-black tracking-tight text-slate-200 group-hover:text-rose-500/20 transition-colors">
                      {item.step}
                    </span>
                    <div className={`w-12 h-12 rounded-2xl bg-gradient-to-tr ${item.gradient} flex items-center justify-center text-white shadow-md shadow-rose-500/20 group-hover:scale-110 transition-transform`}>
                      <Icon className="w-6 h-6" />
                    </div>
                  </div>

                  {/* Title & Subtitle */}
                  <h3 className="text-xl font-bold text-slate-900 mb-2">
                    {item.title}
                  </h3>
                  <p className="text-xs font-semibold text-rose-600 mb-4">
                    {item.subtitle}
                  </p>

                  {/* Description */}
                  <p className="text-sm text-slate-600 leading-relaxed mb-6">
                    {item.description}
                  </p>
                </div>

                {/* Features Checklist */}
                <div className="pt-6 border-t border-slate-200/70 space-y-2.5">
                  {item.features.map((feat, fIdx) => (
                    <div key={fIdx} className="flex items-start gap-2 text-xs text-slate-600">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                      <span>{feat}</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* Bottom Callout Bar */}
        <div className="mt-16 p-6 sm:p-8 rounded-3xl bg-gradient-to-r from-rose-500 via-pink-500 to-rose-600 text-white shadow-xl shadow-rose-500/20 flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="text-center sm:text-left space-y-1">
            <h4 className="text-xl font-bold">Pronto para colocar a roleta no seu balcão hoje?</h4>
            <p className="text-rose-100 text-sm">
              Sem fidelidade, sem contratos complexos. Comece por apenas R$ 16/mês.
            </p>
          </div>
          <Link
            href="/login"
            className="shrink-0 inline-flex items-center gap-2 px-6 py-3.5 rounded-xl text-sm font-bold text-rose-600 bg-white hover:bg-rose-50 shadow-md transition-all active:scale-95"
          >
            <span>Criar minha conta agora</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

      </div>
    </section>
  );
}
