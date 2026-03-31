'use client';

import { useEffect } from 'react';
import { LogoCloud } from '@/components/LogoCloud';
import { motion } from 'framer-motion';

export function HeroSection() {
  useEffect(() => {
    console.log('✅ [HERO] logos scrolling.');
  }, []);

  return (
    <section className="relative w-full h-screen flex flex-col items-center justify-center bg-white text-black pt-16">
      <div className="relative z-10 w-full max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center flex-1 flex flex-col justify-center">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="flex flex-col gap-6 items-center"
        >
          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-extrabold leading-[1.05] tracking-tight text-black max-w-4xl">
            Sua IA no WhatsApp que atende como você — mas nunca dorme.
          </h1>
          <p className="text-lg sm:text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed font-medium">
            Chega de perder leads por demora. O <strong className="font-semibold text-black">meatende.ai</strong> responde em segundos, qualifica o interesse e filtra curiosos. Seu cliente tem uma experiência humana, você recebe o lead pronto para o fechamento.
          </p>
          
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3, duration: 0.8 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-6 mt-8 w-full"
          >
            <a 
              href="#precos" 
              className="bg-[#0047AB] text-white font-bold text-lg px-12 py-5 rounded-2xl shadow-xl hover:bg-blue-800 transition-colors w-full sm:w-auto min-w-[280px]"
            >
              Contratar Agora
            </a>
            <a 
              href="https://wa.me/5511999999999" 
              className="text-[#0047AB] font-bold hover:underline underline-offset-4 px-4 py-3"
            >
              Ver demonstração
            </a>
          </motion.div>
        </motion.div>
      </div>

      <div className="w-full pb-8">
        <LogoCloud />
      </div>
    </section>
  );
}
