import { Cpu, GitBranch, Shield } from 'lucide-react';

export function LogicSection() {
  return (
    <section className="py-32 px-4 bg-black border-t border-[#00FF41]/20">
      <div className="max-w-7xl mx-auto space-y-16">
        {/* Title */}
        <div className="flex flex-col items-center text-center space-y-4">
          <h2 className="font-heading text-3xl sm:text-4xl font-bold text-white uppercase tracking-wider [text-shadow:0_0_10px_rgba(255,255,255,0.1)]">
            Como funciona
          </h2>
          <p className="text-[#00FF41] font-mono text-base tracking-widest [text-shadow:0_0_5px_rgba(0,255,65,0.3)]">
            Tecnologia de ponta, conversa humana.
          </p>
        </div>

        {/* Grid Container */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Card 1: Arquitetura */}
          <div className="border border-[#00FF41]/30 p-6 bg-black/50 hover:border-[#00FF41]/60 transition-colors duration-300 flex flex-col gap-4 font-mono">
            <div className="flex items-center gap-3">
              <Cpu className="text-[#00FF41] w-6 h-6" />
              <h3 className="text-white font-bold text-lg uppercase">Cérebro Digital</h3>
            </div>
            <p className="text-[#888888] text-base leading-relaxed">
              A ELIZA não lê scripts. Ela entende o contexto, lembra do histórico e conversa como uma pessoa da sua equipe. Qualifica o lead e agenda a reunião.
            </p>
          </div>

          {/* Card 2: Integração */}
          <div className="border border-[#00FF41]/30 p-6 bg-black/50 hover:border-[#00FF41]/60 transition-colors duration-300 flex flex-col gap-4 font-mono">
            <div className="flex items-center gap-3">
              <GitBranch className="text-[#00FF41] w-6 h-6" />
              <h3 className="text-white font-bold text-lg uppercase">Conexão Instantânea</h3>
            </div>
            <p className="text-[#888888] text-base leading-relaxed">
              Integramos com seu CRM ou planilhas no piloto automático. Os dados dos novos clientes caem direto no seu sistema sem você mover um dedo.
            </p>
          </div>

          {/* Card 3: Performance */}
          <div className="border border-[#00FF41]/30 p-6 bg-black/50 hover:border-[#00FF41]/60 transition-colors duration-300 flex flex-col gap-4 font-mono">
            <div className="flex items-center gap-3">
              <Shield className="text-[#00FF41] w-6 h-6" />
              <h3 className="text-white font-bold text-lg uppercase">Seu negócio nunca fecha</h3>
            </div>
            <p className="text-[#888888] text-base leading-relaxed">
              Sua operação funcionando 24 horas por dia, 7 dias por semana. Sem férias, sem atestados. Suporte e vendas sempre ativos.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
