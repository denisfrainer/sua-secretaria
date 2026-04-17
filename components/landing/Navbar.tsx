'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Menu, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export function Navbar() {
  const handleLoginClick = () => {
    console.log('[UI_EVENT] "Já sou cliente" (Login) Button Clicked', {
      timestamp: new Date().toISOString(),
      location: 'Navbar'
    });
  };

  return (
    <nav className="fixed top-0 w-full z-[100] bg-white/80 backdrop-blur-md border-b border-slate-100 h-20 flex items-center">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <Image
            src="/assets/eliza.png"
            alt="Sua SecretarIA Logo"
            width={32}
            height={32}
            className="w-8 h-8"
          />
        </Link>

        <div className="flex items-center gap-4">
          <Link
            href="/login"
            onClick={handleLoginClick}
            className="text-sm font-semibold text-slate-700 hover:text-purple-600 transition-all px-4"
          >
            Já sou cliente
          </Link>

          <Link
            href="/login"
            className="hidden sm:flex items-center justify-center bg-purple-600 text-white px-6 py-2.5 rounded-full font-bold text-sm shadow-lg shadow-purple-100 hover:bg-purple-700 active:scale-95 transition-all"
          >
            Testar grátis
          </Link>
        </div>
      </div>
    </nav>
  );
}
