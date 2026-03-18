/*
  LanguageSwitcher.tsx
  Dropdown de troca de idioma otimizado para PageSpeed 99+
  Exibe apenas idioma ativo, dropdown mostra idiomas inativos
*/

'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Globe } from 'lucide-react';

// Mapeamento de idiomas para exibição
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

  // Limpa timeout ao desmontar
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
    // Pequeno delay para evitar flickering ao mover o mouse entre trigger e dropdown
    timeoutRef.current = setTimeout(() => {
      setIsOpen(false);
    }, 150);
  };

  // Detecta o idioma atual pelo pathname
  const getCurrentLocale = (): Locale => {
    if (pathname.startsWith('/en')) return 'en';
    if (pathname.startsWith('/es')) return 'es';
    return 'pt';
  };

  const currentLocale = getCurrentLocale();

  // Remove o locale do pathname para construir os links
  const pathnameWithoutLocale = pathname.replace(/^\/(pt|en|es)/, '') || '/';

  // Filtra apenas os idiomas inativos
  const inactiveLocales = locales.filter((locale) => locale !== currentLocale);

  return (
    <div
      className="relative"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Trigger - Idioma Ativo */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 transition-colors border border-white/20"
        aria-label="Selecionar idioma"
      >
        <Globe className="w-4 h-4 text-gray-400" />
        <span className="text-base font-medium text-gray-300">
          {localeLabels[currentLocale]}
        </span>
        <svg
          className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''
            }`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>

      {/* Dropdown - Idiomas Inativos */}
      {isOpen && (
        <>
          {/* Overlay invisível para fechar o dropdown ao clicar fora */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />

          {/* Ponte invisível — cobre o gap entre o botão e o dropdown */}
          <div className="absolute right-0 h-2 w-full z-50" />

          {/* Menu Dropdown */}
          <div
            className="absolute right-0 mt-2 w-20 bg-black/80 backdrop-blur-md border border-white/10 rounded-xl shadow-xl z-50 overflow-hidden"
          >
            {inactiveLocales.map((locale) => (
              <Link
                key={locale}
                href={`/${locale}${pathnameWithoutLocale}`}
                className="block px-4 py-2 text-base text-gray-300 hover:bg-white/10 transition-colors text-center"
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
