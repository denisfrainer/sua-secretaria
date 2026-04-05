'use client';

import { useEffect } from 'react';
import { LogoCloud } from '@/components/LogoCloud';
import { motion } from 'framer-motion';
import { Inter } from 'next/font/google';
import GoogleLoginButton from '@/components/GoogleLoginButton';

const inter = Inter({ subsets: ['latin'] });

export function HeroSection() {
  useEffect(() => {
    console.log('✅ [HERO] logos scrolling.');
  }, []);

  return (
    <section className="relative w-full pt-32 pb-0 sm:pt-40 flex flex-col items-center justify-center bg-white text-black min-h-[90vh]">
      <div className="relative z-10 w-full max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center flex-1 flex flex-col justify-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="flex flex-col gap-6 items-center"
        >
          <h1 className={`${inter.className} text-[32px] font-extrabold leading-[1.05] tracking-tight text-black max-w-4xl`}>
            Sua secretária digital que atende o seu WhatsApp igual um ser humano e cuida da sua agenda 24 horas por dia.
          </h1>
          <p className="text-lg sm:text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed font-medium">
            Feito para quem trabalha com as mãos e não pode parar para responder o celular. A <strong className="font-semibold text-black">meatende.ai</strong> conversa com seus clientes como uma pessoa real, tira dúvidas e lota sua agenda no automático.
          </p>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3, duration: 0.8 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-8 w-full sm:w-auto sm:min-w-[400px] mx-auto"
          >
            <a
              href="#precos"
              className="flex items-center justify-center w-full sm:w-1/2 px-4 py-2 bg-[#533AFD] text-white rounded-md shadow-sm text-[16px] font-medium transition-all duration-200 ease-in-out hover:opacity-90 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#533AFD]"
            >
              Contratar Agora
            </a>
            <div className="w-full sm:w-1/2">
              <GoogleLoginButton />
            </div>
          </motion.div>
        </motion.div>
      </div>

      <div className="w-full pb-8">
        <LogoCloud />
      </div>
    </section>
  );
}
