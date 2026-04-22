'use client';

import { useTranslations } from 'next-intl';
import Link from 'next/link';

export function CTASection() {
  const t = useTranslations('CTASection');

  return (
    <section
      id="contact"
      className="w-full max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-20 lg:py-24 text-center border-t border-white/20"
    >
      <div className="bg-[var(--primary)] rounded-3xl border border-white/20 p-8 sm:p-12 lg:p-16">
        <h2 className="font-heading text-3xl sm:text-4xl md:text-5xl font-bold mb-6">
          {t('title')}
        </h2>
        <p className="text-lg sm:text-xl text-gray-300 mb-10 max-w-2xl mx-auto leading-relaxed">
          {t('description')}
        </p>
        <Link
          href="/login?mode=signup"
          className="flex w-full items-center justify-center text-center border border-[#00FF41] rounded-2xl bg-transparent font-mono text-[#00FF41] tracking-widest font-bold text-xl px-12 py-6 [text-shadow:0_0_8px_rgba(0,255,65,0.8)] shadow-[0_0_10px_rgba(0,255,65,0.2)] hover:bg-[#00FF41]/10 hover:shadow-[0_0_20px_rgba(0,255,65,0.6)] hover:[text-shadow:0_0_12px_rgba(0,255,65,1)] transition-all duration-300 ease-out"
        >
          {t('button')}
        </Link>
      </div>
    </section>
  );
}
