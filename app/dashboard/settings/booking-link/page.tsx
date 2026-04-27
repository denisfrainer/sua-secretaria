'use client';

import React, { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import {
  Copy,
  Check,
  ExternalLink,
  Save,
  CheckCircle2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import { MinimalistHeader } from '@/components/dashboard/MinimalistHeader';

export default function BookingLinkPage() {
  const [slug, setSlug] = useState('');
  const [originalSlug, setOriginalSlug] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [showCopySuccess, setShowCopySuccess] = useState(false);
  const [showSaveSuccess, setShowSaveSuccess] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  const supabase = createClient();

  useEffect(() => {
    async function fetchData() {
      setIsLoading(true);
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          setUserId(user.id);
          // Prioritize profiles table as requested in directives
          const { data: profile } = await supabase
            .from('profiles')
            .select('slug')
            .eq('id', user.id)
            .single();

          if (profile?.slug) {
            setSlug(profile.slug);
            setOriginalSlug(profile.slug);
          }
        }
      } catch (error) {
        console.error('[BOOKING_LINK] Initial fetch error:', error);
      } finally {
        setIsLoading(false);
      }
    }
    fetchData();
  }, [supabase]);

  // Dynamic URL construction
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '') || 'https://sua-secretaria.netlify.app';
  const fullUrl = `${baseUrl}/${slug}`;

  const handleSave = async () => {
    if (!userId || isSaving || !slug) return;

    setIsSaving(true);
    try {
      const normalizedSlug = slug.toLowerCase().trim().replace(/[^a-z0-9-]/g, '');

      const { error } = await supabase
        .from('profiles')
        .update({ slug: normalizedSlug })
        .eq('id', userId);

      if (error) throw error;

      setOriginalSlug(normalizedSlug);
      setSlug(normalizedSlug);
      setShowSaveSuccess(true);
      setTimeout(() => setShowSaveSuccess(false), 3000);
      console.log('[BOOKING_LINK] Slug updated successfully:', normalizedSlug);
    } catch (err) {
      console.error('[BOOKING_LINK] Error saving slug:', err);
      alert('Erro ao salvar o link. Verifique se o nome já está em uso.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCopy = async () => {
    if (!slug) return;
    try {
      await navigator.clipboard.writeText(fullUrl);
      setShowCopySuccess(true);
      setTimeout(() => setShowCopySuccess(false), 2000);
    } catch (err) {
      console.error('[COPY] Failed to copy:', err);
    }
  };

  const handleTestLink = () => {
    if (!slug) return;
    window.open(fullUrl, '_blank');
  };

  const handleWhatsAppShare = () => {
    if (!slug) return;
    const message = encodeURIComponent(`Olá! Agende seu horário comigo através do link: ${fullUrl}`);
    window.open(`https://wa.me/?text=${message}`, '_blank');
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto flex flex-col pb-24 px-4 overflow-x-hidden space-y-6">
      <div className="pt-6">
        <MinimalistHeader title="" />
        <h1 className="text-2xl font-semibold text-gray-900 tracking-tight">
          Link de Agendamento
        </h1>
        <p className="text-sm text-gray-500 leading-relaxed mt-2">
          O endereço principal para suas clientes agendarem horários com você.
        </p>
      </div>

      {/* MAIN CARD: STRIPE STYLE */}
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-5 flex flex-col space-y-4">
        
        {/* SMART INPUT AREA */}
        <div className="flex flex-col">
          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 block">
            Seu endereço personalizado
          </label>

          <div className="relative group">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400 text-sm font-medium">
              /
            </div>
            <input
              type="text"
              value={slug}
              onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
              className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 block w-full pl-6 p-2.5 transition-all font-medium"
              placeholder="ex: maria-silva"
            />
          </div>
        </div>

        {/* SAVE ACTION */}
        <div className="flex items-center justify-between pt-2">
          <p className="text-[10px] font-medium text-gray-400 uppercase tracking-wide">
            {slug !== originalSlug ? 'Alterações não salvas' : 'Link atualizado'}
          </p>
          <button
            onClick={handleSave}
            disabled={isSaving || slug === originalSlug}
            className={`
              h-10 px-4 rounded-lg font-medium text-sm flex items-center gap-2 transition-all active:scale-95
              ${slug === originalSlug
                ? 'bg-gray-50 text-gray-400 cursor-not-allowed border border-gray-200'
                : 'bg-blue-600 text-white hover:bg-blue-700 shadow-sm'}
            `}
          >
            {isSaving ? <Save className="animate-spin" size={14} /> : <Save size={14} />}
            Salvar link
          </button>
        </div>
      </div>

      {/* ACTION BUTTONS: COMPACT SECONDARY STACK */}
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={handleCopy}
          className="h-10 bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 rounded-lg text-sm font-medium flex items-center justify-center gap-2 active:scale-95 transition-all shadow-sm"
        >
          <AnimatePresence mode="wait">
            {showCopySuccess ? (
              <motion.div key="check" initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="flex items-center gap-2 text-emerald-600">
                <Check size={16} strokeWidth={3} />
                Copiado
              </motion.div>
            ) : (
              <motion.div key="copy" initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="flex items-center gap-2">
                <Copy size={16} />
                Copiar link
              </motion.div>
            )}
          </AnimatePresence>
        </button>

        <button
          onClick={handleTestLink}
          className="h-10 bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 rounded-lg text-sm font-medium flex items-center justify-center gap-2 active:scale-95 transition-all shadow-sm"
        >
          <ExternalLink size={16} />
          Testar link
        </button>
      </div>

      <button
        onClick={handleWhatsAppShare}
        className="w-full h-12 bg-[#25D366] hover:bg-[#22c35e] text-white rounded-xl font-bold text-sm flex items-center justify-center gap-3 shadow-md shadow-emerald-500/10 active:scale-[0.98] transition-all"
      >
        <Image
          src="/assets/WhatsApp.svg"
          alt="WhatsApp"
          width={20}
          height={20}
          className="brightness-0 invert"
        />
        Enviar pelo WhatsApp
      </button>

      {/* CONFIDENCE BADGE */}
      <div className="flex items-center justify-center gap-2 text-gray-400 pt-4 opacity-40">
        <CheckCircle2 size={14} />
        <span className="text-[10px] font-bold uppercase tracking-[0.2em]">Configuração Ativa</span>
      </div>

      <AnimatePresence>
        {showSaveSuccess && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-gray-900 text-white px-4 py-3 rounded-xl shadow-xl flex items-center gap-3 z-[100]"
          >
            <div className="w-5 h-5 bg-emerald-500 rounded-full flex items-center justify-center">
              <Check size={12} strokeWidth={4} />
            </div>
            <span className="text-sm font-medium">Link salvo com sucesso!</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
