'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { User, Shield, ChevronLeft } from 'lucide-react';
import Link from 'next/link';
import { ProfileIdentityForm } from '@/components/dashboard/settings/ProfileIdentityForm';
import { ProfileSecurityForm } from '@/components/dashboard/settings/ProfileSecurityForm';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 }
};

export default function ProfileSettingsPage() {
  return (
    <div className="w-full max-w-5xl mx-auto px-4 py-8 md:py-12">
      <div className="flex flex-col gap-10">
        
        {/* Navigation / Header */}
        <div className="flex flex-col gap-4">
          <Link 
            href="/dashboard"
            className="flex items-center gap-2 text-slate-400 hover:text-slate-900 transition-colors w-fit group"
          >
            <ChevronLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
            <span className="text-sm font-bold uppercase tracking-widest">Dashboard</span>
          </Link>
          
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-lg shadow-blue-500/20">
              <User size={24} />
            </div>
            <div className="flex flex-col">
              <h1 className="text-3xl font-black text-slate-950 tracking-tight leading-tight">Perfil de Usuário</h1>
              <p className="text-base font-medium text-slate-400">Gerencie sua identidade e segurança pessoal.</p>
            </div>
          </div>
        </div>

        {/* Content Sections */}
        <motion.div 
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="flex flex-col gap-12"
        >
          <motion.div variants={itemVariants}>
            <ProfileIdentityForm />
          </motion.div>

          <motion.div variants={itemVariants}>
            <ProfileSecurityForm />
          </motion.div>
        </motion.div>

      </div>
    </div>
  );
}
