import Image from 'next/image';

export function HeroSection() {
  return (
    <section className="relative w-full flex flex-col items-center justify-center overflow-hidden px-4 sm:px-6 lg:px-8 bg-black pt-32 pb-24">
      <div className="relative z-10 flex flex-col items-center gap-6">

        <h1 className="font-heading text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold text-center leading-[0.95] tracking-tighter text-white max-w-4xl px-4">
          Atendente 24h. Vendendo. Respondendo e-mail.
        </h1>

      </div>

      {/* Subtle glow */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_40%,rgba(64,78,237,0.08),transparent_60%)] pointer-events-none"></div>
    </section>
  );
}
