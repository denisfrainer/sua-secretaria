"use client";

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { User, Smartphone, Lock, ArrowRight, CheckCircle2, Loader2, KeyRound } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { normalizePhone } from '@/lib/utils/phone';

export default function UnifiedAuthForm() {
  const [mode, setMode] = useState<'login' | 'signup' | 'otp-request' | 'otp-verify'>('login');
  const [formData, setFormData] = useState({
    fullName: '',
    whatsapp: '',
    confirmWhatsapp: '',
    password: '',
    confirmPassword: '',
    otpCode: ''
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
    if (mode === 'signup' || mode === 'login') {
      if (formData.password.length < 6) return "A senha deve ter pelo menos 6 caracteres.";
    }
    if (mode === 'otp-verify') {
      if (formData.otpCode.length !== 6) return "O código deve ter 6 dígitos numéricos.";
    }
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

        if (data.user) {
          const { error: profileError } = await supabase
            .from('profiles')
            .upsert({
              id: data.user.id,
              full_name: formData.fullName,
              email: emailMask,
              phone: normalized,
            });
          
          if (profileError) console.error('Error updating profile:', profileError);
        }

        setIsSuccess(true);
      } else if (mode === 'login') {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: emailMask,
          password: formData.password,
        });

        if (signInError) throw signInError;
        
        window.location.href = '/dashboard';
      } else if (mode === 'otp-request') {
        const res = await fetch('/api/auth/request-otp', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ phone: formData.whatsapp })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Erro ao solicitar código.');
        setMode('otp-verify');
      } else if (mode === 'otp-verify') {
        const res = await fetch('/api/auth/verify-otp', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ phone: formData.whatsapp, code: formData.otpCode })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Erro ao validar código.');
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

  const getHeaderTitle = () => {
    switch (mode) {
      case 'login': return 'Acesse sua conta';
      case 'signup': return 'Crie sua conta';
      case 'otp-request': return 'Entrar sem senha';
      case 'otp-verify': return 'Código de acesso';
    }
  };

  const getHeaderSubtitle = () => {
    switch (mode) {
      case 'login': 
      case 'signup': return 'Comece agora e use grátis por 30 dias.';
      case 'otp-request': return 'Insira seu WhatsApp para receber seu código.';
      case 'otp-verify': return `Enviamos um código para o WhatsApp ${formData.whatsapp}`;
    }
  };

  return (
    <div className="w-full flex flex-col gap-10">
      {/* BRAND HEADER */}
      <div className="flex flex-col items-center text-center gap-6">
        <button onClick={() => window.location.href = '/'} className="w-20 h-20 rounded-full bg-white shadow-xl shadow-slate-200/50 border border-slate-100 flex items-center justify-center transition-transform hover:scale-105 active:scale-95 cursor-pointer text-5xl">
            👩🏼‍💼
        </button>
        <div className="flex flex-col gap-2">
            <h1 className="text-[32px] font-extrabold tracking-tight text-slate-900">
                {getHeaderTitle()}
            </h1>
            <p className="text-[17px] font-medium text-slate-500">
                {getHeaderSubtitle()}
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

              {(mode === 'login' || mode === 'signup' || mode === 'otp-request') && (
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
              )}

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

              {(mode === 'login' || mode === 'signup') && (
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
              )}

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

              {mode === 'otp-verify' && (
                <div className="relative group">
                  <div className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#533AFD] transition-colors">
                    <KeyRound size={20} />
                  </div>
                  <input
                    type="text"
                    name="otpCode"
                    required
                    maxLength={6}
                    value={formData.otpCode}
                    onChange={handleInputChange}
                    placeholder="Código de 6 dígitos"
                    className="w-full pl-14 pr-5 py-4 bg-slate-50/50 border border-slate-100 rounded-2xl text-base font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-4 focus:ring-indigo-500/5 focus:border-[#533AFD]/30 transition-all font-mono tracking-widest text-center"
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
                {mode === 'signup' && 'Criar minha conta'}
                {mode === 'login' && 'Entrar no sistema'}
                {mode === 'otp-request' && 'Receber código agora'}
                {mode === 'otp-verify' && 'Validar e acessar'}
                <ArrowRight size={20} className="ml-1" />
              </>
            )}
          </button>

          <div className="flex items-center gap-4 py-2">
            <div className="h-[1px] flex-1 bg-slate-100" />
            <span className="text-[11px] font-black uppercase tracking-widest text-slate-400">OU</span>
            <div className="h-[1px] flex-1 bg-slate-100" />
          </div>

          <button
            type="button"
            onClick={() => window.location.href = '/api/auth/google'}
            className="w-full h-16 bg-white border border-slate-200 text-slate-900 rounded-2xl font-bold text-base flex items-center justify-center gap-3 hover:bg-slate-50 active:scale-[0.98] transition-all shadow-sm group"
          >
            <div className="flex items-center justify-center transition-transform group-hover:scale-110">
              <svg width="20" height="20" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg">
                <path d="M17.64 9.20455C17.64 8.56636 17.5827 7.95273 17.4764 7.36364H9V10.845H13.8436C13.635 11.97 13.0009 12.9232 12.0477 13.5614V15.8195H14.9564C16.6582 14.2527 17.64 11.9455 17.64 9.20455Z" fill="#4285F4" />
                <path d="M9 18C11.43 18 13.4673 17.1941 14.9564 15.8195L12.0477 13.5614C11.2418 14.1014 10.2109 14.4205 9 14.4205C6.65591 14.4205 4.67182 12.8373 3.96409 10.71H0.957273V13.0418C2.43818 15.9832 5.48182 18 9 18Z" fill="#34A853" />
                <path d="M5.03591 10.71C4.85591 10.17 4.75364 9.59318 4.75364 9C4.75364 8.40682 4.85591 7.83 5.03591 7.29V4.95818H1.02682C0.413182 6.17318 0.0545455 7.54773 0.0545455 9C0.0545455 10.4523 0.413182 11.8268 1.02682 13.0418L5.03591 10.71Z" fill="#FBBC05" />
                <path d="M9 3.57955C10.3214 3.57955 11.5077 4.03364 12.4405 4.92545L15.0218 2.34409C13.4632 0.891818 11.4259 0 9 0C5.48182 0 2.43818 2.01682 0.957273 4.95818L5.03591 7.29C5.74364 5.16273 7.72773 3.57955 9 3.57955Z" fill="#EA4335" />
              </svg>
            </div>
            Continuar com Google
          </button>

          <div className="flex flex-col items-center gap-4 pt-2">
            {mode === 'login' && (
              <button
                type="button"
                onClick={() => {
                  setMode('otp-request');
                  setError(null);
                }}
                className="text-[14px] font-semibold text-slate-500 hover:text-slate-800 transition-colors"
              >
                Esqueci minha senha / Entrar sem senha
              </button>
            )}

            {(mode === 'otp-request' || mode === 'otp-verify') && (
              <button
                type="button"
                onClick={() => {
                  setMode('login');
                  setError(null);
                }}
                className="text-[14px] font-semibold text-slate-500 hover:text-slate-800 transition-colors"
              >
                Voltar para login com senha
              </button>
            )}

            {(mode === 'login' || mode === 'signup') && (
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
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
