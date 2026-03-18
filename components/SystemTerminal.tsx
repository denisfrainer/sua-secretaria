'use client';

import { useState, useEffect, useRef } from 'react';

type Message = {
  role: 'user' | 'ai';
  text: string;
};

const MessageItem = ({ msg, isLast, isTyping, scrollRef }: { msg: Message; isLast: boolean; isTyping: boolean; scrollRef: React.RefObject<HTMLDivElement | null> }) => {
  const [displayedText, setDisplayedText] = useState('');
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (msg.role === 'user') {
      setDisplayedText(msg.text);
      return;
    }

    if (currentIndex < msg.text.length) {
      const delay = Math.random() * 30 + 20; // 20ms - 50ms
      const timeout = setTimeout(() => {
        setDisplayedText((prev) => prev + msg.text[currentIndex]);
        setCurrentIndex((prev) => prev + 1);
      }, delay);
      return () => clearTimeout(timeout);
    }
  }, [msg.text, currentIndex, msg.role]);

  useEffect(() => {
    if (scrollRef?.current && isLast) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [displayedText, isLast, scrollRef]);

  return (
    <div className="break-words">
      <span className={msg.role === 'user' ? 'text-[#00FF41]/80' : 'text-[#00FF41] font-bold'}>
        {msg.role === 'user' ? 'VOCÊ > ' : 'ELIZA > '}
      </span>
      <span className="[text-shadow:0_0_5px_rgba(0,255,65,0.7)] text-[18px] leading-relaxed">
        {msg.role === 'user' ? msg.text : displayedText}
        {msg.role === 'ai' && isLast && currentIndex < msg.text.length && (
          <span className="animate-blink ml-1">█</span>
        )}
      </span>
    </div>
  );
};

export default function SystemTerminal() {
  const [isVisible, setIsVisible] = useState(false);
  const [hasHydrated, setHasHydrated] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const shellRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasHydrated) {
          setIsVisible(true);
          setHasHydrated(true);
          setMessages([{ role: 'ai', text: 'Sistema ELIZA online. Sou sua consultora de design e conversão. Como posso transformar seu site em uma máquina de vendas hoje?' }]);
        }
      },
      { threshold: 0.2 }
    );

    if (shellRef.current) {
      observer.observe(shellRef.current);
    }

    return () => observer.disconnect();
  }, [hasHydrated]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isTyping) return;

    const userMessage = input.trim();
    setInput('');
    setMessages((prev) => [...prev, { role: 'user', text: userMessage }]);
    setIsTyping(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMessage }),
      });

      if (!response.body) throw new Error('No response body');

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      setMessages((prev) => [...prev, { role: 'ai', text: '' }]);

      let currentText = '';
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        currentText += chunk;
        
        setMessages((prev) => {
          const newMessages = [...prev];
          newMessages[newMessages.length - 1] = {
            role: 'ai',
            text: currentText, // Standard capitalization mixed case
          };
          return newMessages;
        });
      }
    } catch (error) {
      console.error('Streaming error:', error);
      setMessages((prev) => [...prev, { role: 'ai', text: 'Erro: Conexão perdida.' }]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div ref={shellRef} className="relative w-full max-w-2xl mx-auto px-8 sm:px-10 h-[580px] z-40">
      <div
        onClick={() => { if (inputRef.current) inputRef.current.focus(); }}
        className="absolute top-0 left-5 sm:left-8 right-5 sm:right-8 bottom-0 border border-[#00FF41] rounded-[12px] bg-black/95 backdrop-blur-md font-mono text-[#00FF41] shadow-[0_0_25px_rgba(0,255,65,0.5)] overflow-hidden flicker px-5 py-6 cursor-default z-40 flex flex-col"
      >
        {/* Scanlines Effect */}
        <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[size:100%_4px,3px_100%] z-10 opacity-50" />

        {/* Glow Overlay */}
        <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_center,rgba(0,255,65,0.08)_0%,transparent_70%)] z-0" />

        <div className="flex flex-col h-full w-full z-10 flex-1">
          {/* ASCII Header */}
          <div className="flex justify-center items-center w-full overflow-hidden mb-1">
            <pre 
              className="text-[#00FF41] font-mono [text-shadow:0_0_5px_rgba(0,255,65,0.8)] opacity-90 select-none w-full text-center"
              style={{
                fontSize: 'clamp(6px, 1.8vw, 14px)',
                lineHeight: '0.85',
                whiteSpace: 'pre',
              }}
            >
              {`EEEEEE LL     II ZZZZZZZ   AAAA  
EE     LL     II     ZZ   AA  AA 
EEEEE  LL     II   ZZZ   AAAAAAA 
EE     LL     II  ZZ     AA   AA 
EEEEEE LLLLLL II ZZZZZZZ AA   AA `}
            </pre>
          </div>
          <div className="text-[#00FF41] font-mono text-[9px] tracking-wide opacity-80 mb-2 text-center [text-shadow:0_0_3px_rgba(0,255,65,0.5)]">
            ------------------------------------------------------------<br />
            ELIZA -- Um Programa de Estudo de Comunicação em Linguagem Natural<br />
            SDR Script (c) 2026 Association for AI Excellence, Inc.<br />
            Implementação baseada no protocolo ELIZA de 1966.<br />
            ------------------------------------------------------------
          </div>

          <div 
            ref={scrollContainerRef}
            className="flex-1 overflow-y-auto space-y-3 pr-1 scrollbar-none z-10"
          >
            {messages.map((msg, index) => (
              <MessageItem 
                key={index} 
                msg={msg} 
                isLast={index === messages.length - 1} 
                isTyping={isTyping} 
                scrollRef={scrollContainerRef}
              />
            ))}
            {isTyping && messages[messages.length - 1]?.role === 'user' && (
              <div className="flex items-center">
                <span className="text-[#00FF41] font-bold">ELIZA &gt; </span>
                <div className="w-2 h-4 bg-[#00FF41] animate-blink [text-shadow:0_0_5px_rgba(0,255,65,0.7)] ml-1" />
              </div>
            )}
          </div>

          {/* Form and CTA Wrapper */}
          <div className="mt-4 border-t border-[#00FF41]/30 pt-3 z-20">
            <form onSubmit={handleSubmit} className="flex items-center" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center gap-1 mr-2">
                <span className="text-[#00FF41] font-bold">&gt;</span>
              </div>
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                disabled={isTyping}
                className="flex-1 bg-transparent border-none outline-none text-[#00FF41] font-mono placeholder-[#00FF41]/30 [text-shadow:0_0_3px_rgba(0,255,65,0.5)] focus:ring-0 text-[18px]"
                placeholder="Digite sua mensagem..."
              />
            </form>
          </div>
        </div>
      </div>

      <style jsx global>{`
        @keyframes blink {
          50% { opacity: 0; }
        }
        @keyframes flicker {
          0% { opacity: 0.97; }
          5% { opacity: 0.95; }
          10% { opacity: 0.99; }
          15% { opacity: 0.97; }
          30% { opacity: 1; }
          50% { opacity: 0.96; }
          80% { opacity: 0.98; }
          95% { opacity: 0.95; }
          100% { opacity: 0.97; }
        }
        .animate-blink {
          animation: blink 1s step-end infinite;
        }
        .flicker {
          animation: flicker 0.15s infinite;
        }
        .scrollbar-none::-webkit-scrollbar {
          display: none;
        }
        .scrollbar-none {
          -ms-overflow-style: none; /* IE and Edge */
          scrollbar-width: none; /* Firefox */
        }
      `}</style>
    </div>
  );
}
