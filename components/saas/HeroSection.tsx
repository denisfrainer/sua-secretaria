'use client';

import React from 'react';
import Link from 'next/link';
import { 
  ArrowRight, 
  Sparkles, 
  ShieldCheck, 
  Smartphone, 
  Zap, 
  CheckCircle2,
  Gift,
  QrCode,
  Flame,
  Users
} from 'lucide-react';

export function HeroSection() {
  return (
    <section className="relative overflow-hidden pt-12 pb-20 md:pt-20 md:pb-28 bg-gradient-to-b from-rose-50/50 via-white to-slate-50">
      
      {/* Decorative background light blurs */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-rose-200/35 blur-[120px] pointer-events-none rounded-full" />
      <div className="absolute top-1/3 right-10 w-[300px] h-[300px] bg-pink-300/25 blur-[100px] pointer-events-none rounded-full" />
      <div className="absolute top-2/3 left-10 w-[250px] h-[250px] bg-amber-200/20 blur-[90px] pointer-events-none rounded-full" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
          
          {/* Left Column: Copy & CRO Conversion Area */}
          <div className="lg:col-span-7 text-center lg:text-left space-y-6">
            
            {/* Social Proof Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-rose-50 border border-rose-200/80 text-rose-700 shadow-sm">
              <span className="flex h-2 w-2 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-600"></span>
              </span>
              <span className="text-xs font-bold uppercase tracking-wider">
                🚀 A ferramenta de fidelização nº 1 para comércios locais
              </span>
            </div>

            {/* Headline H1 */}
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-slate-900 tracking-tight leading-[1.15]">
              Mais clientes para o seu negócio, de um jeito{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-rose-600 via-pink-600 to-amber-500">
                simples e divertido.
              </span>
            </h1>

            {/* Subheadline */}
            <p className="text-lg sm:text-xl text-slate-600 font-normal leading-relaxed max-w-2xl mx-auto lg:mx-0">
              Crie sua <strong>Roleta Vantajosa</strong> em poucos minutos, compartilhe no WhatsApp ou com um QR Code no balcão e transforme visitas em vendas.
            </p>

            {/* CTA Buttons */}
            <div className="pt-2 flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4">
              <Link
                href="/login"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-3 px-8 py-4 rounded-2xl text-base font-bold text-white bg-gradient-to-r from-rose-500 via-rose-600 to-pink-600 hover:from-rose-600 hover:to-pink-700 shadow-xl shadow-rose-500/30 hover:shadow-rose-500/40 hover:-translate-y-0.5 active:translate-y-0 active:scale-98 transition-all"
              >
                <span>Quero minha roleta agora</span>
                <ArrowRight className="w-5 h-5" />
              </Link>
              <a
                href="#como-funciona"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-4 rounded-2xl text-base font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200/80 shadow-sm hover:border-slate-300 transition-all"
              >
                <span>Ver como funciona</span>
              </a>
            </div>

            {/* Micro Trust Proofs */}
            <div className="pt-4 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs text-slate-600 font-medium max-w-xl mx-auto lg:mx-0">
              <div className="flex items-center justify-center lg:justify-start gap-2 bg-white/60 backdrop-blur-xs py-2 px-3 rounded-lg border border-slate-100">
                <Zap className="w-4 h-4 text-amber-500 shrink-0" />
                <span>Configuração em 3 min</span>
              </div>
              <div className="flex items-center justify-center lg:justify-start gap-2 bg-white/60 backdrop-blur-xs py-2 px-3 rounded-lg border border-slate-100">
                <Smartphone className="w-4 h-4 text-rose-500 shrink-0" />
                <span>Zero app para instalar</span>
              </div>
              <div className="flex items-center justify-center lg:justify-start gap-2 bg-white/60 backdrop-blur-xs py-2 px-3 rounded-lg border border-slate-100">
                <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Antifraude 24h por número</span>
              </div>
            </div>

          </div>

          {/* Right Column: Stylized Visual Representation of the Wheel */}
          <div className="lg:col-span-5 flex justify-center items-center relative">
            
            {/* Visual Container / Glow frame */}
            <div className="relative w-full max-w-sm sm:max-w-md">
              
              {/* Outer Glow Halo */}
              <div className="absolute inset-0 bg-gradient-to-tr from-rose-500/20 via-pink-500/20 to-amber-500/20 rounded-3xl blur-2xl transform scale-105" />

              {/* Mockup Card */}
              <div className="relative bg-white/90 backdrop-blur-xl rounded-3xl border border-rose-100 shadow-2xl p-6 sm:p-8 flex flex-col items-center">
                
                {/* Store Header Mock */}
                <div className="w-full flex items-center justify-between pb-4 border-b border-slate-100">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-rose-100 flex items-center justify-center text-rose-600 font-bold text-xs">
                      RV
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-800">Sua Loja Favorita</p>
                      <p className="text-[10px] text-emerald-600 font-semibold flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                        Roleta Ativa Agora
                      </p>
                    </div>
                  </div>
                  <div className="px-2.5 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-700 text-[11px] font-bold flex items-center gap-1">
                    <Sparkles className="w-3 h-3" />
                    <span>Gire & Ganhe</span>
                  </div>
                </div>

                {/* Stylized Abstract Spinning Wheel Representation */}
                <div className="relative my-6 w-60 h-60 sm:w-72 sm:h-72 flex items-center justify-center">
                  
                  {/* Wheel Pointer Pin */}
                  <div className="absolute top-0 z-20 -mt-2 flex flex-col items-center">
                    <div className="w-6 h-7 bg-gradient-to-b from-amber-400 to-amber-600 rounded-b-md shadow-lg transform rotate-180 flex items-center justify-center">
                      <div className="w-2 h-2 bg-white rounded-full"></div>
                    </div>
                  </div>

                  {/* Circular Wheel with Slices using CSS Conic Gradient */}
                  <div 
                    className="w-full h-full rounded-full border-8 border-slate-900 shadow-2xl relative overflow-hidden flex items-center justify-center transition-transform duration-1000"
                    style={{
                      background: `conic-gradient(
                        #e11d48 0deg 60deg,
                        #f59e0b 60deg 120deg,
                        #10b981 120deg 180deg,
                        #6366f1 180deg 240deg,
                        #ec4899 240deg 300deg,
                        #8b5cf6 300deg 360deg
                      )`
                    }}
                  >
                    {/* Inner Wheel Center Hub */}
                    <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-slate-900 border-4 border-amber-400 shadow-inner flex flex-col items-center justify-center text-white z-10">
                      <Gift className="w-5 h-5 text-amber-400 animate-bounce" />
                      <span className="text-[10px] font-black uppercase tracking-wider text-amber-400">GIRAR</span>
                    </div>

                    {/* Wheel Labels Mock Overlay */}
                    <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                      {/* Segment texts positioned radially */}
                      <span className="absolute top-4 text-[10px] sm:text-xs font-black text-white drop-shadow-md">
                        15% OFF
                      </span>
                      <span className="absolute right-5 text-[10px] sm:text-xs font-black text-white drop-shadow-md">
                        Sobremesa
                      </span>
                      <span className="absolute bottom-5 text-[10px] sm:text-xs font-black text-white drop-shadow-md">
                        R$ 20 OFF
                      </span>
                      <span className="absolute left-4 text-[10px] sm:text-xs font-black text-white drop-shadow-md">
                        Brinde VIP
                      </span>
                    </div>
                  </div>

                </div>

                {/* Floating Winning Coupon Card Simulation */}
                <div className="w-full bg-gradient-to-r from-rose-50 to-pink-50 border border-rose-200/90 rounded-2xl p-3.5 flex items-center justify-between shadow-sm">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-rose-500 text-white flex items-center justify-center font-bold text-sm shadow-sm">
                      🎁
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-800">Cupom Gerado com Sucesso!</p>
                      <p className="text-[11px] font-mono font-bold text-rose-600">ROL-984210 • 15% DE DESCONTO</p>
                    </div>
                  </div>
                  <span className="px-2 py-1 bg-emerald-100 text-emerald-800 text-[10px] font-extrabold rounded-md">
                    ATIVO
                  </span>
                </div>

                {/* Live Social Proof Pill at the bottom */}
                <div className="mt-3 flex items-center gap-2 text-[11px] text-slate-500">
                  <Users className="w-3.5 h-3.5 text-rose-500" />
                  <span><strong>+148 clientes</strong> giraram hoje em comércios parceiros</span>
                </div>

              </div>

            </div>

          </div>

        </div>
      </div>

    </section>
  );
}
