"use client";

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, ArrowRight, ArrowLeft } from 'lucide-react';

export default function OnboardingPage() {
  const [step, setStep] = useState(1);
  const [instanceName, setInstanceName] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const supabase = createClient();
  const router = useRouter();

  const handleComplete = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Usuário não autenticado");

      // Default baseline payload to establish the JSON tree properly
      const defaultContext = {
        business_info: {
          name: businessName,
          address: "",
          parking: "",
          handoff_phone: ""
        },
        operating_hours: {
            weekdays: { open: "09:00", close: "18:00", is_closed: false },
            saturday: { open: "09:00", close: "13:00", is_closed: false },
            sunday: { open: "00:00", close: "00:00", is_closed: true },
            observations: ""
        },
        services: [],
        scheduling_rules: [],
        restrictions: [],
        tone_of_voice: {
            base_style: "Amigável e profissional",
            custom_instructions: "Responda de forma natural."
        },
        payment_info: {
            pix_type: "",
            pix_key: "",
            owner_name: ""
        },
        booking_policies: {
            minimum_advance_notice: "",
            buffer_time_minutes: ""
        },
        faq: []
      };

      const { error: insertError } = await supabase
        .from('business_config')
        .insert({
          owner_id: session.user.id,
          instance_name: instanceName,
          context_json: defaultContext
        });

      if (insertError) throw insertError;

      router.refresh(); 
      router.push('/dashboard');
      
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Ocorreu um erro inesperado.');
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full flex-1 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-lg mb-8 flex flex-col items-center text-center gap-3">
         <div className="w-12 h-12 bg-black text-white rounded-2xl flex items-center justify-center shadow-lg mb-2">
            <Sparkles size={24} />
         </div>
         <h1 className="text-3xl font-extrabold text-black tracking-tight tracking-[-0.03em]">Configure sua IA</h1>
         <p className="text-lg font-medium text-black/50">
            Apenas dois passos simples para inicializar sua secretária.
         </p>
      </div>

      <div className="w-full max-w-lg bg-white border border-black/10 rounded-3xl shadow-2xl shadow-black/5 p-8 sm:p-10 flex flex-col gap-6 relative overflow-hidden">
        
        {/* Progress bar */}
        <div className="absolute top-0 left-0 h-1 bg-black/5 w-full">
            <div 
               className="h-full bg-blue-600 transition-all duration-500 ease-out" 
               style={{ width: \`\${(step / 2) * 100}%\` }}
            />
        </div>

        {error && (
          <div className="p-4 bg-red-50 text-red-600 rounded-xl text-sm border border-red-100 font-bold flex items-center justify-center text-center">
            {error}
          </div>
        )}

        <AnimatePresence mode="popLayout" initial={false}>
            {step === 1 && (
            <motion.div 
                key="step1"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="flex flex-col gap-8 w-full"
            >
                <div className="flex flex-col gap-4">
                    <label className="text-base font-extrabold text-black/80">Identificador da Instância (Evolution API)</label>
                    <input
                        type="text"
                        className="w-full px-5 py-4 border-2 border-black/10 rounded-2xl focus:outline-none focus:border-blue-600 focus:ring-0 placeholder-black/30 font-bold text-lg text-black transition-colors"
                        placeholder="ex: demo-agente"
                        value={instanceName}
                        onChange={(e) => setInstanceName(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && instanceName.trim().length > 0 && setStep(2)}
                    />
                    <p className="text-sm font-medium text-black/40">Este é o ID interno que conecta o seu número WhatsApp ao robô.</p>
                </div>
                
                <button
                    onClick={() => {
                        if(instanceName.trim().length > 0) {
                            setError(null);
                            setStep(2);
                        } else {
                            setError("O nome da instância é obrigatório.");
                        }
                    }}
                    className="mt-2 w-full h-14 bg-black text-white font-bold text-lg rounded-2xl hover:bg-gray-800 transition-transform active:scale-[0.98] shadow-lg shadow-black/20 flex items-center justify-center gap-2"
                >
                    Continuar <ArrowRight size={20} strokeWidth={2.5}/>
                </button>
            </motion.div>
            )}

            {step === 2 && (
            <motion.div 
                key="step2"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="flex flex-col gap-8 w-full"
            >
                <div className="flex flex-col gap-4">
                    <label className="text-base font-extrabold text-black/80">Nome da Empresa / Negócio</label>
                    <input
                        type="text"
                        className="w-full px-5 py-4 border-2 border-black/10 rounded-2xl focus:outline-none focus:border-blue-600 focus:ring-0 placeholder-black/30 font-bold text-lg text-black transition-colors"
                        placeholder="ex: Studio Bela Arte"
                        value={businessName}
                        onChange={(e) => setBusinessName(e.target.value)}
                        onKeyDown={(e) => {
                            if(e.key === 'Enter' && businessName.trim().length > 0) handleComplete();
                        }}
                    />
                    <p className="text-sm font-medium text-black/40">Como a IA deve se referir ao seu serviço para os clientes.</p>
                </div>
                
                <div className="flex gap-4 mt-2">
                    <button
                        onClick={() => { setError(null); setStep(1); }}
                        disabled={isLoading}
                        className="flex items-center justify-center w-14 h-14 bg-white border-2 border-black/10 text-black/60 font-bold rounded-2xl hover:bg-black/5 hover:text-black transition-all"
                    >
                        <ArrowLeft size={20} strokeWidth={2.5}/>
                    </button>
                    <button
                        onClick={() => {
                        if(businessName.trim().length > 0) handleComplete();
                        else setError("O nome da empresa é obrigatório.");
                        }}
                        disabled={isLoading}
                        className={\`flex-1 h-14 bg-blue-600 text-white font-bold text-lg rounded-2xl hover:bg-blue-700 transition-all active:scale-[0.98] shadow-lg shadow-blue-600/30 flex items-center justify-center gap-2 \${isLoading ? 'opacity-70 pointer-events-none' : ''}\`}
                    >
                        {isLoading ? (
                            <span className="flex items-center gap-2">
                                <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path></svg>
                                Finalizando...
                            </span>
                        ) : 'Salvar Identity'}
                    </button>
                </div>
            </motion.div>
            )}
        </AnimatePresence>
      </div>
    </div>
  );
}
