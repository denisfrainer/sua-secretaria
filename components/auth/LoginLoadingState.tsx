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

      // 1. URL CLEANUP (Stop the Double Exchange)
      // Immediately strip the 'code' and 'next' from the URL to prevent the 
      // client-side Supabase SDK from trying to re-exchange an already used code.
      if (typeof window !== 'undefined' && window.location.search.includes('code=')) {
        const url = new URL(window.location.href);
        url.searchParams.delete('code');
        url.searchParams.delete('next');
        window.history.replaceState({}, document.title, url.pathname + url.search);
      }

      // CLIENT-SIDE SAFETY NET:
      // 1. Check for immediate session (cookie already present)
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session) {
          console.log('⚡ [AUTH SAFETY NET] Immediate session found. Redirecting...');
          window.location.href = next || '/dashboard/agenda';
        }
      });

      // 2. Listen for session event (standard flow)
      const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
        if (event === 'SIGNED_IN' && session) {
          console.log('⚡ [AUTH SAFETY NET] SIGNED_IN event detected. Breaking potential loop...');
          window.location.href = next || '/dashboard/agenda';
        }
      });

      return () => subscription.unsubscribe();
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
