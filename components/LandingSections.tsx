'use client';

import { motion } from 'framer-motion';
import { Brain, Filter, Shield, CheckCircle, QrCode, Mic, Bot, ChevronDown, MessageSquare, Zap } from 'lucide-react';

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

  const faqData = [
    {
      question: "O que é a meatende.ai?",
      answer: "A meatende.ai é um chatbot de inteligência artificial para WhatsApp que atende e qualifica seus leads automaticamente, 24 horas por dia. Diferente de chatbots tradicionais baseados em fluxos prontos, a meatende.ai usa IA generativa para aprender o tom de voz e o processo de vendas da sua empresa a partir das suas conversas reais. Quando um lead entra em contato, ela responde em segundos, qualifica o interesse e organiza tudo no CRM automático com funil de vendas."
    },
    {
      question: "Para quem a meatende.ai é indicada?",
      answer: "A meatende.ai é ideal para qualquer negócio que recebe leads pelo WhatsApp e quer automatizar o primeiro atendimento sem perder a qualidade humana. Os principais segmentos incluem: corretores de imóveis, e-commerces, prestadores de serviço, consultores, clínicas, academias, equipes de vendas B2B e consórcios."
    },
    {
      question: "Como a meatende.ai aprende meu jeito de vender?",
      answer: "A meatende.ai analisa todas as suas conversas anteriores no WhatsApp e aprende automaticamente seu tom de voz, as perguntas que você faz, e como você conduz uma venda. Não precisa programar nada — ela se adapta ao seu estilo real de atendimento."
    },
    {
      question: "A meatende.ai funciona com o meu número de WhatsApp?",
      answer: "Sim. A meatende.ai usa a API oficial do WhatsApp da Meta, então funciona diretamente no seu número existente. Não precisa trocar de número nem criar um novo. A conexão é feita de forma segura via QR Code."
    },
    {
      question: "A meatende.ai parece um robô?",
      answer: "Não. A meatende.ai usa IA generativa que aprende a partir das suas conversas reais. Ela conversa de forma fluida, entende contexto e conduz a qualificação como um humano faria. Os clientes muitas vezes nem percebem que é IA."
    },
    {
      question: "A meatende.ai é segura?",
      answer: "Sim. A meatende.ai é parceira oficial da Meta como Tech Provider verificado e membro do WhatsApp AI Startups Hub. Todas as mensagens são protegidas com criptografia de ponta-a-ponta e a empresa segue as diretrizes da LGPD."
    },
    {
      question: "Não corre risco de ficar robótico?",
      answer: "De forma alguma. O motor Generativo permite que a IA assuma falhas gramaticais da ponta, gírias e o tom de voz do seu negócio, gerando extrema empatia e fluidez sem menus."
    },
    {
      question: "Vou perder meu histórico se usar o meu número atual?",
      answer: "Não. Você mantém todo o acesso ao seu número atual no WhatsApp. A IA apenas roda em plano de fundo absorvendo os leads entrantes instantaneamente."
    },
    {
      question: "Posso parar a IA no meio de um fechamento? (Silent Handoff)",
      answer: "Sim! Qualquer mensagem que você, como vendedor raiz, mandar para o lead, aciona nosso modo \"Silent Handoff\". A IA pausa automaticamente e deixa você realizar o \"kill\"."
    }
  ];
  
  const comparisonData = [
    {
      feature: "Experiência do Lead",
      competitor: "Engessada com menus de botões",
      meatende: "Fluida, natural e 100% conversacional",
      icon: MessageSquare
    },
    {
      feature: "Aprendizado",
      competitor: "Exige programação de regras manuais",
      meatende: "Aprende tudo via áudio rápido seu",
      icon: Brain
    },
    {
      feature: "Qualificação",
      competitor: "Repassa custo de Lead sujo para a equipe",
      meatende: "Identifica curiosos e defende o ticket",
      icon: Filter
    },
    {
      feature: "Setup Inicial",
      competitor: "Semanas arrastando blocos lógicos",
      meatende: "Conectou o QR Code, já está vendendo",
      icon: Zap
    }
  ];

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
            <motion.div whileHover={{ y: -5 }} className="bg-white rounded-xl p-8 border border-gray-200 hover:border-black transition-all duration-300 flex flex-col items-center sm:items-start text-center sm:text-left">
              <div className="mb-6">
                <Brain className="w-10 h-10 text-blue-600" />
              </div>
              <h3 className="text-2xl font-bold text-black mb-4 tracking-tight">Conversa Real</h3>
              <p className="text-gray-500 leading-relaxed font-medium">
                Diferente de robôs de "digite 1 para X", nossa IA entende contexto. Ela aprende o seu tom de voz e o seu processo de vendas fluido.
              </p>
            </motion.div>

            <motion.div whileHover={{ y: -5 }} className="bg-white rounded-xl p-8 border border-gray-200 hover:border-black transition-all duration-300 flex flex-col items-center sm:items-start text-center sm:text-left">
              <div className="mb-6">
                <Filter className="w-10 h-10 text-blue-600" />
              </div>
              <h3 className="text-2xl font-bold text-black mb-4 tracking-tight">Filtro de Curiosos</h3>
              <p className="text-gray-500 leading-relaxed font-medium">
                A IA qualifica o lead durante a conversa. Se for apenas um curioso, ela encerra educadamente. Se for comprador, ela agenda o fechamento.
              </p>
            </motion.div>

            <motion.div whileHover={{ y: -5 }} className="bg-white rounded-xl p-8 border border-gray-200 hover:border-black transition-all duration-300 flex flex-col items-center sm:items-start text-center sm:text-left">
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
            {/* Minimalist connector line (hidden on mobile) */}
            <div className="hidden md:block absolute top-[40px] left-1/4 right-1/4 h-[2px] bg-gray-200 -z-10" />

            <div className="flex flex-col items-center">
              <div className="w-[72px] h-[72px] rounded-[1.25rem] bg-white border border-gray-200 text-black flex items-center justify-center mb-6 shadow-sm shadow-black/5 z-10"><QrCode className="w-[32px] h-[32px] stroke-2" /></div>
              <h3 className="text-xl font-bold text-black mb-3">Conecte seu WhatsApp</h3>
              <p className="text-gray-500 font-medium">Basta escanear o QR Code oficial da Meta. Sem configurações complexas ou códigos.</p>
            </div>

            <div className="flex flex-col items-center">
              <div className="w-[72px] h-[72px] rounded-[1.25rem] bg-white border border-gray-200 text-black flex items-center justify-center mb-6 shadow-sm shadow-black/5 z-10"><Mic className="w-[32px] h-[32px] stroke-2" /></div>
              <h3 className="text-xl font-bold text-black mb-3">Treine a IA</h3>
              <p className="text-gray-500 font-medium">Mande um áudio explicando seus serviços, preços e o que você vende. Ela aprende na hora.</p>
            </div>

            <div className="flex flex-col items-center">
              <div className="w-[72px] h-[72px] rounded-[1.25rem] bg-blue-600 text-white flex items-center justify-center mb-6 shadow-lg shadow-blue-600/30 z-10"><Bot className="w-[32px] h-[32px] stroke-2" /></div>
              <h3 className="text-xl font-bold text-black mb-3">Deixe sua funcionária trabalhar</h3>
              <p className="text-gray-500 font-medium">A IA assume o primeiro contato instantaneamente, sem deixar nenhum lead esfriar no funil.</p>
            </div>
          </div>
        </div>
      </MotionSection>

      {/* 5. Comparison Table (Fully Responsive Stacked Cards & Desktop Grid) */}
      <MotionSection id="comparativo" className="py-24 sm:py-32 px-4 sm:px-6 lg:px-8 bg-white w-full max-w-full overflow-hidden">
        <div className="max-w-4xl mx-auto w-full">
          <h2 className="text-3xl sm:text-5xl font-extrabold text-black tracking-tight text-center mb-16 break-words whitespace-normal">
            Por que o meatende.ai domina
          </h2>

          <div className="w-full flex flex-col gap-8 md:gap-4">
            {/* Header row for Desktop only */}
            <div className="hidden md:grid grid-cols-3 gap-4 px-6 pb-4 border-b border-gray-200">
              <div className="font-bold text-gray-400 uppercase text-xs tracking-wider">Recurso</div>
              <div className="font-bold text-gray-400 uppercase text-xs tracking-wider">Chatbots de Fluxo</div>
              <div className="font-extrabold text-blue-600 uppercase text-xs tracking-wider">meatende.ai (Gen-IA)</div>
            </div>

            {/* Feature Comparison Items */}
            {comparisonData.map((item, idx) => (
              <div 
                key={idx} 
                className="grid grid-cols-1 md:grid-cols-3 gap-0 md:gap-4 bg-white border border-gray-200 rounded-2xl md:rounded-none md:border-none overflow-hidden shadow-sm md:shadow-none transition-all duration-300 hover:shadow-md md:hover:shadow-none"
              >
                {/* Feature Header - Mobile Header, Desktop First Column */}
                <div className="bg-gray-100 md:bg-transparent p-5 md:p-6 font-bold text-black flex items-center gap-3 border-b md:border-none border-gray-200 min-w-0">
                  <item.icon className="w-5 h-5 text-blue-600 shrink-0" />
                  <span className="break-words whitespace-normal leading-tight">{item.feature}</span>
                </div>

                {/* Competitor Block - Mobile Stack, Desktop Second Column */}
                <div className="p-5 md:p-6 text-gray-500 border-b md:border-b-0 md:border-l border-gray-100 md:bg-white md:border md:rounded-xl min-w-0">
                  <span className="block text-[10px] uppercase font-bold text-gray-400 mb-2 md:hidden tracking-wider">Chatbots de Fluxo</span>
                  <p className="break-words whitespace-normal font-medium">{item.competitor}</p>
                </div>

                {/* meatende.ai Block - Mobile Stack, Desktop Third Column */}
                <div className="p-5 md:p-6 font-bold text-blue-700 bg-blue-50/50 md:bg-blue-50/30 md:border md:border-blue-100/50 md:rounded-xl min-w-0">
                  <span className="block text-[10px] uppercase font-extrabold text-blue-600 mb-2 md:hidden tracking-wider">meatende.ai</span>
                  <p className="break-words whitespace-normal">{item.meatende}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </MotionSection>

      {/* 6. Pricing */}
      <MotionSection id="precos" className="py-24 sm:py-32 px-4 sm:px-6 lg:px-8 bg-gray-50 border-y border-gray-200">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-5xl font-extrabold text-black tracking-tight">
              Escolha seu nível de atendimento
            </h2>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-stretch">
            {/* Tier 1: Chatbot Tradicional */}
            <div className="bg-white p-8 md:p-10 border border-gray-200 shadow-sm rounded-3xl text-left flex flex-col">
              <p className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-3">Bot Tradicional</p>
              <div className="flex items-baseline justify-start gap-1 mb-6">
                <span className="text-5xl font-extrabold text-black tracking-tight">R$ 99</span>
                <span className="text-xl text-gray-400 font-bold">/mês</span>
              </div>
              <p className="text-gray-500 font-medium mb-8 leading-relaxed">
                Chatbot e automação simples, com fluxos baseados em menus tradicionais (digite 1, digite 2).
              </p>

              <ul className="text-left space-y-4 mb-10 font-medium flex-1">
                <li className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-gray-400 flex-shrink-0 mt-0.5" />
                  <span className="text-gray-500">Múltipla escolha (menus)</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-gray-400 flex-shrink-0 mt-0.5" />
                  <span className="text-gray-500">Respostas estáticas</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-gray-400 flex-shrink-0 mt-0.5" />
                  <span className="text-gray-500">Necessário criar próprias regras</span>
                </li>
              </ul>

              <a
                href="#precos"
                className="block border-2 border-gray-200 text-gray-600 font-bold text-lg py-4 rounded-xl hover:bg-gray-50 transition-colors w-full text-center mt-auto"
              >
                Plano Básico
              </a>
            </div>

            {/* Tier 2: IA Padrão */}
            <div className="bg-white p-8 md:p-10 border border-gray-200 shadow-sm rounded-3xl text-left flex flex-col relative">
              <p className="text-sm font-bold text-gray-600 uppercase tracking-widest mb-3">Funcionária de IA</p>
              <div className="flex items-baseline justify-start gap-1 mb-6">
                <span className="text-5xl font-extrabold text-black tracking-tight">R$ 249</span>
                <span className="text-xl text-gray-400 font-bold">/mês</span>
              </div>
              <p className="text-gray-600 font-medium mb-8 leading-relaxed">
                Inteligência autônoma que responde no escuro, defende o Lead e agenda automaticamente.
              </p>

              <ul className="text-left space-y-4 mb-10 font-medium flex-1">
                <li className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-gray-600 flex-shrink-0 mt-0.5" />
                  <span className="text-gray-700">Até 3.000 conversas por mês</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-gray-600 flex-shrink-0 mt-0.5" />
                  <span className="text-gray-700">Integração com Agenda oficial do Google</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-gray-600 flex-shrink-0 mt-0.5" />
                  <span className="text-gray-700">Treinamento de IA (Tom de voz e contexto)</span>
                </li>
              </ul>

              <a
                href="#precos"
                className="block bg-gray-900 text-white font-bold text-lg py-4 rounded-xl shadow-md hover:bg-black transition-colors w-full text-center mt-auto"
              >
                Assinar Pro
              </a>
            </div>

            {/* Tier 3: Empresarial - Highlighted */}
            <div className="bg-white p-8 md:p-10 border-2 border-blue-600 shadow-xl rounded-3xl text-left flex flex-col relative transform lg:-translate-y-4">
              <div className="absolute top-0 right-8 transform -translate-y-1/2">
                <span className="bg-blue-600 text-white text-[10px] font-bold uppercase tracking-widest py-1.5 px-3 rounded-full shadow-md">
                  Mais Popular
                </span>
              </div>
              <p className="text-sm font-bold text-blue-600 uppercase tracking-widest mb-3">Empresarial</p>
              <div className="flex items-baseline justify-start gap-1 mb-6">
                <span className="text-5xl font-extrabold text-black tracking-tight border-b-2 border-blue-600 pb-1">R$ 499</span>
                <span className="text-xl text-gray-400 font-bold">/mês</span>
              </div>
              <p className="text-gray-600 font-medium mb-8 leading-relaxed">
                Escala máxima para operações ativas. Intervenção híbrida, base de dados e suporte total.
              </p>

              <ul className="text-left space-y-4 mb-10 font-medium flex-1">
                <li className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <span className="text-gray-900">Até 9.000 conversas por mês</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <span className="text-gray-900">Até 3 alterações de contexto no mês</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <span className="text-gray-900">Suporte Técnico Prioritário 24/7</span>
                </li>
                {/* Code-specific features */}
                <li className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <span className="text-gray-900">Handoff Silencioso / Intervenção Nativa do Vendedor</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <span className="text-gray-900">Dashboard próprio via infraestrutura Supabase Leads</span>
                </li>
              </ul>

              <a
                href="#precos"
                className="block bg-blue-600 text-white font-bold text-lg py-4 rounded-xl shadow-lg hover:bg-blue-700 transition-colors w-full text-center mt-auto"
              >
                Assinar Elite
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
            {faqData.map((item, index) => (
              <details key={index} className="group border-b border-gray-200" open={index === 0}>
                <summary className="flex justify-between items-center py-6 font-bold text-black text-xl md:text-2xl cursor-pointer list-none [&::-webkit-details-marker]:hidden hover:text-blue-600 transition-colors">
                  <span>{item.question}</span>
                  <ChevronDown className="w-6 h-6 text-gray-400 group-open:rotate-180 transition-transform duration-300" />
                </summary>
                <div className="pb-6 text-gray-600 font-medium leading-relaxed md:text-lg pr-8">
                  {item.answer}
                </div>
              </details>
            ))}
          </div>
        </div>
      </MotionSection>


      {/* 8. Footer Strict Palette */}
      <footer className="py-16 bg-black text-white text-center">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col items-center gap-6">
          <p className="font-medium text-gray-400 tracking-wide text-sm">
            <span className="text-white font-bold">meatende.ai</span> — Inteligência Artificial aplicada ao mundo dos negócios.<br className="hidden sm:block" />
          </p>
          <p className="text-xs text-gray-600 font-bold uppercase tracking-widest mt-4">
            Todos os direitos reservados © {currentYear}
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
