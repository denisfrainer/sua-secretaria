import { Header } from '@/components/Header';
import { HeroSection } from '@/components/HeroSection';
import { PhoneMockup } from '@/components/PhoneMockup';
import { LandingSections } from '@/components/LandingSections';

export default function Home() {
  return (
    <>
      <Header />
      <main className="min-h-screen bg-white overflow-hidden text-black font-sans">
        {/* 1. Hero Section (First Fold + Logos) */}
        <HeroSection />

        {/* 2. Chat WOW Factor (Second Fold) */}
        <PhoneMockup />

        {/* 3-8. Features, Setup, Comparison, Pricing, FAQ, Footer */}
        <LandingSections />
      </main>
    </>
  );
}
