/*
  app/[locale]/page.tsx
  Main page overhaul for high-conversion Single-Page funnel
*/

import { locales } from '@/i18n';
import { Header } from '@/components/Header';
import { HeroSection } from '@/components/HeroSection';
import SystemTerminal from '@/components/SystemTerminal';
import { LogicSection } from '@/components/LogicSection';
import { LogoCloud } from '@/components/LogoCloud';
import { CtaButton } from '@/components/CtaButton';
import { Users, Activity, Bot } from 'lucide-react';

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export default function Home() {
  return (
    <>
      <Header />
      <main className="min-h-screen bg-black">

        {/* 1. Hero Section */}
        <HeroSection />

        {/* 2. System Section (Second Fold) */}
        <section className="min-h-[80vh] flex items-center justify-center bg-black border-t border-[#2C2C2C] px-4 py-20">
          <div className="w-full">
            <SystemTerminal />
          </div>
        </section>

        {/* 3. The Logic (Third Fold) */}
        <LogicSection />

        {/* 4. Social Proof (Trust) */}
        <section className="pt-32 pb-32 bg-black border-t border-[#2C2C2C] overflow-hidden">
          <div className="text-center">
            <p className="font-body text-xs uppercase tracking-widest text-[#888888] mb-8">Powering AI for top-tier fleets</p>
            <LogoCloud />
          </div>
        </section>

        {/* 3. Capabilities (The Wireframe Grid) */}
        <section className="py-32 p-12 bg-black border-t border-[#2C2C2C]">
          <div className="max-w-7xl mx-auto space-y-12">
            <h2 className="font-heading text-4xl font-bold text-white text-center uppercase tracking-wider">CAPABILITIES</h2>
            <p className="text-[#888888] font-body text-center max-w-lg mx-auto text-lg">Nossas IAs são treinadas para executar tarefas complexas com precisão cirúrgica.</p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
              {/* Card 1 */}
              <div className="border border-white p-8 bg-black rounded-none flex flex-col gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 border border-white flex items-center justify-center text-white"><Users size={24} /></div>
                  <h3 className="font-heading text-2xl font-bold text-white">SDR & Vendas</h3>
                </div>
                <p className="text-white font-body text-lg leading-relaxed pb-1">Qualificação de leads frios, envio de propostas e follow-up automático no WhatsApp.</p>
              </div>
              {/* Card 2 */}
              <div className="border border-white p-8 bg-black rounded-none flex flex-col gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 border border-white flex items-center justify-center text-white"><Activity size={24} /></div>
                  <h3 className="font-heading text-2xl font-bold text-white">Suporte 24/7</h3>
                </div>
                <p className="text-white font-body text-lg leading-relaxed pb-1">Respostas imediatas a dúvidas frequentes, rastreamento de pedidos e triagem de chamados.</p>
              </div>
              {/* Card 3 */}
              <div className="border border-white p-8 bg-black rounded-none flex flex-col gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 border border-white flex items-center justify-center text-white"><Bot size={24} /></div>
                  <h3 className="font-heading text-2xl font-bold text-white">Agendamento</h3>
                </div>
                <p className="text-white font-body text-lg leading-relaxed pb-1">Integrado com Calendly/Google Agenda para marcar reuniões sem intervenção humana.</p>
              </div>
            </div>

            {/* Unified CTA */}
            <CtaButton text="Testar no WhatsApp" />
          </div>
        </section>

        {/* 4. Pricing (The Deal) */}
        <section className="py-32 px-4 bg-black border-t border-[#2C2C2C]">
          <div className="max-w-xl mx-auto border border-white p-12 text-center rounded-none flex flex-col items-stretch gap-6 bg-black">
            <p className="font-body text-xs uppercase tracking-widest text-[#888888]">Plano Único</p>
            <h3 className="font-heading text-5xl font-bold text-white">R$ 499<span className="text-xl text-[#888888]">/mês</span></h3>
            <p className="text-white font-body max-w-sm text-lg leading-relaxed">Mensagens ilimitadas. Memória completa da conversa. Zero taxa de setup.</p>

            <CtaButton text="Começar Agora" />
          </div>
        </section>

        {/* 5. FAQ */}
        <section className="py-32 px-4 bg-black border-t border-[#2C2C2C]">
          <div className="max-w-3xl mx-auto space-y-8">
            <h2 className="font-heading text-2xl font-bold text-white text-center uppercase tracking-wider">FAQ</h2>
            <div className="divide-y divide-[#2C2C2C] border-t border-b border-[#2C2C2C]">
              {/* Q1 */}
              <div className="py-5 space-y-2">
                <h4 className="font-heading text-lg font-semibold text-white">É seguro para os meus dados?</h4>
                <p className="text-white font-body text-lg leading-relaxed">Sim. Utilizamos criptografia de ponta a ponta e seus dados nunca são compartilhados ou usados para treinar outros modelos públicos.</p>
              </div>
              {/* Q2 */}
              <div className="py-5 space-y-2">
                <h4 className="font-heading text-lg font-semibold text-white">Como funciona a integração?</h4>
                <p className="text-white font-body text-lg leading-relaxed">Em menos de 2 minutos você lê o QR Code no seu dashboard e a IA já assume o número configurado.</p>
              </div>
              {/* Q3 */}
              <div className="py-5 space-y-2">
                <h4 className="font-heading text-lg font-semibold text-white">Posso cancelar quando quiser?</h4>
                <p className="text-white font-body text-lg leading-relaxed">Sim. O plano é mensal, sem fidelidade ou taxas de cancelamento ocultas.</p>
              </div>
            </div>
          </div>
        </section>

        {/* 7. Footer */}
        <footer className="py-12 border-t border-[#2C2C2C] bg-black">
          <div className="max-w-7xl mx-auto px-4 flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-[#888888] font-body text-xs">© 2026 LP Nexus. Todos os direitos reservados.</p>
            <div className="flex items-center gap-6 text-[#888888] font-body text-xs">
              <a href="#" className="hover:text-white transition-colors">Termos</a>
              <a href="#" className="hover:text-white transition-colors">Privacidade</a>
              <a href="#" className="hover:text-white transition-colors">Twitter/X</a>
            </div>
          </div>
        </footer>

        {/* Fixed Floating WhatsApp */}
        <a
          href="#"
          className="fixed bottom-6 right-6 z-50 hover:scale-110 transition-transform duration-200"
          title="Falar no WhatsApp"
        >
          <img src="/assets/WhatsApp.svg" alt="WhatsApp Float" className="w-14 h-14" />
        </a>

      </main>
    </>
  );
}
