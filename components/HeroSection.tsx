import { CtaButton } from '@/components/CtaButton';
import { PhoneMockup } from '@/components/PhoneMockup';

export function HeroSection() {
  return (
    <section className="relative w-full min-h-[100svh] flex items-center overflow-hidden pt-16">
      {/* Gradient background */}
      <div className="absolute inset-0 hero-gradient opacity-90" />
      {/* Subtle overlay for contrast */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/5 via-transparent to-white/20" />

      <div className="relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-24">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Left: Copy */}
          <div className="flex flex-col gap-6 text-center lg:text-left">
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold leading-[1.1] tracking-tight text-white drop-shadow-lg">
              Pare de perder vendas por demorar para responder.
            </h1>
            <p className="text-lg sm:text-xl text-white/90 max-w-xl mx-auto lg:mx-0 leading-relaxed">
              Um funcionário de IA que atende seu WhatsApp, qualifica clientes e agenda reuniões automaticamente. 24 horas por dia, 7 dias por semana.
            </p>
            <div className="flex flex-col sm:flex-row items-center gap-4 justify-center lg:justify-start mt-2">
              <CtaButton text="Testar no WhatsApp" variant="primary" />
              <CtaButton text="Comece Já" variant="secondary" />
            </div>
          </div>

          {/* Right: Phone Mockup */}
          <div className="flex justify-center lg:justify-end">
            <PhoneMockup />
          </div>
        </div>
      </div>
    </section>
  );
}
