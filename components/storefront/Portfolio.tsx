'use client';

import React, { useEffect, useState } from 'react';
import { Camera, Maximize2, X, Sparkles } from 'lucide-react';

interface PortfolioItem {
  id: string;
  title: string;
  category: 'Alongamento' | 'Nail Art' | 'Blindagem' | 'Esmaltação';
  imageUrl: string;
}

const DEFAULT_PORTFOLIO: PortfolioItem[] = [
  {
    id: 'p1',
    title: 'Alongamento em Gel Curvatura Slim',
    category: 'Alongamento',
    imageUrl: 'https://images.unsplash.com/photo-1519014816548-bf5fe059798b?auto=format&fit=crop&q=80&w=600&h=800'
  },
  {
    id: 'p2',
    title: 'Nail Art Minimalista Abstrata',
    category: 'Nail Art',
    imageUrl: 'https://images.unsplash.com/photo-1607779097040-26e80aa78e66?auto=format&fit=crop&q=80&w=600&h=800'
  },
  {
    id: 'p3',
    title: 'Esmaltação em Gel Red Velvet',
    category: 'Esmaltação',
    imageUrl: 'https://images.unsplash.com/photo-1604654894611-6973b376cbde?auto=format&fit=crop&q=80&w=600&h=800'
  },
  {
    id: 'p4',
    title: 'Blindagem Premium Nude Glow',
    category: 'Blindagem',
    imageUrl: 'https://images.unsplash.com/photo-1596462502278-27bfdc403348?auto=format&fit=crop&q=80&w=600&h=800'
  },
  {
    id: 'p5',
    title: 'Francesinha Moderna Encapsulada',
    category: 'Nail Art',
    imageUrl: 'https://images.unsplash.com/photo-1604654894610-df63bc536371?auto=format&fit=crop&q=80&w=600&h=800'
  },
  {
    id: 'p6',
    title: 'Alongamento Almond com Glitter Degradê',
    category: 'Alongamento',
    imageUrl: 'https://images.unsplash.com/photo-1506152983158-b4a74a01c721?auto=format&fit=crop&q=80&w=600&h=800'
  }
];

export function Portfolio() {
  const [filter, setFilter] = useState<string>('Todos');
  const [activePhoto, setActivePhoto] = useState<PortfolioItem | null>(null);

  useEffect(() => {
    console.log('[STOREFRONT_MOUNT] Portfolio mounted', {
      itemsCount: DEFAULT_PORTFOLIO.length,
      currentFilter: filter
    });
  }, [filter]);

  const categories = ['Todos', 'Alongamento', 'Nail Art', 'Blindagem', 'Esmaltação'];

  const filteredItems = filter === 'Todos'
    ? DEFAULT_PORTFOLIO
    : DEFAULT_PORTFOLIO.filter(item => item.category === filter);

  const handleOpenPhoto = (item: PortfolioItem) => {
    console.log('[STOREFRONT_ACTION] Portfolio item zoom triggered', {
      itemId: item.id,
      title: item.title,
      timestamp: new Date().toISOString()
    });
    setActivePhoto(item);
  };

  return (
    <section className="mx-auto max-w-4xl px-4 sm:px-6 py-12" id="portfolio">
      <div className="flex flex-col items-center text-center mb-10">
        <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-rose-50 border border-rose-200 text-rose-700 text-xs font-black uppercase tracking-widest mb-4">
          <Camera size={12} className="stroke-[2.5]" />
          <span>Inspiração & Galeria</span>
        </div>
        <h2 className="text-3xl font-black text-slate-900 tracking-tight">Galeria de Resultados</h2>
        <p className="text-slate-500 font-medium mt-2 max-w-lg">
          Trabalhos reais e autorais que destacam elegância, naturalidade e cuidado.
        </p>
      </div>

      {/* Categories */}
      <div className="flex items-center justify-start sm:justify-center gap-2 overflow-x-auto pb-4 mb-8 no-scrollbar">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setFilter(cat)}
            className={`px-5 py-2 rounded-full text-sm font-black whitespace-nowrap transition-all border cursor-pointer ${
              filter === cat
                ? 'bg-rose-600 text-white border-rose-600 shadow-md shadow-rose-200'
                : 'bg-white text-slate-600 border-slate-200/80 hover:bg-slate-50/60'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Grid Layout */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-6">
        {filteredItems.map((item) => (
          <div
            key={item.id}
            onClick={() => handleOpenPhoto(item)}
            className="group relative aspect-[3/4] w-full overflow-hidden rounded-3xl bg-slate-100 border border-slate-200/40 shadow-sm cursor-pointer hover:shadow-lg transition-all"
          >
            <img
              src={item.imageUrl}
              alt={item.title}
              className="object-cover w-full h-full transition-transform duration-500 group-hover:scale-105"
              loading="lazy"
            />
            {/* Hover overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-4">
              <span className="text-[10px] font-extrabold text-rose-300 uppercase tracking-widest mb-1 flex items-center gap-1">
                <Sparkles size={10} className="fill-rose-300" />
                {item.category}
              </span>
              <p className="text-xs font-black text-white leading-tight pr-4">
                {item.title}
              </p>
              <div className="absolute right-4 bottom-4 w-7 h-7 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center text-white">
                <Maximize2 size={12} className="stroke-[2.5]" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Lightbox / Zoom Modal */}
      {activePhoto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-300">
          <button
            onClick={() => setActivePhoto(null)}
            className="absolute top-6 right-6 p-3 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors border border-white/10 cursor-pointer"
          >
            <X size={20} className="stroke-[2.5]" />
          </button>
          
          <div className="relative max-w-lg w-full aspect-[3/4] overflow-hidden rounded-3xl border border-white/10 shadow-2xl shadow-black/80 animate-in zoom-in-95 duration-300">
            <img
              src={activePhoto.imageUrl}
              alt={activePhoto.title}
              className="object-cover w-full h-full"
            />
            {/* Description panel */}
            <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black/90 to-transparent text-white">
              <span className="inline-block text-[10px] font-extrabold text-rose-400 bg-rose-950/40 px-2 py-0.5 rounded uppercase tracking-wider mb-2">
                {activePhoto.category}
              </span>
              <h3 className="text-lg font-black tracking-tight">{activePhoto.title}</h3>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
