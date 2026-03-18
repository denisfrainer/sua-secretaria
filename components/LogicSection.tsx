import { Cpu, GitBranch, Shield } from 'lucide-react';

export function LogicSection() {
  return (
    <section className="py-32 px-4 bg-black border-t border-[#00FF41]/20">
      <div className="max-w-7xl mx-auto space-y-16">
        {/* Title */}
        <div className="flex flex-col items-center text-center space-y-4">
          <h2 className="font-heading text-3xl sm:text-4xl font-bold text-white uppercase tracking-wider [text-shadow:0_0_10px_rgba(255,255,255,0.1)]">
            O MOTOR POR TRÁS DA BRUXARIA
          </h2>
          <p className="text-[#00FF41] font-mono text-sm tracking-widest [text-shadow:0_0_5px_rgba(0,255,65,0.3)]">
            ENG_SYSTEM_CORES // ONLINE 
          </p>
        </div>

        {/* Grid Container */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Card 1: Arquitetura */}
          <div className="border border-[#00FF41]/30 p-6 bg-black/50 hover:border-[#00FF41]/60 transition-colors duration-300 flex flex-col gap-6 font-mono">
            <div className="flex items-center gap-3">
              <Cpu className="text-[#00FF41] w-6 h-6" />
              <h3 className="text-white font-bold text-lg uppercase">Nossa Arquitetura</h3>
            </div>
            <p className="text-[#888888] text-sm leading-relaxed">
              ELIZA utiliza um híbrido proprietário de LLMs de elite (GPT-4o/Gemini 1.5 Pro) otimizados para conversão via RAG (Retrieval-Augmented Generation).
            </p>
            
            {/* Pure CSS/Tailwind Diagram */}
            <div className="mt-4 border border-[#00FF41]/20 p-4 bg-black flex flex-col items-center gap-3 text-xs">
              <div className="border border-[#00FF41] px-2 py-1 text-[#00FF41] rounded">VISITANTE</div>
              <div className="w-0.5 h-4 bg-[#00FF41]/50 flex items-center justify-center">↓</div>
              <div className="border border-[#00FF41]/50 px-2 py-1 text-white bg-[#111] rounded">RAG (PROMPT CONTEXT)</div>
              <div className="w-0.5 h-4 bg-[#00FF41]/50"></div>
              <div className="flex gap-2">
                <div className="border border-[#00FF41]/30 px-2 py-1 text-white/80">LLM HYBRID</div>
                <div className="flex items-center">→</div>
                <div className="border border-[#00FF41] px-2 py-1 text-[#00FF41] font-bold">WHATSAPP</div>
              </div>
            </div>
          </div>

          {/* Card 2: Integração */}
          <div className="border border-[#00FF41]/30 p-6 bg-black/50 hover:border-[#00FF41]/60 transition-colors duration-300 flex flex-col gap-6 font-mono">
            <div className="flex items-center gap-3">
              <GitBranch className="text-[#00FF41] w-6 h-6" />
              <h3 className="text-white font-bold text-lg uppercase">Integração Nativa</h3>
            </div>
            <p className="text-[#888888] text-sm leading-relaxed">
              Conecte gatilhos Webhook/API em tempo real para seu CRM (HubSpot, Salesforce, RD Station) ou ferramentas de automação (Zapier, Make).
            </p>

            {/* Pseudo Code Block */}
            <div className="mt-4 border border-[#00FF41]/20 p-4 bg-[#050505] font-mono text-[11px] text-[#00FF41]/80 space-y-1 overflow-x-hidden">
              <div className="text-white/40">// LOG: webhook_trigger_success</div>
              <div>POST /api/v1/webhook</div>
              <div>Host: <span className="text-white">api.eliza.io</span></div>
              <div>{`{`}</div>
              <div className="pl-4">"event": <span className="text-white">"lead_qualified"</span>,</div>
              <div className="pl-4">"trigger": <span className="text-white">"eliza"</span>,</div>
              <div className="pl-4">"status": <span className="text-white">200 OK</span></div>
              <div>{`}`}</div>
            </div>
          </div>

          {/* Card 3: Performance */}
          <div className="border border-[#00FF41]/30 p-6 bg-black/50 hover:border-[#00FF41]/60 transition-colors duration-300 flex flex-col gap-6 font-mono">
            <div className="flex items-center gap-3">
              <Shield className="text-[#00FF41] w-6 h-6" />
              <h3 className="text-white font-bold text-lg uppercase">Performance & Segurança</h3>
            </div>
            <p className="text-[#888888] text-sm leading-relaxed">
              Infraestrutura de alta redundância com criptografia ponta-a-ponta e segurança de nível corporativo.
            </p>

            {/* Specs Specs Bullet Table */}
            <div className="mt-4 space-y-3">
              <div className="flex justify-between border-b border-[#00FF41]/10 pb-1 text-xs">
                <span className="text-[#00FF41]/60 uppercase">Latência Média</span>
                <span className="text-white">&lt; 500ms</span>
              </div>
              <div className="flex justify-between border-b border-[#00FF41]/10 pb-1 text-xs">
                <span className="text-[#00FF41]/60 uppercase">Criptografia</span>
                <span className="text-white">AES-256</span>
              </div>
              <div className="flex justify-between border-b border-[#00FF41]/10 pb-1 text-xs">
                <span className="text-[#00FF41]/60 uppercase">Disponibilidade</span>
                <span className="text-white">99.99%</span>
              </div>
              <div className="flex justify-between border-b border-[#00FF41]/10 pb-1 text-xs">
                <span className="text-[#00FF41]/60 uppercase">Segurança</span>
                <span className="text-white">SOC2 Ready</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
