'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';

// B2B Scheduling Platform Imports (Original UI)
import { Navbar } from '@/components/landing/Navbar';
import { Hero as B2BHero } from '@/components/landing/Hero';
import { LandingSections } from '@/components/LandingSections';

// Manicurist Storefront (Vitrine Virtual) Imports
import { Hero as StorefrontHero } from '@/components/storefront/Hero';
import { Services as StorefrontServices } from '@/components/storefront/Services';
import { Portfolio as StorefrontPortfolio } from '@/components/storefront/Portfolio';
import { StorefrontHeader } from '@/components/storefront/StorefrontHeader';
import { Sparkles } from 'lucide-react';

export default function Home() {
  const isDarkLaunch = process.env.NEXT_PUBLIC_DARK_LAUNCH === 'true';

  useEffect(() => {
    console.log('[STOREFRONT_MOUNT] Root page page.tsx mounted', {
      isDarkLaunch,
      timestamp: new Date().toISOString()
    });
  }, [isDarkLaunch]);

  if (isDarkLaunch) {
    return (
      <>
        <Navbar />
        <main className="min-h-screen bg-slate-50/50 overflow-hidden text-black font-sans">
          <B2BHero />
          <LandingSections />
        </main>
      </>
    );
  }

  // default: Render the premium manicurist Vitrine Virtual storefront
  const defaultProfessional = {
    displayName: 'Vitrine Nails Studio',
    niche: 'Manicure & Nail Designer • Especialista em unhas em gel e blindagem',
    phone: '5511999999999', // Default mock phone (Portuguese format without symbols)
    location: 'São Paulo - SP',
    avatarUrl: 'https://images.unsplash.com/photo-1596462502278-27bfdc403348?auto=format&fit=crop&q=80&w=400&h=400',
    coverUrl: 'https://images.unsplash.com/photo-1607779097040-26e80aa78e66?auto=format&fit=crop&q=80&w=1200&h=400'
  };

  return (
    <div className="min-h-screen bg-[#FFFBFB] text-slate-800 font-sans selection:bg-rose-200 selection:text-rose-900 scroll-smooth">
      <StorefrontHeader
        displayName={defaultProfessional.displayName}
        phone={defaultProfessional.phone}
        showLogin={true}
      />

      <main className="pb-24">
        {/* Hero Banner Area */}
        <StorefrontHero
          displayName={defaultProfessional.displayName}
          niche={defaultProfessional.niche}
          phone={defaultProfessional.phone}
          avatarUrl={defaultProfessional.avatarUrl}
          coverUrl={defaultProfessional.coverUrl}
          location={defaultProfessional.location}
        />

        {/* Services Section */}
        <StorefrontServices
          phone={defaultProfessional.phone}
          professionalName={defaultProfessional.displayName}
        />

        {/* Portfolio Section */}
        <StorefrontPortfolio />
      </main>

      {/* Storefront Footer */}
      <footer className="bg-rose-50/40 border-t border-rose-100/50 py-12 text-center text-slate-400">
        <div className="max-w-4xl mx-auto px-4">
          <p className="font-extrabold text-slate-700 text-sm tracking-tight">Vitrine Nails Studio</p>
          <p className="text-xs mt-1 text-slate-400 font-medium">Atendimento Especializado com Hora Marcada</p>
          <p className="text-[10px] text-slate-300 font-bold uppercase tracking-widest mt-6">
            © {new Date().getFullYear()} Todos os direitos reservados
          </p>
        </div>
      </footer>
    </div>
  );
}
