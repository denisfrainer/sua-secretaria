'use client';

import React, { Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { 
  ArrowLeft, 
  Check, 
  Lock, 
  CreditCard, 
  ShieldCheck,
  Smartphone,
  Info
} from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { motion } from 'framer-motion';

const PLAN_DATA = {
  digital: {
    name: 'Digital',
    price: '39,90',
    features: ['Bot menu interativo', 'Agendamento manual', 'Link de agendamento']
  },
  profissional: {
    name: 'Profissional',
    price: '149',
    features: ['Agente de IA (Eliza)', 'Atendimento humanizado', 'Agendamento automático']
  },
  elite: {
    name: 'Elite',
    price: '299',
    features: ['IA personalizada', 'Suporte prioritário 24/7', 'Confirmação automática']
  }
};

function CheckoutContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const planId = searchParams.get('plan') || 'profissional';
  // @ts-ignore
  const plan = PLAN_DATA[planId] || PLAN_DATA.profissional;

  return (
    <div className="flex flex-col lg:flex-row min-h-screen">
      {/* Left Pane: Summary */}
      <div className="w-full lg:w-[45%] bg-[#fcfcfc] border-b lg:border-b-0 lg:border-r border-black/[0.03] p-8 md:p-12 lg:p-20 flex flex-col">
        <Link 
          href="/dashboard/settings/payments"
          className="flex items-center gap-2 text-gray-500 hover:text-black transition-colors mb-12 group"
        >
          <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
          <span className="text-sm font-bold tracking-tight">Voltar</span>
        </Link>

        <div className="flex flex-col gap-8">
          <div className="flex items-center gap-3">
            <Image src="/assets/eliza.png" width={32} height={32} alt="Sua SecretarIA" />
            <span className="text-xl font-black tracking-tight">Sua SecretarIA</span>
          </div>

          <div className="flex flex-col gap-2">
            <span className="text-sm font-black text-gray-400 uppercase tracking-widest">Assinando o Plano</span>
            <h1 className="text-4xl font-black text-gray-950 tracking-tight">{plan.name}</h1>
          </div>

          <div className="flex items-baseline gap-1">
            <span className="text-3xl font-black text-gray-950">R$ {plan.price}</span>
            <span className="text-lg font-bold text-gray-400">/mês</span>
          </div>

          <div className="flex flex-col gap-4 py-8">
            {plan.features.map((feature: string, idx: number) => (
              <div key={idx} className="flex items-center gap-3">
                <div className="w-5 h-5 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600">
                  <Check size={12} strokeWidth={4} />
                </div>
                <span className="text-[15px] font-bold text-gray-600">{feature}</span>
              </div>
            ))}
          </div>

          <div className="mt-auto pt-8 border-t border-black/[0.03]">
            <div className="flex items-start gap-3 p-4 rounded-2xl bg-blue-50/50 border border-blue-100/50">
              <Info size={18} className="text-blue-600 shrink-0 mt-0.5" />
              <p className="text-sm font-medium text-blue-800 leading-relaxed">
                Você será cobrado mensalmente. Pode cancelar a qualquer momento sem taxas ocultas.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Right Pane: Payment Form */}
      <div className="flex-1 bg-white p-8 md:p-12 lg:p-20 flex flex-col items-center">
        <div className="w-full max-w-md flex flex-col gap-10">
          
          {/* Express Checkout */}
          <div className="flex flex-col gap-4">
            <button className="w-full h-12 rounded-xl bg-black text-white font-bold flex items-center justify-center gap-2 hover:opacity-90 transition-opacity">
              <Smartphone size={18} />
              Apple Pay
            </button>
            <button className="w-full h-12 rounded-xl border border-gray-200 bg-white text-black font-bold flex items-center justify-center gap-2 hover:bg-gray-50 transition-colors shadow-sm">
              <Smartphone size={18} />
              Google Pay
            </button>
          </div>

          <div className="relative flex items-center justify-center">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-100"></div>
            </div>
            <span className="relative px-4 bg-white text-xs font-bold text-gray-400 uppercase tracking-widest">ou cartão de crédito</span>
          </div>

          {/* Payment Form Shell */}
          <div className="flex flex-col gap-6">
            <div className="flex flex-col gap-2">
              <label className="text-sm font-black text-gray-900 ml-1">Dados de Pagamento</label>
              
              {/* Mock Stripe Element Input */}
              <div className="w-full p-4 rounded-xl border border-gray-200 bg-gray-50/30 flex flex-col gap-4">
                <div className="flex flex-col gap-4">
                  <div className="flex items-center gap-3">
                    <CreditCard size={20} className="text-gray-400" />
                    <input 
                      type="text" 
                      placeholder="Número do cartão" 
                      className="bg-transparent border-none outline-none w-full text-base font-medium placeholder:text-gray-400"
                    />
                  </div>
                  <div className="flex items-center gap-4">
                    <input 
                      type="text" 
                      placeholder="MM / YY" 
                      className="bg-transparent border-none outline-none w-1/2 text-base font-medium placeholder:text-gray-400"
                    />
                    <input 
                      type="text" 
                      placeholder="CVC" 
                      className="bg-transparent border-none outline-none w-1/2 text-base font-medium placeholder:text-gray-400"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-sm font-black text-gray-900 ml-1">E-mail para recibo</label>
              <input 
                type="email" 
                placeholder="seu@email.com" 
                className="w-full p-4 rounded-xl border border-gray-200 bg-gray-50/30 outline-none focus:border-blue-500/50 transition-colors text-base font-medium placeholder:text-gray-400"
              />
            </div>

            <button className="w-full h-16 rounded-2xl bg-blue-600 text-white font-black text-lg flex items-center justify-center gap-3 mt-4 shadow-xl shadow-blue-500/10 hover:bg-blue-700 active:scale-[0.98] transition-all">
              Assinar por R$ {plan.price}/mês
            </button>

            <div className="flex flex-col items-center gap-2 mt-4">
              <div className="flex items-center gap-2 text-[11px] font-bold text-gray-400 uppercase tracking-widest">
                <Lock size={12} className="text-emerald-500" />
                Secured by Stripe — Pagamento Criptografado
              </div>
              <div className="flex items-center gap-4 mt-2 opacity-30 grayscale contrast-125">
                <Image src="https://upload.wikimedia.org/wikipedia/commons/b/ba/Stripe_Logo%2C_revised_2016.svg" width={40} height={20} alt="Stripe" className="object-contain" />
                <Image src="https://upload.wikimedia.org/wikipedia/commons/2/2a/Mastercard-logo.svg" width={24} height={16} alt="Mastercard" className="object-contain" />
                <Image src="https://upload.wikimedia.org/wikipedia/commons/5/5e/Visa_Inc._logo.svg" width={30} height={10} alt="Visa" className="object-contain" />
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}

export default function CheckoutPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-white text-gray-400 font-bold">Carregando checkout...</div>}>
      <CheckoutContent />
    </Suspense>
  );
}
