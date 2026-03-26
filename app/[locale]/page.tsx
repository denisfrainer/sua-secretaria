/*
  app/[locale]/page.tsx
  Landing page — Enterprise Clean Tech SaaS aesthetic
*/

import { locales } from '@/i18n';
import { Header } from '@/components/Header';
import { HeroSection } from '@/components/HeroSection';
import { LogoCloud } from '@/components/LogoCloud';
import { CtaButton } from '@/components/CtaButton';
import { Zap, CalendarCheck, Clock, Shield, CheckCircle } from 'lucide-react';

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export default function Home() {
  return (
    <>
      <Header />
      <main className="min-h-screen bg-slate-50">

        {/* 1. Hero Section */}
        <HeroSection />

        {/* 2. Integration Marquee */}
        <LogoCloud />

        {/* 3. Features — Como ele te faz dinheiro */}
        <section id="solucoes" className="py-24 sm:py-32 px-4 sm:px-6 lg:px-8 bg-slate-50">
          <div className="max-w-7xl mx-auto">
            <div className="text-center max-w-2xl mx-auto mb-16">
              <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 tracking-tight">
                Como ele te faz dinheiro
              </h2>
              <p className="mt-4 text-lg text-slate-500 leading-relaxed">
                Setup técnico zero. Nós plugamos no seu WhatsApp e ele começa a trabalhar.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {/* Card 1 — Respostas Instantâneas */}
              <div className="bg-white rounded-2xl p-8 border border-slate-100 shadow-sm hover:shadow-lg hover:border-slate-200 transition-all duration-300 group">
                <div className="w-12 h-12 rounded-xl bg-indigo-50 flex items-center justify-center mb-5 group-hover:bg-indigo-100 transition-colors">
                  <Zap className="w-6 h-6 text-indigo-600" />
                </div>
                <h3 className="text-xl font-semibold text-slate-900 mb-3">Respostas Instantâneas</h3>
                <p className="text-slate-500 leading-relaxed">
                  Enquanto seus concorrentes deixam clientes esperando, sua IA responde em segundos, mantendo uma conversa natural e humana.
                </p>
              </div>

              {/* Card 2 — Vende & Agenda Reuniões */}
              <div className="bg-white rounded-2xl p-8 border border-slate-100 shadow-sm hover:shadow-lg hover:border-slate-200 transition-all duration-300 group">
                <div className="w-12 h-12 rounded-xl bg-violet-50 flex items-center justify-center mb-5 group-hover:bg-violet-100 transition-colors">
                  <CalendarCheck className="w-6 h-6 text-violet-600" />
                </div>
                <h3 className="text-xl font-semibold text-slate-900 mb-3">Vende &amp; Agenda Reuniões</h3>
                <p className="text-slate-500 leading-relaxed">
                  Ele não apenas diz &apos;olá&apos;. Ele entende o que o cliente quer, quebra objeções e coloca a reunião direto no seu calendário.
                </p>
              </div>

              {/* Card 3 — Trabalha 24/7 */}
              <div className="bg-white rounded-2xl p-8 border border-slate-100 shadow-sm hover:shadow-lg hover:border-slate-200 transition-all duration-300 group">
                <div className="w-12 h-12 rounded-xl bg-pink-50 flex items-center justify-center mb-5 group-hover:bg-pink-100 transition-colors">
                  <Clock className="w-6 h-6 text-pink-600" />
                </div>
                <h3 className="text-xl font-semibold text-slate-900 mb-3">Trabalha 24/7</h3>
                <p className="text-slate-500 leading-relaxed">
                  Sem férias, sem folgas, sem sono. Seu negócio permanece aberto e gerando receita mesmo em fins de semana e feriados.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* 4. Pricing */}
        <section id="precos" className="py-24 sm:py-32 px-4 sm:px-6 lg:px-8 bg-white">
          <div className="max-w-lg mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 tracking-tight">
                Contrate seu Funcionário de Inteligência Artificial
              </h2>
            </div>

            <div className="bg-slate-50 rounded-3xl p-8 sm:p-10 border border-slate-200 shadow-sm text-center">
              <p className="text-sm font-medium text-slate-400 uppercase tracking-widest mb-4">Plano Único</p>
              <div className="flex items-baseline justify-center gap-1 mb-8">
                <span className="text-5xl sm:text-6xl font-bold text-slate-900">R$&nbsp;499</span>
                <span className="text-lg text-slate-400 font-medium">/mês</span>
              </div>

              <ul className="text-left space-y-4 mb-10">
                <li className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" />
                  <span className="text-slate-700">Atende clientes ilimitados</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" />
                  <span className="text-slate-700">Memória conversacional completa</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" />
                  <span className="text-slate-700">Integração direta com seu calendário</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" />
                  <span className="text-slate-700">Taxa de setup zero</span>
                </li>
              </ul>

              <div className="flex justify-center">
                <CtaButton text="Comece Agora" variant="primary" />
              </div>
            </div>
          </div>
        </section>

        {/* 5. Trust Signals + FAQ */}
        <section id="faq" className="py-24 sm:py-32 px-4 sm:px-6 lg:px-8 bg-slate-50">
          <div className="max-w-3xl mx-auto">
            {/* Trust badges */}
            <div className="flex flex-wrap items-center justify-center gap-6 mb-16">
              <div className="flex items-center gap-2 px-5 py-2.5 bg-white rounded-full border border-slate-200 shadow-sm">
                <Shield className="w-4 h-4 text-emerald-500" />
                <span className="text-sm font-medium text-slate-600">Adequado à LGPD</span>
              </div>
              <div className="flex items-center gap-2 px-5 py-2.5 bg-white rounded-full border border-slate-200 shadow-sm">
                <CheckCircle className="w-4 h-4 text-emerald-500" />
                <span className="text-sm font-medium text-slate-600">Sem risco de bloqueio de conta</span>
              </div>
            </div>

            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 tracking-tight text-center mb-12">
              FAQ
            </h2>

            <div className="space-y-4">
              {/* Q1 */}
              <details className="group bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <summary className="flex justify-between items-center px-6 py-5 font-semibold text-slate-900 cursor-pointer list-none [&::-webkit-details-marker]:hidden select-none">
                  <span>Preciso saber programar para usar isso?</span>
                  <svg className="w-5 h-5 text-slate-400 transform group-open:rotate-180 transition-transform duration-200 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </summary>
                <div className="px-6 pb-5 text-slate-500 leading-relaxed">
                  Não. Nós fazemos todo o setup. Você apenas conecta seu WhatsApp via QR code e a IA assume.
                </div>
              </details>

              {/* Q2 */}
              <details className="group bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <summary className="flex justify-between items-center px-6 py-5 font-semibold text-slate-900 cursor-pointer list-none [&::-webkit-details-marker]:hidden select-none">
                  <span>Ele vai parecer um robô?</span>
                  <svg className="w-5 h-5 text-slate-400 transform group-open:rotate-180 transition-transform duration-200 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </summary>
                <div className="px-6 pb-5 text-slate-500 leading-relaxed">
                  Não. Nós treinamos a IA com o contexto do seu negócio para que ele fale exatamente como um membro humano da sua equipe.
                </div>
              </details>

              {/* Q3 */}
              <details className="group bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <summary className="flex justify-between items-center px-6 py-5 font-semibold text-slate-900 cursor-pointer list-none [&::-webkit-details-marker]:hidden select-none">
                  <span>Posso cancelar quando quiser?</span>
                  <svg className="w-5 h-5 text-slate-400 transform group-open:rotate-180 transition-transform duration-200 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </summary>
                <div className="px-6 pb-5 text-slate-500 leading-relaxed">
                  Sim. Não há contratos de fidelidade. Você pode cancelar sua assinatura a qualquer momento com um clique.
                </div>
              </details>
            </div>
          </div>
        </section>

        {/* 6. Footer */}
        <footer className="py-12 bg-white border-t border-slate-100">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col items-center gap-3 text-center">
            <img src="/assets/logo.avif" alt="meatende.ai" className="w-8 h-auto" />
            <p className="text-sm text-slate-400">
              {new Date().getFullYear()} © meatende.ai. Todos os direitos reservados.
            </p>
          </div>
        </footer>

        {/* Floating WhatsApp */}
        <a
          href="https://wa.me/5511999999999"
          target="_blank"
          rel="noopener noreferrer"
          className="fixed bottom-6 right-6 z-50 w-16 h-16 flex items-center justify-center hover:scale-110 transition-transform duration-200"
          title="Testar no WhatsApp"
        >
          <img src="/assets/whatsapp.svg" alt="WhatsApp" className="w-full h-full drop-shadow-lg" />
        </a>

      </main>
    </>
  );
}
