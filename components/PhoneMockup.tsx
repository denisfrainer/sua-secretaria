'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';

interface Message {
  id: string;
  from: 'client' | 'agent';
  text: string;
  delay: number;
}

const conversationFlow: Message[] = [
  { id: 'msg_1', from: 'client', text: 'Oi, vi o anúncio. Quanto custa?', delay: 800 },
  { id: 'msg_2', from: 'agent', text: 'Olá! 😊 O plano é R$ 249/mês. Quer que eu te mostre como funciona na prática?', delay: 3200 },
  { id: 'msg_3', from: 'client', text: 'Tenho medo de parecer robô...', delay: 6000 },
  { id: 'msg_4', from: 'agent', text: 'A gente treina a IA com o contexto do seu negócio. Seus clientes vão achar que é alguém da sua equipe. Posso agendar uma demo?', delay: 9500 },
  { id: 'msg_5', from: 'client', text: 'Pode ser amanhã às 14h.', delay: 13000 },
  { id: 'msg_6', from: 'agent', text: 'Perfeito! ✅ Agendei para amanhã às 14h. Até lá!', delay: 15500 },
];

export function PhoneMockup() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isTyping, setIsTyping] = useState(false);

  useEffect(() => {
    console.log('✅ WhatsApp icon: Assets');
    
    let timeouts: NodeJS.Timeout[] = [];
    
    conversationFlow.forEach((msg) => {
      if (msg.from === 'agent') {
        timeouts.push(setTimeout(() => setIsTyping(true), Math.max(0, msg.delay - 1800)));
        timeouts.push(setTimeout(() => setIsTyping(false), msg.delay));
      }
      
      timeouts.push(setTimeout(() => {
        setMessages(prev => [msg, ...prev]);
      }, msg.delay));
    });

    return () => timeouts.forEach(clearTimeout);
  }, []);

  return (
    <section className="w-full pt-2 pb-24 bg-white flex justify-center items-center">
      <div className="relative w-[320px] sm:w-[360px] aspect-[458/916]">
        {/* iPhone Frame */}
        <Image 
          src="/assets/mockup.png"
          alt="iPhone 15 Pro UI"
          fill
          priority
          sizes="(max-width: 640px) 320px, 360px"
          className="object-contain drop-shadow-2xl z-20 pointer-events-none"
        />

        {/* Absolute Screen Container - Adjusting top margin to dodge the notch cleanly */}
        <div className="absolute top-[2.5%] left-[5%] right-[5%] bottom-[3%] sm:left-[6%] sm:right-[6%] rounded-[2.5rem] bg-[#efeae2] overflow-hidden z-10 flex flex-col font-sans border border-gray-200">
          
          {/* WhatsApp Header - Image 3 Exact Colors and Spacing */}
          <div className="w-full bg-[#075e54] px-4 py-3 pb-4 pt-4 flex items-center gap-3 shadow-md z-30">
            <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center text-white text-sm font-bold border border-white/30">
              IA
            </div>
            <div>
              <p className="text-white text-base font-bold leading-tight tracking-wide">meatende.ai</p>
              <p className="text-[#a2e8d4] text-xs mt-0.5">online</p>
            </div>
          </div>

          {/* Chat Feed */}
          {/* Adding a subtle patterned grid typical of modern web whatsapp */}
          <div 
            className="flex-1 overflow-y-hidden px-4 py-5 flex flex-col-reverse gap-3 bg-[#efeae2] relative"
            style={{ backgroundImage: "radial-gradient(#d1cbbd 1px, transparent 1px)", backgroundSize: "20px 20px" }}
          >
             <div className="absolute top-0 inset-x-0 h-6 bg-gradient-to-b from-[#efeae2] to-transparent z-20" aria-hidden="true" />

             {isTyping && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.8, y: 10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.8, transition: { duration: 0.2 } }}
                  className="bg-[#dcf8c6] self-end rounded-2xl rounded-tr-none px-4 py-4 shadow-sm z-10"
                >
                  <div className="flex gap-1.5 items-center justify-center h-2">
                    <motion.div animate={{ opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 1.4, ease: "easeInOut", delay: 0 }} className="w-1.5 h-1.5 bg-[#075e54] rounded-full" />
                    <motion.div animate={{ opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 1.4, ease: "easeInOut", delay: 0.2 }} className="w-1.5 h-1.5 bg-[#075e54] rounded-full" />
                    <motion.div animate={{ opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 1.4, ease: "easeInOut", delay: 0.4 }} className="w-1.5 h-1.5 bg-[#075e54] rounded-full" />
                  </div>
                </motion.div>
             )}

             <AnimatePresence>
              {messages.map((msg) => (
                <MessageBubble key={msg.id} msg={msg} />
              ))}
             </AnimatePresence>
          </div>
        </div>
      </div>
    </section>
  );
}

function MessageBubble({ msg }: { msg: Message }) {
  useEffect(() => {
    console.log(`🎬 [CHAT_UI] Rendering bubble: ${msg.id}`);
  }, [msg.id]);

  const isClient = msg.from === 'client';

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.8, y: 30 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 400, damping: 30 }}
      onAnimationComplete={() => console.log(`✅ [CHAT_UI] Animation complete: ${msg.id}`)}
      className={`max-w-[85%] rounded-[1.2rem] px-4 py-2 text-[14px] leading-relaxed shadow-sm font-medium z-10 ${
        isClient
          ? 'bg-white text-black self-start rounded-tl-sm border border-gray-100'
          : 'bg-[#dcf8c6] text-black self-end rounded-tr-sm border border-[#c4eab0]'
      }`}
    >
      {msg.text}
    </motion.div>
  );
}
