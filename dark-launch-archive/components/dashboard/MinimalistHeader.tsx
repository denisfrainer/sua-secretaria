'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { motion } from 'framer-motion';

interface MinimalistHeaderProps {
  title: string;
}

export function MinimalistHeader({ title }: MinimalistHeaderProps) {
  return (
    <motion.header 
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.25, 0.1, 0.25, 1] }}
      className="w-full flex items-center justify-between mb-10"
    >
      <div className="flex items-center gap-4">
        <Link 
          href="/dashboard"
          className="w-10 h-10 rounded-xl bg-white shadow-sm border border-black/5 flex items-center justify-center shrink-0 hover:bg-gray-50 active:scale-95 transition-all"
        >
          <ArrowLeft size={18} className="text-gray-900" />
        </Link>
        <h1 className="text-3xl sm:text-4xl font-black text-gray-950 tracking-tight leading-none">
          {title}
        </h1>
      </div>
    </motion.header>
  );
}
