'use client';

import { useState, useEffect, useRef } from 'react';

type Message = {
  role: 'user' | 'ai';
  text: string;
};

export default function ElizaTerminal() {
  const [messages, setMessages] = useState<Message[]>([
    { role: 'ai', text: 'ELIZA: READY. HOW CAN I OPTIMIZE YOUR SALES TODAY?' }
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const terminalRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
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
      
      // Add an empty AI message to stream into
      setMessages((prev) => [...prev, { role: 'ai', text: '' }]);

      let currentText = '';
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        
        const chunk = decoder.decode(value, { stream: true });
        currentText += chunk;
        
        // Update the last message
        setMessages((prev) => {
          const newMessages = [...prev];
          newMessages[newMessages.length - 1] = {
            role: 'ai',
            text: currentText,
          };
          return newMessages;
        });
      }
    } catch (error) {
      console.error('Streaming error:', error);
      setMessages((prev) => [...prev, { role: 'ai', text: 'ERROR: CONNECTION LOST.' }]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div className="relative w-full max-w-2xl mx-auto border border-[#00FF41] rounded-[12px] bg-black p-6 font-mono text-[#00FF41] overflow-hidden shadow-[0_0_15px_rgba(0,255,65,0.3)] min-h-[400px] flex flex-col">
      {/* Scanlines Effect */}
      <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[size:100%_4px,3px_100%] z-10 opacity-70" />
      
      {/* Glow Overlay */}
      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_center,rgba(0,255,65,0.05)_0%,transparent_70%)] z-0" />

      <div 
        ref={terminalRef}
        className="flex-1 overflow-y-auto space-y-3 pr-2 scrollbar-thin scrollbar-thumb-[#00FF41] scrollbar-track-black z-10"
      >
        {messages.map((msg, index) => (
          <div key={index} className="break-words">
            <span className={msg.role === 'user' ? 'text-[#00FF41]/80' : 'text-[#00FF41] font-bold'}>
              {msg.role === 'user' ? 'YOU > ' : 'ELIZA > '}
            </span>
            <span className="[text-shadow:0_0_5px_rgba(0,255,65,0.7)]">
              {msg.text}
            </span>
          </div>
        ))}
        {isTyping && (
          <div className="flex items-center">
            <span className="text-[#00FF41] font-bold">ELIZA &gt; </span>
            <div className="w-2 h-4 bg-[#00FF41] animate-blink [text-shadow:0_0_5px_rgba(0,255,65,0.7)] ml-1" />
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={handleSubmit} className="mt-4 flex items-center border-t border-[#00FF41]/30 pt-3 z-20">
        <span className="text-[#00FF41] mr-2 font-bold">&gt;</span>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={isTyping}
          className="flex-1 bg-transparent border-none outline-none text-[#00FF41] font-mono placeholder-[#00FF41]/30 [text-shadow:0_0_3px_rgba(0,255,65,0.5)] focus:ring-0"
          placeholder="Ask ELIZA..."
          autoFocus
        />
      </form>

      <style jsx global>{`
        @keyframes blink {
          50% { opacity: 0; }
        }
        .animate-blink {
          animation: blink 1s step-end infinite;
        }
        /* Custom scrollbar to match theme */
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
