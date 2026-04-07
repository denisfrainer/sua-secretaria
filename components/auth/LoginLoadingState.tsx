'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Loader2, Sparkles } from 'lucide-react';

export function LoginLoadingState() {
  const searchParams = useSearchParams();
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    const code = searchParams.get('code');
    const accessToken = searchParams.get('access_token');
    
    if (code || accessToken) {
      setIsProcessing(true);
    }
  }, [searchParams]);

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
            Concluindo login
          </h2>
          <Sparkles size={18} className="text-blue-500" />
        </div>
        <p className="text-sm font-bold text-gray-400 uppercase tracking-widest animate-pulse">
          Sincronizando sua agenda...
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
