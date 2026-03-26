import React from 'react';

const integrations = [
  { name: 'WhatsApp Business', logo: '/assets/whatsapp-business-logo.png', height: 'h-8' },
  { name: 'Google Agenda', logo: '/assets/agenda-logo.svg', height: 'h-8' },
  { name: 'Pix', logo: '/assets/pix-logo.png', height: 'h-8' },
  { name: 'Pagar.me', logo: '/assets/pagarme-logo.png', height: 'h-10' },
  { name: 'RD Station', logo: '/assets/rd-station-logo.svg', height: 'h-8' },
  { name: 'Meta', logo: '/assets/meta-logo.svg', height: 'h-6' },
  { name: 'Google Planilhas', logo: '/assets/sheets-logo.svg', height: 'h-8' },
];

export function LogoCloud() {
  // Duplication trick: duplicate the array to create a seamless infinite loop
  const doubled = [...integrations, ...integrations];

  return (
    <section className="py-16 bg-white border-y border-slate-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <p className="text-sm font-medium text-slate-400 uppercase tracking-widest mb-10">
          Trabalhamos com ferramentas oficiais
        </p>
        
        <div className="relative overflow-hidden">
          {/* Fade edges to smooth the entry/exit of logos */}
          <div className="absolute left-0 top-0 bottom-0 w-24 bg-gradient-to-r from-white to-transparent z-10" />
          <div className="absolute right-0 top-0 bottom-0 w-24 bg-gradient-to-l from-white to-transparent z-10" />

          {/* Scrolling track - Translate from 0 to -50% for seamless loop */}
          <div className="flex items-center animate-marquee whitespace-nowrap w-max hover:[animation-play-state:paused] cursor-pointer">
            {doubled.map((item, i) => (
              <div 
                key={i} 
                className="mx-10 sm:mx-14 flex-shrink-0 flex items-center gap-3 grayscale-0 opacity-100 md:grayscale md:opacity-40 md:hover:grayscale-0 md:hover:opacity-100 transition-all duration-300"
              >
                <img
                  src={item.logo}
                  alt={item.name}
                  className={`${item.height} w-auto object-contain`}
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
