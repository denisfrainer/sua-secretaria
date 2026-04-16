import { Navbar } from '@/components/landing/Navbar';
import { Hero } from '@/components/landing/Hero';
import { PhoneMockup } from '@/components/PhoneMockup';
import { LandingSections } from '@/components/LandingSections';

export default function Home() {
  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-slate-50/50 overflow-hidden text-black font-sans">
        {/* New Hero Section with integrated Logo Carousel */}
        <Hero />

        {/* Existing Content */}
        <LandingSections />
      </main>
    </>
  );
}
