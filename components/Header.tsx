'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';

export function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setIsLoggedIn(!!user);
    });
    
    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setIsLoggedIn(!!session);
    });

    return () => subscription.unsubscribe();
  }, [supabase.auth]);

  const navItems = [
    { label: 'Home', href: '/' },
    { label: 'Soluções', href: '#solucoes' },
    { label: 'Preços', href: '#precos' },
    { label: 'FAQ', href: '#faq' },
  ];

  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-xl border-b border-slate-200/60">
        <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <a href="/" className="flex items-center gap-2">
              <Image
                src="/assets/robot.png"
                alt="Logo"
                width={32}
                height={32}
                className="w-8 h-auto"
              />
              <span className="font-bold text-lg text-slate-900">meatende.ai</span>
            </a>

            {/* Desktop Nav */}
            <div className="hidden md:flex items-center gap-8">
              {navItems.map((item) => (
                <a
                  key={item.href}
                  href={item.href}
                  className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors"
                >
                  {item.label}
                </a>
              ))}
              <div className="h-4 w-px bg-slate-200"></div>
              
              {isLoggedIn ? (
                <Link
                  href="/dashboard"
                  className="text-sm font-semibold text-indigo-600 hover:text-indigo-700 transition-colors"
                >
                  Ir para Painel
                </Link>
              ) : (
                <Link 
                  href="/login" 
                  className="text-sm font-semibold text-slate-700 hover:text-indigo-600 transition-colors"
                >
                  Entrar
                </Link>
              )}

              <a
                href="#precos"
                className="inline-flex items-center gap-2 bg-gradient-to-r from-indigo-600 to-violet-600 text-white text-sm font-semibold px-5 py-2.5 rounded-full shadow-md shadow-indigo-500/20 hover:shadow-lg hover:shadow-indigo-500/30 transition-all duration-300"
              >
                Testar Agora
              </a>
            </div>

            {/* Mobile Controls */}
            <div className="md:hidden flex items-center gap-3">
              {!isLoggedIn && (
                 <div className="mr-2">
                   <Link 
                     href="/login" 
                     className="text-sm font-bold text-slate-700 hover:text-indigo-600 transition-colors px-3 py-1.5 rounded-md hover:bg-slate-50"
                   >
                     Entrar
                   </Link>
                 </div>
              )}
              <button
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="p-2 rounded-lg hover:bg-slate-100 transition-colors"
                aria-label="Menu"
              >
                <svg className="w-6 h-6 text-slate-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
          fixed top-16 right-3 z-40 bg-white/95 backdrop-blur-xl border border-slate-200 shadow-xl rounded-2xl
          md:hidden w-[200px]
          transition-all duration-300 ease-in-out
          ${isMenuOpen
            ? 'translate-y-0 opacity-100'
            : '-translate-y-4 opacity-0 pointer-events-none'
          }
        `}
      >
        <nav className="px-4 py-3 space-y-1 flex flex-col">
          {navItems.map((item) => (
            <a
              key={item.href}
              href={item.href}
              onClick={() => setIsMenuOpen(false)}
              className="block text-sm py-2 px-2 rounded-lg font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-all"
            >
              {item.label}
            </a>
          ))}
          {isLoggedIn && (
            <Link
              href="/dashboard"
              onClick={() => setIsMenuOpen(false)}
              className="block text-sm py-2 px-2 rounded-lg font-bold text-indigo-600 hover:bg-slate-50 transition-all"
            >
              Ir para Painel
            </Link>
          )}
          <div className="my-2 border-t border-slate-100"></div>
          <a
            href="#precos"
            onClick={() => setIsMenuOpen(false)}
            className="block text-sm py-2.5 px-4 mt-1 text-center rounded-full font-semibold bg-gradient-to-r from-indigo-600 to-violet-600 text-white"
          >
            Testar Agora
          </a>
        </nav>
      </div>
    </>
  );
}
