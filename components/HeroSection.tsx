'use client';

import { useEffect } from 'react';
import { LogoCloud } from '@/components/LogoCloud';
import { motion } from 'framer-motion';
import { Inter } from 'next/font/google';

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
            Sua secretária virtual que atende o WhatsApp e faz agendamentos 24h por dia.
          </h1>
          <p className="text-lg sm:text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed font-medium">
            Feito para quem trabalha com as mãos e não pode parar para responder o celular. A <strong className="font-semibold text-black">meatende.ai</strong> conversa com seus clientes como uma pessoa real, tira dúvidas e lota sua agenda no automático.
          </p>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3, duration: 0.8 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-6 mt-8 w-full"
          >
            <a
              href="#precos"
              className="bg-blue-600 text-white font-bold text-lg px-12 py-5 rounded-2xl shadow-xl hover:bg-blue-700 transition-colors w-full sm:w-auto min-w-[280px] text-center"
            >
              Contratar Agora
            </a>
            <a
              href="https://wa.me/5548992123255"
              className="border-2 border-blue-600 text-blue-600 font-bold text-lg px-12 py-5 rounded-2xl hover:bg-blue-50 transition-colors w-full sm:w-auto min-w-[280px] flex items-center justify-center gap-3"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
              </svg>
              Testar agora
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
