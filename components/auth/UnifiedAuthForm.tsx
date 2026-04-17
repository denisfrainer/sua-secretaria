"use client";

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { User, Smartphone, Lock, ArrowRight, CheckCircle2, Loader2, LogIn, UserPlus } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { normalizePhone } from '@/lib/utils/phone';

export default function UnifiedAuthForm() {
  const [mode, setMode] = useState<'login' | 'signup'>('login');
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
      <div className="bg-white rounded-[32px] p-10 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 w-full">
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
            className="w-full h-16 bg-[#533AFD] text-white rounded-2xl font-bold text-base flex items-center justify-center gap-2 hover:opacity-90 transition-all shadow-xl shadow-indigo-100"
          >
            Ir para o Dashboard
            <ArrowRight size={18} />
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="w-full flex flex-col gap-10">
      {/* BRAND HEADER - Dynamic based on Mode */}
      <div className="flex flex-col items-center text-center gap-6">
        <button onClick={() => window.location.href = '/'} className="w-20 h-20 rounded-full bg-white shadow-xl shadow-slate-200/50 border border-slate-100 flex items-center justify-center transition-transform hover:scale-105 active:scale-95 cursor-pointer text-5xl">
            👩🏼‍💼
        </button>
        <div className="flex flex-col gap-2">
            <h1 className="text-[32px] font-extrabold tracking-tight text-slate-900">
                {mode === 'login' ? 'Acesse sua conta' : 'Crie sua conta'}
            </h1>
            <p className="text-[17px] font-medium text-slate-500">
                Comece agora e use grátis por 30 dias.
            </p>
        </div>
      </div>

      {/* FORM CARD */}
      <div className="bg-white rounded-[32px] p-10 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100">
        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <AnimatePresence mode="wait">
            <motion.div
              key={mode}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="flex flex-col gap-4"
            >
              {mode === 'signup' && (
                <div className="relative group">
                  <div className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#533AFD] transition-colors">
                    <User size={20} />
                  </div>
                  <input
                    type="text"
                    name="fullName"
                    required
                    value={formData.fullName}
                    onChange={handleInputChange}
                    placeholder="Seu nome completo"
                    className="w-full pl-14 pr-5 py-4 bg-slate-50/50 border border-slate-100 rounded-2xl text-base font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-4 focus:ring-indigo-500/5 focus:border-[#533AFD]/30 transition-all"
                  />
                </div>
              )}

              <div className="relative group">
                <div className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#533AFD] transition-colors">
                  <Smartphone size={20} />
                </div>
                <input
                  type="tel"
                  name="whatsapp"
                  required
                  value={formData.whatsapp}
                  onChange={handleInputChange}
                  placeholder="WhatsApp (ex: 11999999)"
                  className="w-full pl-14 pr-5 py-4 bg-slate-50/50 border border-slate-100 rounded-2xl text-base font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-4 focus:ring-indigo-500/5 focus:border-[#533AFD]/30 transition-all"
                />
              </div>

              {mode === 'signup' && (
                <div className="relative group">
                  <div className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#533AFD] transition-colors">
                    <Smartphone size={20} />
                  </div>
                  <input
                    type="tel"
                    name="confirmWhatsapp"
                    required
                    value={formData.confirmWhatsapp}
                    onChange={handleInputChange}
                    placeholder="Confirmar WhatsApp"
                    className="w-full pl-14 pr-5 py-4 bg-slate-50/50 border border-slate-100 rounded-2xl text-base font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-4 focus:ring-indigo-500/5 focus:border-[#533AFD]/30 transition-all"
                  />
                </div>
              )}

              <div className="relative group">
                <div className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#533AFD] transition-colors">
                  <Lock size={20} />
                </div>
                <input
                  type="password"
                  name="password"
                  required
                  value={formData.password}
                  onChange={handleInputChange}
                  placeholder="Sua senha"
                  className="w-full pl-14 pr-5 py-4 bg-slate-50/50 border border-slate-100 rounded-2xl text-base font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-4 focus:ring-indigo-500/5 focus:border-[#533AFD]/30 transition-all"
                />
              </div>

              {mode === 'signup' && (
                <div className="relative group">
                  <div className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#533AFD] transition-colors">
                    <Lock size={20} />
                  </div>
                  <input
                    type="password"
                    name="confirmPassword"
                    required
                    value={formData.confirmPassword}
                    onChange={handleInputChange}
                    placeholder="Confirmar senha"
                    className="w-full pl-14 pr-5 py-4 bg-slate-50/50 border border-slate-100 rounded-2xl text-base font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-4 focus:ring-indigo-500/5 focus:border-[#533AFD]/30 transition-all"
                  />
                </div>
              )}
            </motion.div>
          </AnimatePresence>

          {error && (
            <p className="text-[13px] font-bold text-rose-500 px-1">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full h-16 bg-[#533AFD] text-white rounded-2xl font-bold text-lg flex items-center justify-center gap-2 hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-70 disabled:cursor-not-allowed group mt-2 shadow-xl shadow-indigo-100"
          >
            {isLoading ? (
              <>
                <Loader2 className="animate-spin" size={24} />
                <span>Processando...</span>
              </>
            ) : (
              <>
                {mode === 'signup' ? 'Criar minha conta' : 'Entrar no sistema'}
                <ArrowRight size={20} className="ml-1" />
              </>
            )}
          </button>

          <div className="flex flex-col items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setMode(mode === 'signup' ? 'login' : 'signup');
                setError(null);
              }}
              className="text-[15px] font-bold text-[#533AFD] hover:text-indigo-800 transition-colors"
            >
              {mode === 'signup' ? 'Já tenho uma conta' : 'Ainda não tenho conta'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
