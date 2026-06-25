'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Sparkles, Menu, X } from 'lucide-react';

interface StorefrontHeaderProps {
  displayName: string;
  phone: string;
  showLogin?: boolean;
}

export function StorefrontHeader({ displayName, phone, showLogin = false }: StorefrontHeaderProps) {
  const [isOpen, setIsOpen] = useState(false);
  const firstName = displayName.split(' ')[0];

  return (
    <header className="sticky top-0 z-50 w-full bg-white/80 backdrop-blur-md border-b border-rose-100/40">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 h-16 flex items-center justify-between">
        {/* Logo redirecting to homepage */}
        <Link href="/" className="text-xl font-black text-rose-600 tracking-tight flex items-center gap-1.5 font-jakarta hover:opacity-90 transition-opacity">
          <Sparkles size={18} className="fill-rose-100" />
          <span>{firstName} Nails</span>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-6">
          <a href="#servicos" className="text-sm font-bold text-slate-500 hover:text-rose-600 transition-colors">
            Serviços
          </a>
          <a href="#portfolio" className="text-sm font-bold text-slate-500 hover:text-rose-600 transition-colors">
            Portfolio
          </a>
          {showLogin && (
            <Link href="/login" className="text-sm font-bold text-slate-500 hover:text-rose-600 transition-colors">
              Login
            </Link>
          )}
          <a
            href={`https://wa.me/${phone}`}
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-2 bg-rose-600 text-white text-xs font-black rounded-xl hover:bg-rose-700 active:scale-95 transition-all shadow-md shadow-rose-200"
          >
            Fale Comigo
          </a>
        </nav>

        {/* Burger Button (Mobile) */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="md:hidden p-2 text-slate-500 hover:text-rose-600 transition-colors cursor-pointer"
          aria-label={isOpen ? 'Fechar Menu' : 'Abrir Menu'}
        >
          {isOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Mobile Drawer/Menu */}
      {isOpen && (
        <div className="md:hidden absolute top-16 left-0 right-0 bg-white border-b border-rose-100/60 shadow-lg px-6 py-6 flex flex-col gap-4 animate-in slide-in-from-top-4 duration-200">
          <a
            href="#servicos"
            onClick={() => setIsOpen(false)}
            className="text-sm font-bold text-slate-600 hover:text-rose-600 transition-colors py-2 border-b border-rose-50/50"
          >
            Serviços
          </a>
          <a
            href="#portfolio"
            onClick={() => setIsOpen(false)}
            className="text-sm font-bold text-slate-600 hover:text-rose-600 transition-colors py-2 border-b border-rose-50/50"
          >
            Portfolio
          </a>
          {showLogin && (
            <Link
              href="/login"
              onClick={() => setIsOpen(false)}
              className="text-sm font-bold text-slate-600 hover:text-rose-600 transition-colors py-2 border-b border-rose-50/50"
            >
              Login
            </Link>
          )}
          <a
            href={`https://wa.me/${phone}`}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => setIsOpen(false)}
            className="w-full text-center px-4 py-3 bg-rose-600 text-white text-sm font-black rounded-xl hover:bg-rose-700 active:scale-95 transition-all shadow-md shadow-rose-200 mt-2"
          >
            Fale Comigo
          </a>
        </div>
      )}
    </header>
  );
}
