export function HeroSection() {
  return (
    <section className="relative w-full min-h-[100svh] flex flex-col items-center justify-center overflow-hidden px-4 sm:px-6 lg:px-8 bg-black">
      <div className="relative z-10 flex flex-col items-center gap-6 w-full max-w-4xl text-center">
        <h1 className="font-heading text-5xl sm:text-6xl md:text-7xl font-bold leading-tight tracking-tighter text-white">
          Venda mais. Responda rápido.
        </h1>
        <p className="text-[#00FF41] text-lg sm:text-xl font-mono tracking-wide [text-shadow:0_0_5px_rgba(0,255,65,0.5)]">
          Sua consultora de design e conversão ativa 24/7.
        </p>
      </div>
    </section>
  );
}
