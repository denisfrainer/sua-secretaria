import Image from 'next/image';
import { AnimatedTerminal } from './AnimatedTerminal';

export function HeroSection() {
  return (
    <section className="relative w-full min-h-[100svh] flex flex-col items-center justify-center overflow-hidden px-4 sm:px-6 lg:px-8 bg-black">
      <div className="relative z-10 flex flex-col items-center gap-4" style={{ transform: 'translateY(-36px)' }}>

        <h1 className="font-heading text-4xl sm:text-5xl md:text-6xl lg:text-8xl font-bold text-center leading-tight tracking-tighter text-white max-w-4xl px-4">
          Venda mais. Responda rápido. Sua IA ativa 24/7.
        </h1>

        {/* O Componente Isolado (Não quebra o SSR do resto da página) */}
        <AnimatedTerminal />
      </div>
    </section>
  );
}
