'use client';

import Link from 'next/link';
import Image from 'next/image';
import { LogoCloud } from '@/components/LogoCloud';
import { Plus_Jakarta_Sans } from 'next/font/google';

const plusJakartaSans = Plus_Jakarta_Sans({ subsets: ['latin'] });

export function Hero() {
  const handleCTAClick = () => {
    console.log('[UI_EVENT] Free Trial CTA Clicked', {
      timestamp: new Date().toISOString(),
      location: 'Hero'
    });
  };

  return (
    <section className="pt-32 pb-8 md:pt-48 md:pb-12 overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-16">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12 items-center">
          {/* Left Column - Headline */}
          <div className="text-center md:text-left">
            <h1 className="text-[32px] md:text-6xl font-extrabold text-slate-900 leading-[1.1] tracking-tight">
              Sua agenda <span className="text-purple-600">funcionando sozinha</span> no WhatsApp
            </h1>
            <h2 className={`${plusJakartaSans.className} text-[16px] text-gray-600 mt-6 leading-relaxed`}>
              a sua assistente virtual que atende igual um ser humano, faz agendamentos automáticos, tira dúvidas 24/7 e recebe 50% de sinal no PIX.
            </h2>
          </div>

          {/* Right Column - Image + CTA */}
          <div className="flex flex-col items-center justify-center mt-8 md:mt-0 gap-8">
            <div className="relative w-full">
              <div className="absolute -inset-4 bg-purple-100 rounded-3xl blur-3xl opacity-40 -z-10 animate-pulse"></div>
              <div className="relative overflow-hidden shadow-2xl transform hover:rotate-1 transition-transform duration-500 rounded-xl">
                <Image
                  src="/assets/hero-beauty.png"
                  alt="Profissional de beleza utilizando smartphone"
                  width={600}
                  height={600}
                  className="object-cover w-full h-[250px]"
                  priority
                />
              </div>
            </div>

            <Link
              href="/login"
              onClick={handleCTAClick}
              className="inline-block w-full sm:w-auto text-center bg-purple-600 text-white px-12 py-5 rounded-2xl font-bold text-xl shadow-2xl shadow-purple-200 hover:bg-purple-700 hover:scale-[1.02] transition-all active:scale-95"
            >
              Testar grátis
            </Link>
          </div>
        </div>
      </div>

      <div className="w-full">
        <LogoCloud />
      </div>
    </section>
  );
}
