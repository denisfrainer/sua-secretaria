'use client';

import React, { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import {
  Copy,
  Check
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';

export default function BookingLinkPage() {
  const [slug, setSlug] = useState('');
  const [originalSlug, setOriginalSlug] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [showCopySuccess, setShowCopySuccess] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  const supabase = createClient();

  useEffect(() => {
    async function fetchData() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserId(user.id);
        const { data: profile } = await supabase
          .from('profiles')
          .select('slug, avatar_url')
          .eq('id', user.id)
          .single();

        if (profile) {
          setSlug(profile.slug || '');
          setOriginalSlug(profile.slug || '');
          setAvatarUrl(profile.avatar_url);
        }
      }
      setIsLoading(false);
    }
    fetchData();
  }, [supabase]);

  const handleSave = async () => {
    if (!userId || isSaving) return;

    setIsSaving(true);
    try {
      // Basic slug normalization (lowercase, no spaces)
      const normalizedSlug = slug.toLowerCase().replace(/[^a-z0-9-]/g, '');

      const { error } = await supabase
        .from('profiles')
        .update({ slug: normalizedSlug })
        .eq('id', userId);

      if (error) throw error;

      setOriginalSlug(normalizedSlug);
      setSlug(normalizedSlug);
      console.log('[BOOKING_LINK] Slug successfully updated to:', normalizedSlug);
    } catch (err) {
      console.error('[BOOKING_LINK] Error saving slug:', err);
      alert('Erro ao salvar o link. Tente novamente.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCopy = async () => {
    const fullUrl = `sua-secretaria.netlify.app/s/${slug}`;
    try {
      await navigator.clipboard.writeText(fullUrl);
      setShowCopySuccess(true);
      setTimeout(() => setShowCopySuccess(false), 2000);
    } catch (err) {
      console.error('[COPY] Failed to copy:', err);
    }
  };

  const handleWhatsAppShare = () => {
    const fullUrl = `${window.location.origin}/s/${slug}`;
    const text = `Confira meu link de agendamento online: ${fullUrl}`;
    const waUrl = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(waUrl, '_blank');
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto flex flex-col gap-12 pb-20">

      {/* 1. MINIMAL HEADER */}
      <div className="flex flex-col gap-3">
        <h1 className="text-[32px] font-extrabold tracking-tight text-slate-900 leading-none">
          Link de Agendamento
        </h1>
        <p className="text-[17px] font-medium text-slate-500 leading-relaxed">
          Personalize seu endereço e compartilhe com suas clientes.
        </p>
      </div>

      {/* 2. MINIMAL EDITOR SECTION */}
      <div className="flex flex-col gap-10">
        <div className="flex flex-col gap-4">
          <label className="text-[13px] font-black text-slate-400 uppercase tracking-widest pl-1">Identificador do Link</label>

          {/* FIXED LINK INPUT LAYOUT */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-0 bg-white sm:bg-slate-50/50 rounded-2xl border border-slate-100 overflow-hidden group focus-within:ring-4 focus-within:ring-purple-500/5 focus-within:border-purple-500/30 transition-all">
            <div className="px-5 py-5 bg-slate-100/50 sm:bg-transparent border-b sm:border-b-0 sm:border-r border-slate-100 text-[16px] font-bold text-slate-400 shrink-0 whitespace-nowrap">
              sua-secretaria.netlify.app/s/
            </div>
            <input
              type="text"
              value={slug}
              onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
              className="flex-1 px-5 py-5 bg-transparent text-[18px] font-bold text-purple-600 focus:outline-none placeholder:text-slate-300"
              placeholder="seu-nome"
            />
          </div>

          <div className="flex items-center gap-2 text-[13px] font-bold text-slate-400 ml-1">
            Use apenas letras, números e hifens.
          </div>
        </div>

        {/* MINIMAL ACTION BUTTONS */}
        <div className="flex flex-col gap-4">
          <button
            onClick={handleSave}
            disabled={isSaving || slug === originalSlug}
            className={`
              h-[72px] w-full rounded-2xl font-bold text-[18px] flex items-center justify-center gap-3 transition-all active:scale-95
              ${slug === originalSlug
                ? 'bg-slate-100 text-slate-300 cursor-not-allowed'
                : 'bg-slate-900 text-white hover:bg-black shadow-lg shadow-black/5'}
            `}
          >
            {isSaving ? 'Salvando...' : 'Salvar link'}
          </button>

          <div className="grid grid-cols-2 gap-4">
            <button
              onClick={handleCopy}
              className="h-[72px] rounded-2xl bg-white border border-slate-200 text-slate-900 font-bold text-[16px] flex items-center justify-center gap-2 hover:bg-slate-50 transition-all active:scale-95 shadow-sm"
            >
              <AnimatePresence mode="wait">
                {showCopySuccess ? (
                  <motion.div
                    key="success"
                    initial={{ y: 10, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: -10, opacity: 0 }}
                    className="flex items-center gap-2 text-emerald-600"
                  >
                    <Check size={20} />
                    Copiado
                  </motion.div>
                ) : (
                  <motion.div
                    key="copy"
                    initial={{ y: 10, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: -10, opacity: 0 }}
                    className="flex items-center gap-2"
                  >
                    <Copy size={20} className="text-slate-400" />
                    Copiar
                  </motion.div>
                )}
              </AnimatePresence>
            </button>

            <button
              onClick={handleWhatsAppShare}
              className="h-[72px] rounded-2xl bg-[#25D366] text-white font-bold text-[16px] flex items-center justify-center gap-2 hover:brightness-105 transition-all active:scale-95 shadow-lg shadow-emerald-500/10"
            >
              <Image
                src="/assets/WhatsApp.svg"
                alt="WhatsApp"
                width={22}
                height={22}
                className="brightness-0 invert"
              />
              Enviar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
