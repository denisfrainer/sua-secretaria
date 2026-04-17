'use client';

import Link from 'next/link';
import Image from 'next/image';

export function Hero() {
  const handleCTAClick = () => {
    console.log('[UI_EVENT] Free Trial CTA Clicked', {
      timestamp: new Date().toISOString(),
      location: 'Hero'
    });
  };

  return (
    <section className="pt-32 pb-16 md:pt-48 md:pb-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12 items-center">
          {/* 1. Headline - Always first */}
          <div className="text-center md:text-left md:col-start-1 md:row-start-1">
            <h1 className="text-[32px] md:text-6xl font-extrabold text-slate-900 leading-[1.1] tracking-tight">
              Sua agenda <span className="text-purple-600">funcionando sozinha</span> no WhatsApp
            </h1>
          </div>

          {/* 2. CTA - Positioned below the headline on mobile, bottom-left on desktop */}
          <div className="text-center md:text-left md:col-start-1 md:row-start-2 flex items-start justify-center md:justify-start -mt-4 md:mt-0">
            <Link
              href="/login"
              onClick={handleCTAClick}
              className="inline-block w-full sm:w-auto text-center bg-purple-600 text-white px-12 py-5 rounded-2xl font-bold text-xl shadow-2xl shadow-purple-200 hover:bg-purple-700 hover:scale-[1.02] transition-all active:scale-95"
            >
              Testar grátis
            </Link>
          </div>

          {/* 3. Image - After CTA on mobile, spans right column on desktop */}
          <div className="relative md:col-start-2 md:row-start-1 md:row-span-2 mt-8 md:mt-0">
            <div className="absolute -inset-4 bg-purple-100 rounded-3xl blur-3xl opacity-40 -z-10 animate-pulse"></div>
            <div className="relative overflow-hidden shadow-2xl transform hover:rotate-1 transition-transform duration-500 rounded-xl">
              <Image
                src="/assets/hero-beauty.png"
                alt="Profissional de beleza utilizando smartphone"
                width={600}
                height={600}
                className="object-cover w-full aspect-[4/5] md:aspect-square"
                priority
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
