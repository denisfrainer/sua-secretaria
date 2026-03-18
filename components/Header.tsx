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
    { label: t('features'), href: '#features' },
    { label: t('contact'), href: '#contact' },
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
                  className="text-[#00FF41] font-mono hover:text-[#00D135] hover:underline underline-offset-4 decoration-[#00FF41]/50 transition-all text-sm uppercase tracking-wider"
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
          fixed top-14 right-2 z-40 bg-[var(--primary)] backdrop-blur-md border border-white/20 rounded-lg
          md:hidden w-[190px]
          transition-all duration-500 ease-in-out
          ${isMenuOpen
            ? 'translate-y-0 opacity-100'
            : '-translate-y-full opacity-0 pointer-events-none'
          }
        `}
      >
        <nav className="px-6 py-3 space-y-2 text-right">
          {navItems.map((item) => (
            <a
              key={item.href}
              href={item.href}
              onClick={() => setIsMenuOpen(false)}
              className="block text-[#00FF41] font-mono hover:text-[#00D135] hover:underline underline-offset-4 decoration-[#00FF41]/50 transition-all text-sm py-2 whitespace-nowrap uppercase tracking-wider"
            >
              {item.label}
            </a>
          ))}
        </nav>
      </div>
    </>
  );
}
