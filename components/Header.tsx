'use client';

import { useState } from 'react';
import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { LanguageSwitcher } from './LanguageSwitcher';
import { LayoutDashboard } from 'lucide-react';

export function Header() {
  const t = useTranslations('Header');
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const navItems = [
    { label: 'Home', href: '/' },
    { label: 'Soluções', href: '#solucoes' },
    { label: 'Preços', href: '#precos' },
    { label: 'FAQ', href: '#faq' },
    { label: 'Testar Agente', href: 'https://wa.me/yournumero', highlight: true },
  ];

  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-50 bg-black/40 backdrop-blur-md border-b border-white/20">
        <nav className="max-w-7xl mx-auto px-4">
          <div className="flex items-center justify-between h-14">
            <div className="flex items-center gap-3">
              <a href="/" className="font-heading text-lg font-bold">
                <Image
                  src="/assets/logo.avif"
                  alt="Logo"
                  width={34}
                  height={34}
                  className="w-8 h-auto"
                />
              </a>
              <a 
                href="/dashboard" 
                className="text-gray-400 hover:text-white transition-colors" 
                title="Ir para o Dashboard"
              >
                <LayoutDashboard size={18} />
              </a>
            </div>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center space-x-8">
              {navItems.map((item) => (
                <a
                  key={item.href}
                  href={item.href}
                  className={`font-mono transition-all text-base uppercase tracking-wider flex items-center
                    ${(item as any).highlight 
                      ? 'border border-[#00FF41] px-3 py-1 bg-[#00FF41]/10 rounded-md text-[#00FF41] shadow-[0_0_10px_rgba(0,255,65,0.3)] hover:bg-[#00FF41]/20' 
                      : 'text-[#00FF41] hover:text-[#00D135] hover:underline underline-offset-4 decoration-[#00FF41]/50'
                    }`}
                >
                  {item.label}
                </a>
              ))}
              <LanguageSwitcher />
            </div>

            {/* Mobile: Menu Button + Language Switcher */}
            <div className="md:hidden flex items-center gap-3">
              <LanguageSwitcher />
              <button
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="p-2 rounded-lg hover:bg-white/10 transition-colors"
                aria-label="Menu"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  {isMenuOpen ? (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  ) : (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  )}
                </svg>
              </button>
            </div>
          </div>
        </nav>
      </header>

      {/* Mobile Menu */}
      <div
        className={`
          fixed top-14 right-2 z-40 bg-black/80 backdrop-blur-md border border-white/10 shadow-lg rounded-xl
          md:hidden w-[180px]
          transition-all duration-300 ease-in-out
          ${isMenuOpen
            ? 'translate-y-0 opacity-100'
            : '-translate-y-full opacity-0 pointer-events-none'
          }
        `}
      >
        <nav className="px-4 py-3 space-y-1 text-right flex flex-col items-end">
          {navItems.map((item) => (
            <a
              key={item.href}
              href={item.href}
              onClick={() => setIsMenuOpen(false)}
              className={`block text-sm py-1.5 whitespace-nowrap font-body font-medium transition-all
                ${(item as any).highlight 
                  ? 'border border-[#00FF41] px-2 py-1 bg-[#00FF41]/10 rounded-md text-[#00FF41] shadow-[0_0_8px_rgba(0,255,65,0.2)] mt-1 hover:bg-[#00FF41]/20 inline-block text-center w-full text-xs font-bold' 
                  : 'text-gray-300 hover:text-[#00FF41]'
                }`}
            >
              {item.label}
            </a>
          ))}
        </nav>
      </div>
    </>
  );
}
