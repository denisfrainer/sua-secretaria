/*
  LanguageSwitcher.tsx
  Stripe-style language switcher — light mode
*/

'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Globe } from 'lucide-react';

const localeLabels = {
  pt: 'PT',
  en: 'EN',
  es: 'ES',
} as const;

const locales = ['pt', 'en', 'es'] as const;
type Locale = (typeof locales)[number];

export function LanguageSwitcher() {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  const handleMouseEnter = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setIsOpen(true);
  };

  const handleMouseLeave = () => {
    timeoutRef.current = setTimeout(() => {
      setIsOpen(false);
    }, 150);
  };

  const getCurrentLocale = (): Locale => {
    if (pathname.startsWith('/en')) return 'en';
    if (pathname.startsWith('/es')) return 'es';
    return 'pt';
  };

  const currentLocale = getCurrentLocale();
  const pathnameWithoutLocale = pathname.replace(/^\/(pt|en|es)/, '') || '/';
  const inactiveLocales = locales.filter((locale) => locale !== currentLocale);

  return (
    <div
      className="relative"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Trigger */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-100 hover:bg-slate-200 transition-colors border border-slate-200"
        aria-label="Selecionar idioma"
      >
        <Globe className="w-4 h-4 text-slate-500" />
        <span className="text-sm font-medium text-slate-600">
          {localeLabels[currentLocale]}
        </span>
        <svg
          className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Dropdown */}
      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute right-0 h-2 w-full z-50" />
          <div className="absolute right-0 mt-2 w-20 bg-white border border-slate-200 rounded-xl shadow-lg z-50 overflow-hidden">
            {inactiveLocales.map((locale) => (
              <Link
                key={locale}
                href={`/${locale}${pathnameWithoutLocale}`}
                className="block px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors text-center"
                onClick={() => setIsOpen(false)}
              >
                {localeLabels[locale]}
              </Link>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
