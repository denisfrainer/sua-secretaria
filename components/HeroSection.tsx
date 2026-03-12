import Image from 'next/image';

export function HeroSection() {
  return (
    <section className="relative w-full min-h-[100svh] flex flex-col items-center justify-center overflow-hidden px-4 sm:px-6 lg:px-8 bg-black">
      <div className="relative z-10 flex flex-col items-center gap-8" style={{ marginBottom: '148px' }}>

        {/* Logo centralizado */}
        <Image
          src="/assets/logo.avif"
          alt="Logo"
          width={220}
          height={220}
          priority={true}
          fetchPriority="high"
          loading="eager"
          className="w-40 sm:w-52 md:w-60 h-auto"
        />

        {/* H1 */}
        <h1 className="font-heading text-4xl sm:text-6xl md:text-7xl lg:text-8xl font-bold text-center leading-[0.95] tracking-tighter text-white">
          Restaure fotos antigas em segundos
        </h1>

      </div>

      {/* Subtle glow */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_40%,rgba(64,78,237,0.08),transparent_60%)] pointer-events-none"></div>
    </section>
  );
}
