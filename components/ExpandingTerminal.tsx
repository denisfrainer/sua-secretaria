'use client';

import { useState, useEffect, useRef } from 'react';

type Message = {
  role: 'user' | 'ai';
  text: string;
};

export default function ExpandingTerminal() {
  const [isOpen, setIsOpen] = useState(false);
  const [hasHydrated, setHasHydrated] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleExpand = () => {
    if (!isOpen) {
      setIsOpen(true);
      if (!hasHydrated) {
        setHasHydrated(true);
        setMessages([{ role: 'ai', text: 'COMO VOCÊ ESTÁ. POR FAVOR, DIGA-ME O SEU PROBLEMA.' }]);
      }
    }
  };

  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }, [isOpen]);

  useEffect(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

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
            text: currentText.toUpperCase(), // Enforce all-caps just to be sure
          };
          return newMessages;
        });
      }
    } catch (error) {
      console.error('Streaming error:', error);
      setMessages((prev) => [...prev, { role: 'ai', text: 'ERRO: CONEXÃO PERDIDA.' }]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div className="relative w-full max-w-xl mx-auto h-[60px] z-40">
      <div
        onClick={handleExpand}
        className={`absolute top-0 left-0 w-full border border-[#00FF41] rounded-[12px] bg-black/95 backdrop-blur-md font-mono text-[#00FF41] shadow-[0_0_25px_rgba(0,255,65,0.5)] overflow-hidden flicker ${isOpen ? 'h-[500px] p-6 cursor-default z-40' : 'h-[60px] flex items-center px-6 cursor-pointer hover:shadow-[0_0_30px_rgba(0,255,65,0.7)]'
          }`}
        style={{
          clipPath: isOpen ? 'inset(0% 0% 0% 0% rounded 12px)' : 'inset(0% 0% calc(100% - 60px) 0% rounded 12px)',
          transition: 'clip-path 1800ms cubic-bezier(0.16, 1, 0.3, 1)',
          willChange: 'clip-path, transform',
        }}
      >
        {/* Scanlines Effect */}
        <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[size:100%_4px,3px_100%] z-10 opacity-50" />

        {/* Glow Overlay */}
        <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_center,rgba(0,255,65,0.08)_0%,transparent_70%)] z-0" />

        {!isOpen ? (
          <div className="flex items-center gap-2 z-20 w-full">
            <span className="text-[#00FF41] font-bold">&gt;</span>
            <span className="[text-shadow:0_0_5px_rgba(0,255,65,0.7)] font-bold tracking-wider">CONSULTAR AGENTE_</span>
            <div className="w-2 h-4 bg-[#00FF41] animate-blink [text-shadow:0_0_5px_rgba(0,255,65,0.7)] ml-1" />
          </div>
        ) : (
          <div className="flex flex-col h-full w-full z-10">
            {/* ASCII Header */}
            <div className="flex justify-center items-center w-full overflow-hidden mb-1">
              <pre
                className="text-[#00FF41] font-mono [text-shadow:0_0_5px_rgba(0,255,65,0.8)] opacity-90 select-none"
                style={{
                  fontSize: 'clamp(4px, 1.5vw, 11px)',
                  lineHeight: '0.85',
                  whiteSpace: 'pre',
                }}
              >
                {`AAAAA   GGGGG  EEEEE  N   N  TTTTT  EEEEE
A     A G       E      NN  N    T    E
AAAAAAA G  GGG  EEEEE  N N N    T    EEEEE
A     A G    G  E      N  NN    T    E
A     A  GGGGG  EEEEE  N   N    T    EEEEE`}
              </pre>
            </div>
            <div className="text-[#00FF41] font-mono text-[9px] tracking-wide opacity-80 mb-2 text-center [text-shadow:0_0_3px_rgba(0,255,65,0.5)]">
              ------------------------------------------------------------<br />
              AGENTE -- Um Programa de Estudo de Comunicação em Linguagem Natural<br />
              SDR Script (c) 2026 Association for AI Excellence, Inc.<br />
              Implementação baseada no protocolo ELIZA de 1966.<br />
              ------------------------------------------------------------
            </div>

            <div
              ref={scrollContainerRef}
              className="flex-1 overflow-y-auto space-y-3 pr-2 scrollbar-thin scrollbar-thumb-[#00FF41] scrollbar-track-black"
            >
              {messages.map((msg, index) => (
                <div key={index} className="break-words">
                  <span className={msg.role === 'user' ? 'text-[#00FF41]/80' : 'text-[#00FF41] font-bold'}>
                    {msg.role === 'user' ? 'VOCÊ > ' : 'AGENTE > '}
                  </span>
                  <span className="[text-shadow:0_0_5px_rgba(0,255,65,0.7)]">
                    {msg.text}
                  </span>
                </div>
              ))}
              {isTyping && (
                <div className="flex items-center">
                  <span className="text-[#00FF41] font-bold">AGENTE &gt; </span>
                  <div className="w-2 h-4 bg-[#00FF41] animate-blink [text-shadow:0_0_5px_rgba(0,255,65,0.7)] ml-1" />
                </div>
              )}
            </div>

            <form onSubmit={handleSubmit} className="mt-4 flex items-center border-t border-[#00FF41]/30 pt-3 z-20" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center gap-1 mr-2">
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); setIsOpen(false); }}
                  className="text-[#00FF41] hover:text-[#00D135] cursor-pointer text-xs font-bold border border-[#00FF41]/30 rounded px-1.5 py-0.5 bg-black/50 [text-shadow:0_0_3px_rgba(0,255,65,0.5)]"
                  title="Minimizar"
                >
                  _
                </button>
                <span className="text-[#00FF41] font-bold">&gt;</span>
              </div>
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                disabled={isTyping}
                className="flex-1 bg-transparent border-none outline-none text-[#00FF41] font-mono placeholder-[#00FF41]/30 [text-shadow:0_0_3px_rgba(0,255,65,0.5)] focus:ring-0"
                placeholder="Digite sua mensagem para ELIZA..."
              />
            </form>
          </div>
        )}
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
        ::-webkit-scrollbar {
          width: 4px;
        }
        ::-webkit-scrollbar-track {
          background: #000;
        }
        ::-webkit-scrollbar-thumb {
          background: #00FF41;
          border-radius: 2px;
        }
        ::-webkit-scrollbar-thumb:hover {
          background: #00D135;
        }
      `}</style>
    </div>
  );
}
