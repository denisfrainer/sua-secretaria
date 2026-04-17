'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Menu, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export function Navbar() {
  const [isOpen, setIsOpen] = useState(false);

  const navLinks = [
    { name: 'Diferenciais', href: '#diferenciais' },
    { name: 'Como Funciona', href: '#setup' },
    { name: 'Perguntas Frequentes', href: '#faq' },
  ];

  const handleLoginClick = () => {
    console.log('[UI_EVENT] "Já sou cliente" (Login) Button Clicked', {
      timestamp: new Date().toISOString(),
      location: 'Navbar'
    });
  };

  return (
    <>
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
              className="text-sm font-semibold text-slate-700 border-2 border-slate-200 px-5 py-2 rounded-full hover:bg-slate-50 transition-all active:scale-95"
            >
              Já sou cliente
            </Link>

            {/* Burger Menu Button - Hidden when menu is open */}
            <button
              onClick={() => setIsOpen(true)}
              className="p-2 text-slate-600 hover:text-purple-600 transition-colors"
              aria-label="Open Menu"
            >
              <Menu className="w-8 h-8" />
            </button>
          </div>
        </div>
      </nav>

      {/* Full-Screen Mobile Menu Overlay */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="fixed inset-0 z-[9999] bg-white flex flex-col items-center"
          >
            {/* Menu Header with Close Button */}
            <div className="h-20 w-full px-4 sm:px-6 flex items-center justify-between border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Image
                  src="/assets/eliza.png"
                  alt="Logo"
                  width={32}
                  height={32}
                  className="w-8 h-8"
                />
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="p-2 text-slate-600 hover:text-purple-600 transition-colors"
                aria-label="Close Menu"
              >
                <X className="w-8 h-8" />
              </button>
            </div>

            {/* Menu Links Stacked */}
            <div className="flex-1 flex flex-col items-center justify-center p-8 gap-8 text-center">
              {navLinks.map((link, i) => (
                <motion.div
                  key={link.name}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: i * 0.05 }}
                >
                  <Link
                    href={link.href}
                    onClick={() => setIsOpen(false)}
                    className="text-3xl font-bold text-slate-900 hover:text-purple-600 transition-colors tracking-tight"
                  >
                    {link.name}
                  </Link>
                </motion.div>
              ))}
              
              <div className="mt-8 pt-8 border-t border-slate-100 w-full flex flex-col items-center gap-4">
                 <Link
                  href="/login"
                  onClick={() => setIsOpen(false)}
                  className="w-full max-w-[280px] bg-purple-600 text-white px-8 py-5 rounded-2xl font-bold text-xl shadow-2xl shadow-purple-100 hover:bg-purple-700 active:scale-95 transition-all text-center"
                >
                  Testar grátis
                </Link>
                <p className="text-sm text-slate-400 font-medium">
                  Atendimento oficial Meta via WhatsApp
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
