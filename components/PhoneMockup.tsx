'use client';

import { useEffect, useState } from 'react';

interface Message {
  from: 'client' | 'agent';
  text: string;
  delay: number;
}

const conversation: Message[] = [
  { from: 'client', text: 'Oi, vi o anúncio de vocês. Quanto custa o plano mensal?', delay: 800 },
  { from: 'agent', text: 'Olá! 😊 Que bom que nos encontrou! O plano é R$ 499/mês com tudo incluso: atendimento ilimitado, memória de conversa e integração com sua agenda. Quer que eu te mostre como funciona na prática?', delay: 3200 },
  { from: 'client', text: 'Parece bom, mas tenho medo de parecer robô pros meus clientes...', delay: 6000 },
  { from: 'agent', text: 'Entendo perfeitamente! A gente treina a IA com o contexto do SEU negócio — tom de voz, produtos, preços, tudo. Seus clientes vão achar que é alguém da sua equipe. Posso agendar uma demo de 15 min pra você ver ao vivo?', delay: 9500 },
  { from: 'client', text: 'Pode ser amanhã às 14h?', delay: 13000 },
  { from: 'agent', text: 'Perfeito! ✅ Agendei para amanhã, quinta-feira, às 14h. Vou te enviar o link no horário. Até lá! 🚀', delay: 15500 },
];

export function PhoneMockup() {
  const [visibleMessages, setVisibleMessages] = useState<number>(0);
  const [showTyping, setShowTyping] = useState(false);

  useEffect(() => {
    if (visibleMessages >= conversation.length) return;

    const nextMsg = conversation[visibleMessages];
    const typingDelay = nextMsg.from === 'agent' ? 1500 : 0;

    // Show typing indicator before agent messages
    if (nextMsg.from === 'agent') {
      const typingTimer = setTimeout(() => {
        setShowTyping(true);
      }, nextMsg.delay - typingDelay);

      const msgTimer = setTimeout(() => {
        setShowTyping(false);
        setVisibleMessages((v) => v + 1);
      }, nextMsg.delay);

      return () => {
        clearTimeout(typingTimer);
        clearTimeout(msgTimer);
      };
    } else {
      const msgTimer = setTimeout(() => {
        setVisibleMessages((v) => v + 1);
      }, nextMsg.delay);

      return () => clearTimeout(msgTimer);
    }
  }, [visibleMessages]);

  return (
    <div className="relative mx-auto w-[300px] sm:w-[340px]">
      {/* Phone bezel */}
      <div className="rounded-[2.5rem] border-[6px] border-slate-800 bg-slate-800 shadow-2xl shadow-slate-900/40 overflow-hidden">
        {/* Status bar */}
        <div className="bg-[#075e54] px-4 py-3 flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center text-white text-xs font-bold">
            IA
          </div>
          <div>
            <p className="text-white text-sm font-semibold leading-tight">meatende.ai</p>
            <p className="text-emerald-200 text-xs">online</p>
          </div>
        </div>

        {/* Chat body */}
        <div className="bg-[#ece5dd] h-[420px] sm:h-[460px] overflow-hidden px-3 py-3 flex flex-col gap-2">
          {/* WhatsApp background pattern */}
          <div className="absolute inset-0 opacity-[0.04]" style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23000000' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          }} />

          <div className="relative flex flex-col gap-2 overflow-y-auto flex-1">
            {conversation.slice(0, visibleMessages).map((msg, i) => (
              <div
                key={i}
                className={`msg-appear max-w-[85%] rounded-lg px-3 py-2 text-[13px] leading-snug shadow-sm ${
                  msg.from === 'client'
                    ? 'bg-white text-slate-800 self-start rounded-tl-none'
                    : 'bg-[#dcf8c6] text-slate-800 self-end rounded-tr-none'
                }`}
                style={{ animationDelay: `${i * 0.05}s` }}
              >
                {msg.text}
              </div>
            ))}

            {/* Typing indicator */}
            {showTyping && (
              <div className="msg-appear bg-[#dcf8c6] self-end rounded-lg rounded-tr-none px-4 py-3 shadow-sm max-w-[85%]">
                <div className="flex gap-1">
                  <span className="typing-dot w-2 h-2 bg-slate-500 rounded-full" />
                  <span className="typing-dot w-2 h-2 bg-slate-500 rounded-full" />
                  <span className="typing-dot w-2 h-2 bg-slate-500 rounded-full" />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Soft glow behind phone */}
      <div className="absolute -inset-8 bg-gradient-to-r from-indigo-400/20 via-violet-400/20 to-pink-400/20 blur-3xl rounded-full -z-10" />
    </div>
  );
}
