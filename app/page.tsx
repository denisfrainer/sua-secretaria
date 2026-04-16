import { Navbar } from '@/components/landing/Navbar';
import { Hero } from '@/components/landing/Hero';
import { SocialProof } from '@/components/landing/SocialProof';
import { PhoneMockup } from '@/components/PhoneMockup';
import { LandingSections } from '@/components/LandingSections';

export default function Home() {
  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-slate-50/50 overflow-hidden text-black font-sans">
        {/* New Hero & Social Proof Sections */}
        <Hero />
        <SocialProof />

        {/* Existing Content */}
        <PhoneMockup />
        <LandingSections />
      </main>
    </>
  );
}
