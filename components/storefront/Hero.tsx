'use client';

import React, { useEffect } from 'react';
import { MapPin, Sparkles, Phone } from 'lucide-react';
import { useWhatsAppRedirect } from './WhatsAppRedirect';

interface HeroProps {
  displayName: string;
  niche?: string;
  phone: string;
  avatarUrl?: string;
  coverUrl?: string;
  location?: string;
}

export function Hero({
  displayName,
  niche = 'Especialista em Alongamento & Blindagem de Unhas',
  phone,
  avatarUrl = 'https://images.unsplash.com/photo-1607990283143-e81e7a2c93ab?auto=format&fit=crop&q=80&w=400&h=400',
  coverUrl = 'https://images.unsplash.com/photo-1607779097040-26e80aa78e66?auto=format&fit=crop&q=80&w=1200&h=400',
  location = 'São Paulo, SP'
}: HeroProps) {
  useEffect(() => {
    console.log('[STOREFRONT_MOUNT] Hero mounted', { displayName, phone, location });
  }, [displayName, phone, location]);

  const redirectToWhatsApp = useWhatsAppRedirect({ componentName: 'Hero' });

  const handleBookNow = () => {
    const message = `Olá ${displayName}, vi seu portfólio e gostaria de agendar um horário para fazer minhas unhas!`;
    redirectToWhatsApp(phone, message, 'Geral - Hero CTA');
  };

  return (
    <section className="relative w-full overflow-hidden bg-rose-50/40 pb-12">
      {/* Cover Banner */}
      <div className="relative h-48 w-full md:h-72 lg:h-80">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-rose-50/80 z-10" />
        <img
          src={coverUrl}
          alt={`${displayName} Cover Banner`}
          className="object-cover w-full h-full"
        />
      </div>

      {/* Profile & Info Container */}
      <div className="relative z-20 -mt-20 mx-auto max-w-4xl px-4 sm:px-6">
        <div className="flex flex-col items-center text-center md:flex-row md:items-end md:text-left gap-6">
          {/* Avatar with luxury border */}
          <div className="relative h-32 w-32 rounded-full border-4 border-white bg-white shadow-xl overflow-hidden ring-4 ring-rose-100">
            <img
              src={avatarUrl}
              alt={displayName}
              className="object-cover w-full h-full"
            />
          </div>

          {/* Info Details */}
          <div className="flex-1 pb-2">
            {/* Location Badge */}
            <div className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-rose-100/60 border border-rose-200 text-rose-700 text-xs font-bold uppercase tracking-wider mb-3">
              <MapPin size={12} className="stroke-[2.5]" />
              <span>{location}</span>
            </div>

            <h1 className="text-3xl font-extrabold text-slate-900 md:text-4xl tracking-tight flex items-center justify-center md:justify-start gap-2">
              {displayName}
              <Sparkles size={20} className="text-amber-500 fill-amber-500 animate-pulse" />
            </h1>
            <p className="mt-1.5 text-base font-medium text-slate-500">{niche}</p>
          </div>
        </div>

        {/* Action Bar (Glassmorphic Card) */}
        <div className="mt-8 p-6 rounded-3xl bg-white/70 backdrop-blur-md border border-white/60 shadow-lg shadow-rose-100/50 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="text-center md:text-left">
            <h3 className="text-lg font-black text-slate-800 tracking-tight">Gostaria de renovar suas unhas?</h3>
            <p className="text-sm font-medium text-slate-500 mt-0.5">Fale diretamente comigo para escolher seu design e agendar o seu momento.</p>
          </div>

          <button
            onClick={handleBookNow}
            className="flex items-center justify-center gap-2 w-full md:w-auto px-8 py-4 bg-rose-600 text-white rounded-2xl font-extrabold text-md shadow-lg shadow-rose-600/30 hover:bg-rose-700 hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer"
          >
            <Phone size={18} className="stroke-[2.5]" />
            Agendar pelo WhatsApp
          </button>
        </div>
      </div>
    </section>
  );
}
