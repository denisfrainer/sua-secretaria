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

  const logos = [
    { name: 'WhatsApp', src: '/assets/whatsapp-business-logo.png' },
    { name: 'Google Agenda', src: '/assets/agenda-logo.svg' },
    { name: 'Pix', src: '/assets/pix-logo.png' },
    { name: 'Pagar.me', src: '/assets/pagarme-logo.png' },
    { name: 'Meta', src: '/assets/meta-logo.svg' },
    { name: 'Google Sheets', src: '/assets/sheets-logo.svg' },
  ];

  // Duplicate for seamless loop
  const doubledLogos = [...logos, ...logos, ...logos];

  return (
    <section className="pt-32 pb-16 md:pt-48 md:pb-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
          {/* Left Column: Text */}
          <div className="text-center md:text-left space-y-6">
            <h1 className="text-3xl md:text-5xl font-extrabold text-slate-900 leading-[1.2] tracking-tight">
              Sua agenda <span className="text-purple-600">funcionando sozinha</span> no WhatsApp
            </h1>

            {/* Logo Carousel */}
            <div className="relative overflow-hidden py-4 w-full group">
              <div className="flex items-center animate-marquee whitespace-nowrap w-max gap-10 opacity-70 hover:opacity-100 transition-all duration-500">
                {doubledLogos.map((logo, i) => (
                  <img
                    key={i}
                    src={logo.src}
                    alt={logo.name}
                    className="h-6 md:h-8 w-auto object-contain flex-shrink-0"
                  />
                ))}
              </div>
              {/* Overlay gradients for fade effect */}
              <div className="absolute inset-y-0 left-0 w-8 bg-gradient-to-r from-slate-50/50 to-transparent z-10"></div>
              <div className="absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-slate-50/50 to-transparent z-10"></div>
            </div>

            <p className="text-base md:text-lg text-slate-600 max-w-lg mx-auto md:mx-0 font-medium">
              Clientes agendam sem você precisar responder. Automatize seu salão ou clínica com inteligência que fala como você.
            </p>
            <div className="pt-4">
              <Link
                href="/login"
                onClick={handleCTAClick}
                className="inline-block w-full md:w-auto text-center bg-purple-600 text-white px-10 py-4 rounded-2xl font-bold text-lg shadow-xl shadow-purple-200 hover:bg-purple-700 hover:scale-[1.02] transition-all active:scale-95"
              >
                Testar grátis -&gt;
              </Link>
            </div>
          </div>

          {/* Right Column: Image */}
          <div className="relative order-first md:order-last">
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
