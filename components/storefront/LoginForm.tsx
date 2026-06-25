'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { Lock, Mail, Loader2, Sparkles, AlertCircle, CheckCircle } from 'lucide-react';

export default function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [signUpSuccess, setSignUpSuccess] = useState(false);

  useEffect(() => {
    console.log('[STOREFRONT_MOUNT] LoginForm mounted');
    
    if (searchParams.get('clear_session') === 'true') {
      console.log('[AUTH_STATE] URL request to clear session client-side');
    }
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSignUpSuccess(false);

    const supabase = createClient();

    try {
      if (isSignUp) {
        // Sign Up Flow
        const { data, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/auth/callback`,
          }
        });

        if (signUpError) throw signUpError;

        console.log('[AUTH_STATE] User signed up:', { userId: data.user?.id });

        // If email verification is disabled in Supabase, session is active immediately
        if (data.session) {
          console.log('[AUTH_STATE] Auto-login successful after sign up');
          router.refresh();
          router.push('/dashboard');
        } else {
          setSignUpSuccess(true);
          setEmail('');
          setPassword('');
        }
      } else {
        // Sign In Flow
        const { data, error: authError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (authError) throw authError;

        if (data.user) {
          console.log('[AUTH_STATE] User logged in:', { userId: data.user.id });
          router.refresh();
          router.push('/dashboard');
        }
      }
    } catch (err: any) {
      console.error('❌ [AUTH_ERROR] Authentication failure:', err.message);
      setError(err.message || 'Erro ao processar autenticação.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md p-8 rounded-3xl bg-white/70 backdrop-blur-md border border-rose-100 shadow-xl shadow-rose-100/30">
      {/* Brand Header */}
      <Link href="/" className="flex flex-col items-center text-center mb-8 hover:opacity-90 transition-opacity block">
        <div className="w-12 h-12 rounded-2xl bg-rose-50 flex items-center justify-center text-rose-600 border border-rose-100/50 mb-3 animate-pulse mx-auto">
          <Sparkles size={24} className="fill-rose-50" />
        </div>
        <h1 className="text-2xl font-black text-slate-800 tracking-tight">Vitrine Virtual</h1>
        <p className="text-xs font-semibold text-slate-400 mt-1 uppercase tracking-widest">
          {isSignUp ? 'Criar Nova Conta' : 'Painel Administrativo'}
        </p>
      </Link>

      {error && (
        <div className="mb-6 p-4 rounded-2xl bg-rose-50 border border-rose-100 text-rose-700 text-xs font-medium flex items-start gap-2.5">
          <AlertCircle size={16} className="shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {signUpSuccess && (
        <div className="mb-6 p-4 rounded-2xl bg-emerald-50 border border-emerald-100 text-emerald-800 text-xs font-semibold flex items-start gap-2.5 animate-in fade-in duration-300">
          <CheckCircle size={16} className="shrink-0 mt-0.5 text-emerald-600" />
          <span>Conta criada com sucesso! Verifique sua caixa de entrada para confirmar o e-mail antes de entrar.</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {/* Email Field */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-black text-slate-500 uppercase tracking-wider">E-mail</label>
          <div className="relative">
            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="seuemail@exemplo.com"
              className="w-full pl-11 pr-4 py-3 bg-white border border-slate-200/80 rounded-2xl text-sm font-semibold outline-none focus:border-rose-500 focus:ring-2 focus:ring-rose-100 transition-all text-slate-700 placeholder:text-slate-300"
            />
          </div>
        </div>

        {/* Password Field */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-black text-slate-500 uppercase tracking-wider">Senha</label>
          <div className="relative">
            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="••••••••"
              className="w-full pl-11 pr-4 py-3 bg-white border border-slate-200/80 rounded-2xl text-sm font-semibold outline-none focus:border-rose-500 focus:ring-2 focus:ring-rose-100 transition-all text-slate-700 placeholder:text-slate-300"
            />
          </div>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={loading}
          className="flex items-center justify-center gap-2 w-full mt-4 px-6 py-4.5 bg-rose-600 hover:bg-rose-700 text-white rounded-2xl font-black text-md shadow-lg shadow-rose-600/20 active:scale-[0.98] disabled:opacity-50 transition-all cursor-pointer"
        >
          {loading ? (
            <>
              <Loader2 className="animate-spin" size={18} />
              {isSignUp ? 'Criando conta...' : 'Autenticando...'}
            </>
          ) : (
            isSignUp ? 'Criar minha Conta' : 'Entrar no Painel'
          )}
        </button>

        {/* Toggle between Sign In / Sign Up */}
        <div className="mt-6 text-center border-t border-slate-100 pt-4">
          <button
            type="button"
            onClick={() => {
              setIsSignUp(!isSignUp);
              setError(null);
              setSignUpSuccess(false);
            }}
            className="text-xs font-black text-rose-600 hover:text-rose-700 transition-colors uppercase tracking-wider cursor-pointer bg-transparent border-none outline-none"
          >
            {isSignUp ? 'Já tem uma conta? Entrar' : 'Não tem conta? Cadastre-se'}
          </button>
        </div>
      </form>
    </div>
  );
}
