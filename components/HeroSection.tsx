import Image from 'next/image';
import { AnimatedTerminal } from './AnimatedTerminal';

export function HeroSection() {
  return (
    <section className="relative w-full min-h-[100svh] flex flex-col items-center justify-center overflow-hidden px-4 sm:px-6 lg:px-8 bg-black">
      <div className="relative z-10 flex flex-col items-center gap-4">

        <h1 className="font-heading text-3xl sm:text-4xl md:text-5xl lg:text-7xl font-bold text-center leading-tight tracking-tighter text-white max-w-4xl px-4">
          Atendente 24h. Vendendo. Respondendo e-mail.
        </h1>

        {/* O Componente Isolado (Não quebra o SSR do resto da página) */}
        <AnimatedTerminal />

      </div>
    </section>
  );
}
