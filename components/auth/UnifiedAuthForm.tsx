"use client";

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, ArrowRight, CheckCircle2, Loader2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import GoogleLoginButton from '@/components/GoogleLoginButton';

export default function UnifiedAuthForm() {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSent, setIsSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const supabase = createClient();

  const handleMagicLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || isLoading) return;

    try {
      setIsLoading(true);
      setError(null);

      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback?next=/dashboard`,
        },
      });

      if (error) {
        throw error;
      }

      setIsSent(true);
    } catch (err: any) {
      console.error('❌ [AUTH] Magic Link Error:', err.message);
      setError(err.message || 'Ocorreu um erro ao enviar o e-mail.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full">
      <AnimatePresence mode="wait">
        {!isSent ? (
          <motion.div
            key="form"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="flex flex-col gap-6"
          >
            {/* GOOGLE CTA */}
            <div className="w-full">
              <GoogleLoginButton text="Continuar com o Google" />
            </div>

            {/* DIVIDER */}
            <div className="relative flex items-center gap-4">
              <div className="h-px flex-1 bg-slate-100" />
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-300">ou</span>
              <div className="h-px flex-1 bg-slate-100" />
            </div>

            {/* MAGIC LINK FORM */}
            <form onSubmit={handleMagicLink} className="flex flex-col gap-3">
              <div className="relative group">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors">
                  <Mail size={18} />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Seu melhor e-mail"
                  className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-base font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500/50 transition-all"
                />
              </div>

              {error && (
                <p className="text-xs font-semibold text-rose-500 px-1">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-slate-900 text-white py-3 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-slate-800 active:scale-[0.98] transition-all disabled:opacity-70 disabled:cursor-not-allowed group"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="animate-spin" size={20} />
                    <span>Enviando...</span>
                  </>
                ) : (
                  <>
                    Continuar com E-mail
                    <ArrowRight size={18} className="group-hover:translate-x-0.5 transition-transform" />
                  </>
                )}
              </button>
            </form>
          </motion.div>
        ) : (
          <motion.div
            key="success"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: 'spring', damping: 20, stiffness: 300 }}
            className="flex flex-col items-center text-center py-4 gap-4"
          >
            <div className="w-16 h-16 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center shadow-inner">
              <CheckCircle2 size={32} />
            </div>
            <div className="flex flex-col gap-1">
              <h3 className="text-xl font-bold text-slate-900 tracking-tight">Verifique seu e-mail</h3>
              <p className="text-sm font-medium text-slate-500 leading-relaxed">
                Enviamos um link de acesso para <br />
                <span className="font-bold text-slate-900">{email}</span>
              </p>
            </div>
            <button
              onClick={() => setIsSent(false)}
              className="text-xs font-bold text-slate-400 hover:text-slate-600 transition-colors mt-2"
            >
              Tentar outro e-mail
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
