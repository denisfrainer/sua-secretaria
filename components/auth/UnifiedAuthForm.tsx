"use client";

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { User, Smartphone, Lock, ArrowRight, CheckCircle2, Loader2, LogIn, UserPlus } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { normalizePhone } from '@/lib/utils/phone';

export default function UnifiedAuthForm() {
  const [mode, setMode] = useState<'login' | 'signup'>('signup');
  const [formData, setFormData] = useState({
    fullName: '',
    whatsapp: '',
    confirmWhatsapp: '',
    password: '',
    confirmPassword: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const supabase = createClient();

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const validate = () => {
    if (mode === 'signup') {
      if (!formData.fullName.trim()) return "O nome é obrigatório.";
      if (formData.whatsapp !== formData.confirmWhatsapp) return "Os números de WhatsApp não conferem.";
      if (formData.password !== formData.confirmPassword) return "As senhas não conferem.";
    }
    if (formData.whatsapp.length < 10) return "O WhatsApp informado é inválido.";
    if (formData.password.length < 6) return "A senha deve ter pelo menos 6 caracteres.";
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading) return;

    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const normalized = normalizePhone(formData.whatsapp);
      const emailMask = `${normalized}@was.app`;

      if (mode === 'signup') {
        const { data, error: signUpError } = await supabase.auth.signUp({
          email: emailMask,
          password: formData.password,
          options: {
            data: {
              full_name: formData.fullName,
              whatsapp: normalized
            }
          }
        });

        if (signUpError) throw signUpError;

        // Update profile table
        if (data.user) {
          const { error: profileError } = await supabase
            .from('profiles')
            .upsert({
              id: data.user.id,
              full_name: formData.fullName,
              email: emailMask, // using mask as email in profile too
            });
          
          if (profileError) console.error('Error updating profile:', profileError);
        }

        setIsSuccess(true);
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: emailMask,
          password: formData.password,
        });

        if (signInError) throw signInError;
        
        window.location.href = '/dashboard';
      }
    } catch (err: any) {
      console.error('❌ [AUTH] Error:', err.message);
      let msg = err.message;
      if (msg.includes('User already registered')) msg = 'Este WhatsApp já está cadastrado. Tente fazer login.';
      if (msg.includes('Invalid login credentials')) msg = 'WhatsApp ou senha incorretos.';
      setError(msg || 'Ocorreu um erro na autenticação.');
    } finally {
      setIsLoading(false);
    }
  };

  if (isSuccess) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex flex-col items-center text-center py-4 gap-4"
      >
        <div className="w-16 h-16 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center shadow-inner">
          <CheckCircle2 size={32} />
        </div>
        <div className="flex flex-col gap-1">
          <h3 className="text-xl font-bold text-slate-900 tracking-tight">Conta criada!</h3>
          <p className="text-sm font-medium text-slate-500 leading-relaxed">
            Sua conta foi criada com sucesso. <br />
            Você já pode acessar o sistema.
          </p>
        </div>
        <button
          onClick={() => window.location.href = '/dashboard'}
          style={{ backgroundColor: '#533AFD' }}
          className="w-full h-[64px] text-white rounded-md font-bold text-base flex items-center justify-center gap-2 hover:opacity-90 transition-all"
        >
          Ir para o Dashboard
          <ArrowRight size={18} />
        </button>
      </motion.div>
    );
  }

  return (
    <div className="w-full">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <AnimatePresence mode="wait">
          <motion.div
            key={mode}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="flex flex-col gap-3"
          >
            {mode === 'signup' && (
              <div className="relative group">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors">
                  <User size={18} />
                </div>
                <input
                  type="text"
                  name="fullName"
                  required
                  value={formData.fullName}
                  onChange={handleInputChange}
                  placeholder="Seu nome completo"
                  className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-md text-base font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500/50 transition-all"
                />
              </div>
            )}

            <div className="relative group">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors">
                <Smartphone size={18} />
              </div>
              <input
                type="tel"
                name="whatsapp"
                required
                value={formData.whatsapp}
                onChange={handleInputChange}
                placeholder="WhatsApp (ex: 11999999999)"
                className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-md text-base font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500/50 transition-all"
              />
            </div>

            {mode === 'signup' && (
              <div className="relative group">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors">
                  <Smartphone size={18} />
                </div>
                <input
                  type="tel"
                  name="confirmWhatsapp"
                  required
                  value={formData.confirmWhatsapp}
                  onChange={handleInputChange}
                  placeholder="Confirmar WhatsApp"
                  className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-md text-base font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500/50 transition-all"
                />
              </div>
            )}

            <div className="relative group">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors">
                <Lock size={18} />
              </div>
              <input
                type="password"
                name="password"
                required
                value={formData.password}
                onChange={handleInputChange}
                placeholder="Sua senha"
                className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-md text-base font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500/50 transition-all"
              />
            </div>

            {mode === 'signup' && (
              <div className="relative group">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors">
                  <Lock size={18} />
                </div>
                <input
                  type="password"
                  name="confirmPassword"
                  required
                  value={formData.confirmPassword}
                  onChange={handleInputChange}
                  placeholder="Confirmar senha"
                  className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-md text-base font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500/50 transition-all"
                />
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        {error && (
          <p className="text-xs font-semibold text-rose-500 px-1">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={isLoading}
          style={{ backgroundColor: '#533AFD' }}
          className="w-full h-[64px] text-white rounded-md font-bold text-base flex items-center justify-center gap-2 hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-70 disabled:cursor-not-allowed group mt-2"
        >
          {isLoading ? (
            <>
              <Loader2 className="animate-spin" size={20} />
              <span>Processando...</span>
            </>
          ) : (
            <>
              {mode === 'signup' ? 'Criar minha conta' : 'Entrar no sistema'}
              {mode === 'signup' ? <UserPlus size={18} /> : <LogIn size={18} />}
            </>
          )}
        </button>

        <div className="flex flex-col items-center gap-2 mt-2">
          <button
            type="button"
            onClick={() => {
              setMode(mode === 'signup' ? 'login' : 'signup');
              setError(null);
            }}
            className="text-sm font-semibold text-indigo-600 hover:text-indigo-800 transition-colors"
          >
            {mode === 'signup' ? 'Já tenho uma conta' : 'Ainda não tenho conta'}
          </button>
        </div>
      </form>
    </div>
  );
}
