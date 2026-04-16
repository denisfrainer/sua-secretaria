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
    <section className="pt-40 pb-16 md:pt-56 md:pb-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
          {/* Left Column: Text */}
          <div className="text-center md:text-left space-y-8">
            <h1 className="text-4xl md:text-6xl font-extrabold text-slate-900 leading-[1.1] tracking-tight">
              Sua agenda <span className="text-purple-600">funcionando sozinha</span> no WhatsApp
            </h1>
            <p className="text-lg md:text-xl text-slate-600 max-w-lg mx-auto md:mx-0 font-medium">
              Clientes agendam sem você precisar responder. Automatize seu salão ou clínica com inteligência que fala como você.
            </p>
            <div className="pt-4">
              <Link
                href="/login"
                onClick={handleCTAClick}
                className="inline-block w-full md:w-auto text-center bg-purple-600 text-white px-10 py-5 rounded-2xl font-bold text-xl shadow-xl shadow-purple-200 hover:bg-purple-700 hover:scale-[1.02] transition-all active:scale-95"
              >
                Testar grátis -&gt;
              </Link>
            </div>
          </div>

          {/* Right Column: Image */}
          <div className="relative order-first md:order-last">
            <div className="absolute -inset-4 bg-purple-100 rounded-3xl blur-3xl opacity-40 -z-10 animate-pulse"></div>
            <div className="relative bg-white p-2 rounded-[2.5rem] shadow-2xl border border-slate-100 overflow-hidden transform hover:rotate-1 transition-transform duration-500">
              <Image
                src="/assets/hero-beauty.png"
                alt="Profissional de beleza utilizando smartphone"
                width={600}
                height={600}
                className="rounded-[2rem] object-cover w-full aspect-[4/5] md:aspect-square"
                priority
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
