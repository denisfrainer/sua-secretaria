import ExpandingTerminal from './ExpandingTerminal';

export function HeroSection() {
  return (
    <section className="relative w-full min-h-[100svh] flex flex-col items-center justify-start overflow-hidden px-4 sm:px-6 lg:px-8 bg-black pt-[12vh]">
      <div className="relative z-10 flex flex-col items-center gap-8 w-full max-w-4xl">

        <h1 className="font-heading text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold text-center leading-tight tracking-tighter text-white px-4 z-10">
          Venda mais. Responda rápido. Sua IA ativa 24/7.
        </h1>

        <ExpandingTerminal />
      </div>
    </section>
  );
}
