'use client';

import { motion } from 'framer-motion';
import { Brain, Filter, Shield, QrCode, Mic, Bot, ChevronDown, MessageSquare, Zap } from 'lucide-react';

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
      question: "O que é a Sua SecretarIA?",
      answer: "A Sua SecretarIA é uma secretária virtual com inteligência artificial para WhatsApp. Ela atende seus clientes 24 horas por dia, tira dúvidas sobre seus procedimentos e agenda horários automaticamente. Diferente de robôs de opções (digite 1 ou 2), ela conversa de forma natural como uma pessoa real."
    },
    {
      question: "Para quem a Sua SecretarIA é indicada?",
      answer: "É ideal para quem trabalha com as mãos e não pode parar para responder o celular. Os principais segmentos incluem: barbearias, salões de beleza, clínicas de estética, estúdios de tatuagem, manicures e qualquer profissional que precise focar no serviço enquanto a agenda enche sozinha."
    },
    {
      question: "Como a Sua SecretarIA sabe o que responder?",
      answer: "É simples: você cadastra os seus serviços, durações, preços e horários de funcionamento no nosso painel. A partir daí, a inteligência artificial entende o seu estilo e conversa com seus clientes passando exatamente as informações do seu negócio, sem você precisar programar regras difíceis."
    },
    {
      question: "A Sua SecretarIA funciona com o meu número de WhatsApp?",
      answer: "Sim. Funciona diretamente no seu número de trabalho existente. Você não precisa trocar de número nem comprar um celular novo. A conexão é rápida, segura e feita apenas lendo um QR Code."
    },
    {
      question: "A Sua SecretarIA parece um robô chato?",
      answer: "Não. A Sua SecretarIA entende mensagens curtas, gírias e o contexto da conversa. Ela atende de forma tão fluida e educada que muitos clientes nem percebem que estão falando com uma inteligência artificial na hora de marcar o horário."
    },
    {
      question: "Meu número corre risco de ser banido?",
      answer: "Não. Utilizamos a conexão oficial do WhatsApp (API Oficial da Meta). Isso significa que sua operação roda de forma legalizada, estável e 100% blindada contra banimentos e bloqueios por uso de automação."
    },
    {
      question: "Não corre risco do atendimento ficar engessado?",
      answer: "De jeito nenhum. Esqueça aqueles robôs de operadora. A nossa tecnologia é feita para gerar empatia, dar bom dia, entender o que o cliente quer e responder de forma direta e acolhedora, totalmente sem menus numéricos."
    },
    {
      question: "Vou perder meu histórico se usar o meu número atual?",
      answer: "Não. Você continua com o seu WhatsApp normal no seu celular, with all your old conversations intact. A secretária virtual apenas roda junto com você, assumindo as novas conversas para você não deixar ninguém esperando."
    },
    {
      question: "Posso assumir a conversa no celular se eu quiser?",
      answer: "Sim! A qualquer momento você pode pegar o seu aparelho e responder o cliente normalmente. Quando você, como dono(a), envia uma mensagem, a IA pausa automaticamente e deixa você continuar o atendimento daquele cliente."
    }
  ];

  return (
    <>
      {/* 3. Differentials (Features Grid) */}
      <MotionSection id="diferenciais" className="py-24 sm:py-32 px-4 sm:px-6 lg:px-8 bg-white border-t border-gray-200">
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl sm:text-5xl font-extrabold text-black tracking-tight">
              A diferença entre um robô chato e a sua secretária ideal
            </h2>
            <p className="mt-6 text-xl text-gray-500 leading-relaxed font-medium">
              A Sua SecretarIA não manda opções prontas. Ela entende o cliente, tira as dúvidas e marca o horário.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <motion.div whileHover={{ y: -5 }} className="bg-white rounded-xl p-8 border border-gray-200 hover:border-black transition-all duration-300 flex flex-col items-center sm:items-start text-center sm:text-left">
              <div className="mb-6">
                <Brain className="w-10 h-10 text-blue-600" />
              </div>
              <h3 className="text-2xl font-bold text-black mb-4 tracking-tight">Atendimento Natural</h3>
              <p className="text-gray-500 leading-relaxed font-medium">
                Diferente daquele "digite 1 para valores", nossa IA entende o que o cliente quer. Ela conversa do seu jeito, explica os procedimentos e passa os preços de forma humana e natural.
              </p>
            </motion.div>

            <motion.div whileHover={{ y: -5 }} className="bg-white rounded-xl p-8 border border-gray-200 hover:border-black transition-all duration-300 flex flex-col items-center sm:items-start text-center sm:text-left">
              <div className="mb-6">
                <Filter className="w-10 h-10 text-blue-600" />
              </div>
              <h3 className="text-2xl font-bold text-black mb-4 tracking-tight">Foco na Agenda</h3>
              <p className="text-gray-500 leading-relaxed font-medium">
                Ela não só responde, como organiza sua vida. Se a pessoa só quer saber o preço, a IA informa educadamente. Se quer marcar, ela encontra um horário livre e já deixa agendado para você.
              </p>
            </motion.div>

            <motion.div whileHover={{ y: -5 }} className="bg-white rounded-xl p-8 border border-gray-200 hover:border-black transition-all duration-300 flex flex-col items-center sm:items-start text-center sm:text-left">
              <div className="mb-6">
                <Shield className="w-10 h-10 text-blue-600" />
              </div>
              <h3 className="text-2xl font-bold text-black mb-4 tracking-tight">WhatsApp Safe</h3>
              <p className="text-gray-500 leading-relaxed font-medium">
                Esqueça gambiarras ou medo de ter o WhatsApp banido. Utilizamos a conexão Oficial da Meta. Seu número de trabalho fica 100% seguro, funcionando sem quedas ou bloqueios.
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
            <span className="text-white font-bold">Sua SecretarIA</span> — Inteligência Artificial aplicada ao mundo dos negócios.<br className="hidden sm:block" />
          </p>
          <p className="text-xs text-gray-600 font-bold uppercase tracking-widest mt-4">
            Todos os direitos reservados © {currentYear}
          </p>
        </div>
      </footer>

      {/* Floating CTA / WhatsApp Tracker */}
      <a
        href="https://wa.me/554992123255"
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
