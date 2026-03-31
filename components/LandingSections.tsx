'use client';

import { motion } from 'framer-motion';
import { Brain, Filter, Shield, CheckCircle } from 'lucide-react';

const MotionSection = ({ children, className, id }: { children: React.ReactNode, className?: string, id?: string }) => (
  <motion.section
    id={id}
    className={className}
    initial={{ opacity: 0, y: 40 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true, margin: "-100px" }}
    transition={{ duration: 0.7, ease: "easeOut" }}
  >
    {children}
  </motion.section>
);

export function LandingSections() {
  const currentYear = new Date().getFullYear();

  return (
    <>
      {/* 3. Differentials (Features Grid) */}
      <MotionSection id="diferenciais" className="py-24 sm:py-32 px-4 sm:px-6 lg:px-8 bg-white border-t border-gray-200">
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl sm:text-5xl font-extrabold text-black tracking-tight">
              A diferença entre um bot repetitivo e um Ativo de Vendas
            </h2>
            <p className="mt-6 text-xl text-gray-500 leading-relaxed font-medium">
              O meatende.ai não apenas responde mensagens. Ele entende, qualifica e fecha.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <motion.div whileHover={{ y: -5 }} className="bg-white rounded-xl p-8 border border-gray-200 hover:border-black transition-all duration-300">
              <div className="mb-6">
                <Brain className="w-10 h-10 text-blue-600" />
              </div>
              <h3 className="text-2xl font-bold text-black mb-4 tracking-tight">Conversa Real</h3>
              <p className="text-gray-500 leading-relaxed font-medium">
                Diferente de robôs de "digite 1 para X", nossa IA entende contexto. Ela aprende o seu tom de voz e o seu processo de vendas fluido.
              </p>
            </motion.div>

            <motion.div whileHover={{ y: -5 }} className="bg-white rounded-xl p-8 border border-gray-200 hover:border-black transition-all duration-300">
              <div className="mb-6">
                <Filter className="w-10 h-10 text-blue-600" />
              </div>
              <h3 className="text-2xl font-bold text-black mb-4 tracking-tight">Filtro de Curiosos</h3>
              <p className="text-gray-500 leading-relaxed font-medium">
                A IA qualifica o lead durante a conversa. Se for apenas um curioso, ela encerra educadamente. Se for comprador, ela agenda o fechamento.
              </p>
            </motion.div>

            <motion.div whileHover={{ y: -5 }} className="bg-white rounded-xl p-8 border border-gray-200 hover:border-black transition-all duration-300">
              <div className="mb-6">
                <Shield className="w-10 h-10 text-blue-600" />
              </div>
              <h3 className="text-2xl font-bold text-black mb-4 tracking-tight">Conexão Oficial</h3>
              <p className="text-gray-500 leading-relaxed font-medium">
                Esqueça gambiarras e WhatsApp banido. Utilizamos a API Oficial da Meta. Sua operação fica 100% blindada, estável e profissional.
              </p>
            </motion.div>
          </div>
        </div>
      </MotionSection>

      {/* 4. Setup Flow */}
      <MotionSection id="setup" className="py-24 sm:py-32 px-4 sm:px-6 lg:px-8 bg-gray-50 border-y border-gray-200">
        <div className="max-w-5xl mx-auto text-center">
          <h2 className="text-3xl sm:text-5xl font-extrabold text-black tracking-tight mb-20">
            Configure sua IA conversando com ela.
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12 relative">
            {/* Minimalist connector line */}
            <div className="hidden md:block absolute top-[28px] left-1/4 right-1/4 h-[1px] bg-gray-300 -z-10" />
            
            <div className="flex flex-col items-center">
              <div className="w-14 h-14 rounded-full bg-black text-white flex items-center justify-center text-xl font-bold mb-6">1</div>
              <h3 className="text-xl font-bold text-black mb-3">Conecte seu WhatsApp</h3>
              <p className="text-gray-500 font-medium">Basta escanear o QR Code oficial da Meta. Sem configurações complexas ou códigos.</p>
            </div>
            
            <div className="flex flex-col items-center">
              <div className="w-14 h-14 rounded-full bg-black text-white flex items-center justify-center text-xl font-bold mb-6">2</div>
              <h3 className="text-xl font-bold text-black mb-3">Treine a IA</h3>
              <p className="text-gray-500 font-medium">Mande um áudio explicando seus serviços, preços e o que você vende. Ela aprende na hora.</p>
            </div>
            
            <div className="flex flex-col items-center">
              <div className="w-14 h-14 rounded-full bg-blue-600 text-white flex items-center justify-center text-xl font-bold mb-6">3</div>
              <h3 className="text-xl font-bold text-black mb-3">Deixe o Lobo Caçar</h3>
              <p className="text-gray-500 font-medium">A IA assume o primeiro contato instantaneamente, sem deixar nenhum lead esfriar no funil.</p>
            </div>
          </div>
        </div>
      </MotionSection>

      {/* 5. Comparison Table */}
      <MotionSection id="comparativo" className="py-24 sm:py-32 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl sm:text-5xl font-extrabold text-black tracking-tight text-center mb-16">
            Por que o meatende.ai domina
          </h2>
          <div className="overflow-hidden border border-gray-200 shadow-sm rounded-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse bg-white">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="p-6 font-bold text-gray-500 uppercase text-xs tracking-wider">Recurso</th>
                    <th className="p-6 font-bold text-gray-400 uppercase text-xs tracking-wider border-l border-gray-200">Chatbots de Fluxo</th>
                    <th className="p-6 font-extrabold text-blue-600 uppercase text-xs tracking-wider border-l border-gray-200">meatende.ai (Gen-IA)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  <tr className="hover:bg-gray-50/50 transition-colors">
                    <td className="p-6 font-bold text-black">Experiência do Lead</td>
                    <td className="p-6 text-gray-500 border-l border-gray-100">Engessada com menus de botões</td>
                    <td className="p-6 font-bold text-black border-l border-gray-100 bg-blue-50/50">Fluida, natural e 100% conversacional</td>
                  </tr>
                  <tr className="hover:bg-gray-50/50 transition-colors">
                    <td className="p-6 font-bold text-black">Aprendizado</td>
                    <td className="p-6 text-gray-500 border-l border-gray-100">Exige programação de regras manuais</td>
                    <td className="p-6 font-bold text-black border-l border-gray-100 bg-blue-50/50">Aprende tudo via áudio rápido seu</td>
                  </tr>
                  <tr className="hover:bg-gray-50/50 transition-colors">
                    <td className="p-6 font-bold text-black">Qualificação</td>
                    <td className="p-6 text-gray-500 border-l border-gray-100">Repassa custo de Lead sujo para a equipe</td>
                    <td className="p-6 font-bold text-blue-600 border-l border-gray-100 bg-blue-50/50">Identifica curiosos e defende o ticket</td>
                  </tr>
                  <tr className="hover:bg-gray-50/50 transition-colors">
                    <td className="p-6 font-bold text-black">Setup Inicial</td>
                    <td className="p-6 text-gray-500 border-l border-gray-100">Semanas arrastando blocos lógicos</td>
                    <td className="p-6 font-bold text-black border-l border-gray-100 bg-blue-50/50">Conectou o QR Code, já está vendendo</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </MotionSection>

      {/* 6. Pricing */}
      <MotionSection id="precos" className="py-24 sm:py-32 px-4 sm:px-6 lg:px-8 bg-gray-50 border-y border-gray-200">
        <div className="max-w-lg mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-5xl font-extrabold text-black tracking-tight">
              Preço Simples
            </h2>
          </div>

          <div className="bg-white p-10 border border-gray-200 shadow-md text-center">
            <p className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-6">Acesso Completo</p>
            <div className="flex items-baseline justify-center gap-1 mb-8">
              <span className="text-6xl font-extrabold text-black tracking-tight border-b-2 border-blue-600 pb-1">R$ 249</span>
              <span className="text-xl text-gray-400 font-bold">/mês</span>
            </div>

            <ul className="text-left space-y-4 mb-10 font-medium">
              <li className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-black flex-shrink-0 mt-0.5" />
                <span className="text-gray-600">Atendimento ilimitado de leads</span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-black flex-shrink-0 mt-0.5" />
                <span className="text-gray-600">Conexão API Oficial Meta Cloud</span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-black flex-shrink-0 mt-0.5" />
                <span className="text-gray-600">Integração Google Calendar incluída</span>
              </li>
            </ul>

            <div className="flex justify-center">
              <a 
                href="#precos" 
                className="bg-blue-600 text-white font-bold text-lg px-12 py-5 rounded-2xl shadow-xl hover:bg-blue-700 transition-colors w-full sm:w-auto min-w-[280px] text-center"
              >
                Assinar Agora
              </a>
            </div>
          </div>
        </div>
      </MotionSection>

      {/* 7. FAQ */}
      <MotionSection id="faq" className="py-24 sm:py-32 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-3xl sm:text-4xl font-extrabold text-black tracking-tight text-center mb-16">
            Perguntas Frequentes
          </h2>

          <div className="space-y-0 border-t border-gray-200">
            <details className="group border-b border-gray-200">
              <summary className="flex justify-between items-center py-6 font-bold text-black text-lg cursor-pointer list-none [&::-webkit-details-marker]:hidden hover:text-blue-600 transition-colors">
                <span>Não corre risco de ficar robótico?</span>
                <span className="text-gray-400 group-open:rotate-180 transition-transform duration-200">▼</span>
              </summary>
              <div className="pb-6 text-gray-600 font-medium leading-relaxed pr-8">
                De forma alguma. O motor Generativo permite que a IA assuma falhas gramaticais da ponta, gírias e o tom de voz do seu negócio, gerando extrema empatia e fluidez sem menus.
              </div>
            </details>

            <details className="group border-b border-gray-200">
              <summary className="flex justify-between items-center py-6 font-bold text-black text-lg cursor-pointer list-none [&::-webkit-details-marker]:hidden hover:text-blue-600 transition-colors">
                <span>Vou perder meu histórico se usar o meu número atual?</span>
                <span className="text-gray-400 group-open:rotate-180 transition-transform duration-200">▼</span>
              </summary>
              <div className="pb-6 text-gray-600 font-medium leading-relaxed pr-8">
                Não. Você mantém todo o acesso ao seu número atual no WhatsApp. A IA apenas roda em plano de fundo absorvendo os leads entrantes instantaneamente.
              </div>
            </details>

            <details className="group border-b border-gray-200">
              <summary className="flex justify-between items-center py-6 font-bold text-black text-lg cursor-pointer list-none [&::-webkit-details-marker]:hidden hover:text-blue-600 transition-colors">
                <span>Posso parar a IA no meio de um fechamento? (Silent Handoff)</span>
                <span className="text-gray-400 group-open:rotate-180 transition-transform duration-200">▼</span>
              </summary>
              <div className="pb-6 text-gray-600 font-medium leading-relaxed pr-8">
                Sim! Qualquer mensagem que você, como vendedor raiz, mandar para o lead, aciona nosso modo "Silent Handoff". A IA pausa automaticamente e deixa você realizar o "kill".
              </div>
            </details>
          </div>
        </div>
      </MotionSection>

      {/* 8. Footer Strict Palette */}
      <footer className="py-16 bg-black text-white text-center">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col items-center gap-6">
          <p className="font-medium text-gray-400 tracking-wide text-sm">
            <span className="text-white font-bold">meatende.ai</span> — Inteligência Artificial aplicada ao mundo real.<br className="hidden sm:block" />
            Parte do ecossistema Wolf Agent.
          </p>
          <p className="text-xs text-gray-600 font-bold uppercase tracking-widest mt-4">
            © {currentYear} Florianópolis, SC. Todos os direitos reservados.
          </p>
        </div>
      </footer>

      {/* Floating CTA / WhatsApp Tracker */}
      <a
        href="https://wa.me/5511999999999"
        target="_blank"
        rel="noopener noreferrer"
        onClick={() => console.log('🚀 [LEAD ACTION] Clicou no Floating WhatsApp')}
        className="fixed bottom-6 right-6 z-50 w-16 h-16 flex items-center justify-center drop-shadow-2xl hover:opacity-90 transition-opacity"
        title="Fale Conosco no WhatsApp"
      >
        <img 
          src="/assets/whatsapp.svg" 
          alt="WhatsApp Logo" 
          className="w-full h-full object-contain bg-transparent"
          onLoad={() => console.log('✅ WhatsApp icon: Assets')}
        />
      </a>
    </>
  );
}
