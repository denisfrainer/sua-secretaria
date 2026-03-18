'use client';

import { useTranslations } from 'next-intl';

export function Footer() {
  const t = useTranslations('Footer');
  const currentYear = new Date().getFullYear();

  return (
    <footer className="w-full bg-[var(--primary)] border-t border-white/20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 sm:gap-12 text-center md:text-left">
          {/* Column 1: About */}
          <div>
            <h3 className="font-heading text-lg font-bold mb-4">{t('brand')}</h3>
            <p className="text-gray-400 text-base leading-relaxed">
              {t('description')}
            </p>
          </div>

          {/* Column 2: Navigation */}
          <div>
            <h3 className="font-heading text-lg font-bold mb-4">{t('navigation')}</h3>
            <ul className="space-y-2">
              <li>
                <a href="#features" className="text-[#00FF41] font-mono hover:text-[#00D135] hover:underline underline-offset-4 decoration-[#00FF41]/50 transition-all text-base uppercase tracking-wider">
                  {t('features')}
                </a>
              </li>
              <li>
                <a href="#contact" className="text-[#00FF41] font-mono hover:text-[#00D135] hover:underline underline-offset-4 decoration-[#00FF41]/50 transition-all text-base uppercase tracking-wider">
                  {t('contact')}
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Copyright */}
        <div className="mt-12 pt-8 border-t border-white/20 text-center">
          <p className="text-gray-500 text-base">
            {currentYear} © {t('copyright')}
          </p>
        </div>
      </div>
    </footer>
  );
}
