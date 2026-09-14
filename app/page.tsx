'use client';

import React from 'react';
import { Navbar } from '@/components/saas/Navbar';
import { HeroSection } from '@/components/saas/HeroSection';
import { HowItWorksSection } from '@/components/saas/HowItWorksSection';
import { PricingSection } from '@/components/saas/PricingSection';
import { FAQSection } from '@/components/saas/FAQSection';
import { Footer } from '@/components/saas/Footer';

export default function Home() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans flex flex-col justify-between selection:bg-indigo-500 selection:text-white">
      <Navbar />
      <main className="flex-1">
        <HeroSection />
        <HowItWorksSection />
        <PricingSection />
        <FAQSection />
      </main>
      <Footer />
    </div>
  );
}
