"use client";

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Loader2, Sparkles } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

export function LoginLoadingState() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const supabase = createClient();
  const [isProcessing, setIsProcessing] = useState(false);
  const [message, setMessage] = useState('Finalizando seu acesso...');

  useEffect(() => {
    // 0. QUICK SESSION CHECK (Basic Login / No OAuth)
    // If we have a session but NO 'code' in the URL, we are already logged in 
    // and just landed on /login by mistake or stale session. Get the user out.
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const hasCode = new URLSearchParams(window.location.search).has('code');
      const hasToken = new URLSearchParams(window.location.search).has('access_token');
      
      if (session && !hasCode && !hasToken) {
        console.log('⚡ [AUTH_STATE] Session found, syncing cookies before redirect...');
        setTimeout(() => {
          console.log('🚀 [AUTH_STATE] Sync complete. Redirecting to Dashboard.');
          window.location.href = '/dashboard';
        }, 500);
      }
    };
    checkSession();
  }, []);

  useEffect(() => {
    const code = searchParams.get('code');
    const accessToken = searchParams.get('access_token');
    const next = searchParams.get('next') || '';
    
    if (code || accessToken) {
      setIsProcessing(true);
      
      // If the redirect path is agenda, we are specifically connecting the calendar
      if (next.includes('agenda')) {
        setMessage('Sincronizando sua agenda...');
      } else {
        setMessage('Finalizando seu acesso...');
      }

      // 1. URL CLEANUP (Stop any other component from seeing the code)
      if (typeof window !== 'undefined' && window.location.search.includes('code=')) {
        const url = new URL(window.location.href);
        url.searchParams.delete('code');
        url.searchParams.delete('next');
        window.history.replaceState({}, document.title, url.pathname + url.search);
      }

      // 2. IMMEDIATE SESSION CHECK
      // If the server-side callback already finished, we should already have a session.
      const checkAndRedirect = async () => {
        try {
          const { data: { session } } = await supabase.auth.getSession();
          if (session) {
            console.log('⚡ [AUTH READY] Session found. Redirecting...');
            const target = (next && next !== '/') ? next : '/dashboard';
            window.location.href = target;
          }
        } catch (err) {
          console.error('[AUTH CHECK] Error during immediate check:', err);
        }
      };
      
      checkAndRedirect();

      // 3. LISTEN FOR STATE CHANGES
      const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
        if ((event === 'SIGNED_IN' || event === 'INITIAL_SESSION') && session) {
          console.log(`⚡ [AUTH EVENT] ${event}. Redirecting...`);
          const target = (next && next !== '/') ? next : '/dashboard';
          window.location.href = target;
        }
      });

      // 4. FALLBACK TIMEOUT (Force Redirect after 3s)
      const timeout = setTimeout(() => {
        console.warn('🕒 [AUTH TIMEOUT] Forcing navigation...');
        const target = (next && next !== '/') ? next : '/dashboard';
        window.location.href = target;
      }, 3000);

      return () => {
        subscription.unsubscribe();
        clearTimeout(timeout);
      };
    }
  }, [searchParams, supabase, router]);

  if (!isProcessing) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-white/80 backdrop-blur-md flex flex-col items-center justify-center p-6 animate-in fade-in duration-500 font-outfit">
      <div className="relative mb-8">
        <div className="absolute inset-0 bg-blue-500/20 blur-[60px] rounded-full animate-pulse" />
        <div className="relative w-20 h-20 bg-white rounded-3xl shadow-2xl flex items-center justify-center border border-black/5">
          <Loader2 size={32} className="text-blue-600 animate-spin" />
        </div>
      </div>

      <div className="flex flex-col items-center gap-3 text-center">
        <div className="flex items-center gap-2">
          <h2 className="text-xl font-bold text-gray-900 tracking-tight">
            Aguarde um momento
          </h2>
          <Sparkles size={18} className="text-blue-500" />
        </div>
        <p className="text-sm font-bold text-gray-400 uppercase tracking-widest animate-pulse">
          {message}
        </p>
      </div>

      <div className="mt-12 flex gap-1">
        <div className="w-1.5 h-1.5 bg-blue-600 rounded-full animate-bounce [animation-delay:-0.3s]" />
        <div className="w-1.5 h-1.5 bg-blue-600 rounded-full animate-bounce [animation-delay:-0.15s]" />
        <div className="w-1.5 h-1.5 bg-blue-600 rounded-full animate-bounce" />
      </div>
    </div>
  );
}
