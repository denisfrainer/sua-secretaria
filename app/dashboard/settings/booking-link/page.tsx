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
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserId(user.id);
        const { data: profile } = await supabase
          .from('profiles')
          .select('slug')
          .eq('id', user.id)
          .single();

        if (profile) {
          setSlug(profile.slug || '');
          setOriginalSlug(profile.slug || '');
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
      const normalizedSlug = slug.toLowerCase().replace(/[^a-z0-9-]/g, '');

      const { error } = await supabase
        .from('profiles')
        .update({ slug: normalizedSlug })
        .eq('id', userId);

      if (error) throw error;

      setOriginalSlug(normalizedSlug);
      setSlug(normalizedSlug);
      setShowSaveSuccess(true);
      setTimeout(() => setShowSaveSuccess(false), 3000);
      console.log('[BOOKING_LINK] Slug updated to:', normalizedSlug);
    } catch (err) {
      console.error('[BOOKING_LINK] Error saving slug:', err);
      alert('Erro ao salvar o link. Tente novamente.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCopy = async () => {
    const fullUrl = `sua-secretaria.netlify.app/${slug}`;
    try {
      await navigator.clipboard.writeText(fullUrl);
      setShowCopySuccess(true);
      setTimeout(() => setShowCopySuccess(false), 2000);
    } catch (err) {
      console.error('[COPY] Failed to copy:', err);
    }
  };

  const handleTestLink = () => {
    window.open(`https://sua-secretaria.netlify.app/${slug}`, '_blank');
  };

  const handleWhatsAppShare = () => {
    const fullUrl = `https://sua-secretaria.netlify.app/${slug}`;
    const text = `Confira meu link de agendamento online: ${fullUrl}`;
    const waUrl = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(waUrl, '_blank');
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto flex flex-col gap-10 pb-24 px-4">

      {/* STRIPE HEADER */}
      <div className="flex flex-col gap-2">
        <h1 className="text-4xl font-extrabold tracking-tight text-gray-900 leading-tight">
          Link de Agendamento
        </h1>
        <p className="text-lg font-medium text-gray-500 leading-relaxed">
          O endereço principal para suas clientes agendarem horários com você.
        </p>
      </div>

      {/* MAIN CARD: STRIPE STYLE */}
      <div className="bg-white rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100 p-8 flex flex-col gap-8 transition-all hover:shadow-[0_8px_30px_rgb(0,0,0,0.06)]">
        
        {/* SMART INPUT AREA */}
        <div className="flex flex-col gap-4">
          <label className="text-xs font-black uppercase tracking-[0.2em] text-gray-400 pl-1">
            Seu endereço personalizado
          </label>

          <div className="relative flex items-center bg-gray-50/50 rounded-2xl border-2 border-gray-100 focus-within:border-blue-500 focus-within:bg-white focus-within:ring-4 focus-within:ring-blue-50 transition-all p-1.5 overflow-hidden">
            <div className="hidden sm:block pl-4 pr-1 text-base font-bold text-gray-400 select-none">
              sua-secretaria.netlify.app/
            </div>
            <input
              type="text"
              value={slug}
              onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
              className="flex-1 bg-transparent px-2 py-3 text-lg font-bold text-gray-900 focus:outline-none placeholder:text-gray-200"
              placeholder="ex: maria-silva"
            />
            
            {/* INTEGRATED COPY BUTTON */}
            <button 
              onClick={handleCopy}
              className={`
                h-11 px-6 rounded-xl font-bold text-sm flex items-center gap-2 transition-all active:scale-95
                ${showCopySuccess ? 'bg-emerald-50 text-emerald-600' : 'bg-white shadow-sm border border-gray-100 text-gray-700 hover:bg-gray-50'}
              `}
            >
              <AnimatePresence mode="wait">
                {showCopySuccess ? (
                  <motion.div key="check" initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="flex items-center gap-2">
                    <Check size={16} strokeWidth={3} />
                    Copiado!
                  </motion.div>
                ) : (
                  <motion.div key="copy" initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="flex items-center gap-2">
                    <Copy size={16} />
                    Copiar
                  </motion.div>
                )}
              </AnimatePresence>
            </button>
          </div>
        </div>

        {/* SAVE ACTION */}
        <div className="flex items-center justify-between pt-2 border-t border-gray-50 mt-2">
          <p className="text-sm font-medium text-gray-400 italic">
            {slug !== originalSlug ? 'Você tem alterações não salvas' : 'O link está atualizado'}
          </p>
          <button
            onClick={handleSave}
            disabled={isSaving || slug === originalSlug}
            className={`
              h-12 px-8 rounded-xl font-bold text-sm flex items-center gap-2 transition-all active:scale-95
              ${slug === originalSlug
                ? 'bg-gray-50 text-gray-300 cursor-not-allowed'
                : 'bg-blue-600 text-white hover:bg-blue-700 shadow-md shadow-blue-500/10'}
            `}
          >
            {isSaving ? <Save className="animate-spin" size={16} /> : <Save size={16} />}
            Salvar link
          </button>
        </div>
      </div>

      {/* STRIPE STYLE ACTION BUTTONS (END OF 1ST FOLD) */}
      <div className="flex flex-col gap-4 mt-4">
        
        <button
          onClick={handleTestLink}
          className="w-full h-[72px] bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-bold text-lg flex items-center justify-center gap-3 shadow-lg shadow-blue-500/20 active:scale-[0.98] transition-all"
        >
          <ExternalLink size={22} strokeWidth={2.5} />
          Testar link
        </button>

        <button
          onClick={handleWhatsAppShare}
          className="w-full h-[72px] bg-[#25D366] hover:bg-[#22c35e] text-white rounded-2xl font-bold text-lg flex items-center justify-center gap-3 shadow-lg shadow-emerald-500/20 active:scale-[0.98] transition-all"
        >
          <Image
            src="/assets/WhatsApp.svg"
            alt="WhatsApp"
            width={28}
            height={28}
            className="brightness-0 invert"
          />
          Enviar pelo WhatsApp
        </button>

      </div>

      {/* CONFIDENCE BADGE */}
      <div className="flex items-center justify-center gap-2 text-gray-400 mt-8 opacity-50">
        <CheckCircle2 size={16} />
        <span className="text-xs font-bold uppercase tracking-widest">Configuração Segura e Ativa</span>
      </div>

      <AnimatePresence>
        {showSaveSuccess && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-gray-900 text-white px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-3 z-[100]"
          >
            <div className="w-6 h-6 bg-emerald-500 rounded-full flex items-center justify-center">
              <Check size={14} strokeWidth={4} />
            </div>
            <span className="font-bold">Link salvo com sucesso!</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
