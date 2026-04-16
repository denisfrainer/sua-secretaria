'use client';

import Link from 'next/link';
import Image from 'next/image';

export function Navbar() {
  const handleLoginClick = () => {
    console.log('[UI_EVENT] "Já sou cliente" (Login) Button Clicked', {
      timestamp: new Date().toISOString(),
      location: 'Navbar'
    });
  };

  return (
    <nav className="fixed top-0 w-full z-50 bg-white/80 backdrop-blur-md border-b border-slate-100 h-20 flex items-center">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <Image
            src="/assets/eliza.png"
            alt="Sua SecretarIA Logo"
            width={32}
            height={32}
            className="w-8 h-8"
          />
          <span className="text-xl font-bold text-slate-900 tracking-tight">
            Sua Secretar<span className="text-purple-600">IA</span>
          </span>
        </Link>

        <Link
          href="/login"
          onClick={handleLoginClick}
          className="text-sm font-semibold text-slate-700 border-2 border-slate-200 px-5 py-2 rounded-full hover:bg-slate-50 transition-all active:scale-95"
        >
          Já sou cliente
        </Link>
      </div>
    </nav>
  );
}
