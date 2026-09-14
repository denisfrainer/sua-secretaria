'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Sparkles, Menu, X, ArrowRight, Dices } from 'lucide-react';

export function Navbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="w-full sticky top-0 z-50 bg-white/85 backdrop-blur-md border-b border-rose-100/60 transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 flex items-center justify-between">
        
        {/* Brand Logo */}
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-rose-500 to-pink-500 flex items-center justify-center text-white shadow-md shadow-rose-500/25 group-hover:scale-105 transition-transform">
            <Dices className="w-5 h-5 text-white" />
          </div>
          <div className="flex flex-col">
            <span className="font-extrabold text-xl tracking-tight text-slate-900 flex items-center gap-1.5">
              Roleta <span className="text-transparent bg-clip-text bg-gradient-to-r from-rose-600 to-pink-600">Vantajosa</span>
            </span>
            <span className="text-[10px] font-semibold text-rose-600 tracking-wider uppercase -mt-0.5">
              Fidelização Inteligente
            </span>
          </div>
        </Link>

        {/* Desktop Navigation Links */}
        <nav className="hidden md:flex items-center gap-8">
          <a
            href="#como-funciona"
            className="text-sm font-medium text-slate-600 hover:text-rose-600 transition-colors"
          >
            Como Funciona
          </a>
          <a
            href="#planos"
            className="text-sm font-medium text-slate-600 hover:text-rose-600 transition-colors"
          >
            Planos
          </a>
          <a
            href="#faq"
            className="text-sm font-medium text-slate-600 hover:text-rose-600 transition-colors"
          >
            Dúvidas
          </a>
        </nav>

        {/* Desktop CTA & Login */}
        <div className="hidden md:flex items-center gap-4">
          <Link
            href="/login"
            className="text-sm font-semibold text-slate-700 hover:text-rose-600 px-3 py-2 rounded-lg hover:bg-rose-50/60 transition-all"
          >
            Entrar
          </Link>
          <Link
            href="/login"
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-rose-500 via-rose-600 to-pink-600 hover:from-rose-600 hover:to-pink-700 shadow-lg shadow-rose-500/25 active:scale-95 transition-all"
          >
            <span>Quero minha roleta agora</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {/* Mobile Hamburger Button */}
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          type="button"
          aria-label={mobileMenuOpen ? "Fechar menu" : "Abrir menu"}
          className="md:hidden p-2 rounded-lg text-slate-700 hover:text-rose-600 hover:bg-rose-50 transition-colors"
        >
          {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Mobile Menu Dropdown */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-white/95 backdrop-blur-lg border-b border-rose-100 px-4 pt-3 pb-6 space-y-4 shadow-xl animate-in slide-in-from-top-2">
          <nav className="flex flex-col space-y-3">
            <a
              href="#como-funciona"
              onClick={() => setMobileMenuOpen(false)}
              className="px-3 py-2 rounded-lg text-base font-medium text-slate-700 hover:text-rose-600 hover:bg-rose-50 transition-colors"
            >
              Como Funciona
            </a>
            <a
              href="#planos"
              onClick={() => setMobileMenuOpen(false)}
              className="px-3 py-2 rounded-lg text-base font-medium text-slate-700 hover:text-rose-600 hover:bg-rose-50 transition-colors"
            >
              Planos
            </a>
            <a
              href="#faq"
              onClick={() => setMobileMenuOpen(false)}
              className="px-3 py-2 rounded-lg text-base font-medium text-slate-700 hover:text-rose-600 hover:bg-rose-50 transition-colors"
            >
              Dúvidas
            </a>
          </nav>
          <div className="pt-3 border-t border-slate-100 flex flex-col gap-2.5">
            <Link
              href="/login"
              onClick={() => setMobileMenuOpen(false)}
              className="w-full text-center py-2.5 rounded-xl text-sm font-semibold text-slate-700 hover:bg-slate-50 border border-slate-200"
            >
              Entrar
            </Link>
            <Link
              href="/login"
              onClick={() => setMobileMenuOpen(false)}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-rose-500 to-pink-600 shadow-md shadow-rose-500/25"
            >
              <span>Quero minha roleta agora</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
