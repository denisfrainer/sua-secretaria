'use client';

export function SocialProof() {
  const logos = [
    { name: 'Studio Glow' },
    { name: 'Espaço Bella' },
    { name: 'Dayane Beleza' },
    { name: 'Clínica Revitalize' },
    { name: 'Vânia Estética' }
  ];

  return (
    <section className="pb-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <p className="text-sm font-semibold text-slate-400 uppercase tracking-[0.2em] mb-12">
          Já ajudam a organizar a agenda de centenas de profissionais
        </p>
        <div className="flex flex-wrap justify-center items-center gap-x-12 gap-y-8 md:gap-x-20">
          {logos.map((logo) => (
            <div key={logo.name} className="flex items-center gap-3 group">
              <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center group-hover:bg-purple-50 transition-colors">
                <div className="w-5 h-5 rounded-full border-2 border-slate-300 group-hover:border-purple-300 transition-colors"></div>
              </div>
              <span className="font-bold text-slate-500 text-lg group-hover:text-purple-600/70 transition-colors">
                {logo.name}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
