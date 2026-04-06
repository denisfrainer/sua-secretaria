'use client';

import { useState } from 'react';
import { Bot, Loader2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

interface SystemHealthCardProps {
  initialIsAiActive: boolean;
  instanceName: string;
}

export function SystemHealthCard({ initialIsAiActive, instanceName }: SystemHealthCardProps) {
  const [isAiActive, setIsAiActive] = useState(initialIsAiActive);
  const [togglingAi, setTogglingAi] = useState(false);
  const supabase = createClient();

  const toggleAiStatus = async () => {
    setTogglingAi(true);
    const newState = !isAiActive;

    const { error } = await supabase
      .from('system_settings')
      .upsert({ key: 'eliza_active', value: { enabled: newState } });

    if (!error) {
      setIsAiActive(newState);
    }
    setTogglingAi(false);
  };

  return (
    <div className="bg-white rounded-2xl p-4 sm:p-6 shadow-sm border border-black/5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 w-full animate-in fade-in duration-500">
      <div className="flex items-center gap-4">
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 transition-colors duration-300 ${isAiActive ? 'bg-blue-50' : 'bg-gray-100'}`}>
          <Bot size={24} className={`transition-colors duration-300 ${isAiActive ? 'text-blue-600' : 'text-gray-400'}`} />
        </div>
        <div className="flex flex-col min-w-0">
          <div className="flex items-center gap-2">
            <div className={`w-2.5 h-2.5 rounded-full shrink-0 transition-all duration-300 ${isAiActive ? 'bg-green-500 animate-pulse' : 'bg-gray-300'}`}></div>
            <h2 className={`text-base font-bold truncate transition-colors duration-300 ${isAiActive ? 'text-gray-900' : 'text-gray-400'}`}>
              {isAiActive ? 'IA Ativa e Monitorando' : 'IA Pausada'}
            </h2>
          </div>
          <p className="text-sm font-medium text-gray-500 truncate">
            Instância: <span className="font-bold text-gray-700 uppercase">{instanceName}</span>
          </p>
        </div>
      </div>
      
      <div className="flex items-center justify-between sm:justify-end gap-6 px-4 py-3 bg-gray-50 rounded-2xl sm:bg-transparent sm:p-0">
        <div className="flex flex-col sm:items-end justify-center">
          <span className="text-[10px] font-black text-gray-400 uppercase tracking-[0.15em] leading-none mb-1.5">Controle da Secretária</span>
          <span className={`text-xs font-bold transition-colors duration-300 ${isAiActive ? 'text-green-600' : 'text-red-500'}`}>
            {isAiActive ? 'Operação Normal' : 'Modo Pausa Ativo'}
          </span>
        </div>

        {/* TOGGLE SWITCH - Same logic as Config Page */}
        <button
          type="button"
          onClick={toggleAiStatus}
          disabled={togglingAi}
          className={`
            relative w-14 h-8 rounded-full transition-colors duration-200 focus:outline-none shrink-0
            ${isAiActive ? 'bg-[#34C759]' : 'bg-[#FF3B30]'}
            disabled:opacity-50 shadow-inner
          `}
        >
          <div
            className={`
              absolute top-1 left-1 bg-white w-6 h-6 rounded-full shadow-md transition-transform duration-200 flex items-center justify-center
              ${isAiActive ? 'translate-x-6' : 'translate-x-0'}
            `}
          >
            {togglingAi && <Loader2 size={12} className="animate-spin text-gray-400" />}
          </div>
        </button>
      </div>
    </div>
  );
}
