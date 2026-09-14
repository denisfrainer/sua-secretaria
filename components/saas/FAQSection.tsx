'use client';

import React, { useState } from 'react';
import { ChevronDown, HelpCircle, MessageCircle, Sparkles } from 'lucide-react';
import Link from 'next/link';

export function FAQSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const faqs = [
    {
      question: 'O cliente precisa baixar algum aplicativo para girar a roleta?',
      answer:
        'Não! Essa é uma das maiores vantagens da Roleta Vantajosa. Tudo funciona 100% no navegador do celular do cliente. Ao apontar a câmera para o seu QR Code no balcão ou clicar no link enviado pelo WhatsApp/Instagram, a página abre instantaneamente em menos de 2 segundos, sem qualquer atrito.'
    },
    {
      question: 'Como evito que a mesma pessoa gire várias vezes para esgotar meus prêmios?',
      answer:
        'Nosso sistema possui tecnologia antifraude rigorosa de nível bancário. Cada número de WhatsApp e endereço de IP fica estritamente bloqueado por 24 horas após um giro. Tentativas de recarregar a página ou fraudar o formulário são repelidas pelo servidor, garantindo total segurança para o seu estoque.'
    },
    {
      question: 'Como sei que o cliente não está inventando um cupom falso no balcão?',
      answer:
        'Todo cupom gerado possui uma assinatura criptográfica com código alfanumérico único no formato ROL-XXXXXX. No seu painel de controle do lojista, você conta com a ferramenta "Validação de Cupons" onde basta digitar o código ou o WhatsApp do cliente para validar o status e resgatar o prêmio com 1 clique.'
    },
    {
      question: 'E se o estoque de um determinado prêmio acabar no meio do expediente?',
      answer:
        'Você tem controle absoluto em tempo real. No painel de controle, você define a quantidade máxima de cada prêmio. Se o estoque de um prêmio zerar, o sistema remove aquela probabilidade imediatamente ou você pode desativar o item com um simples interruptor no celular.'
    },
    {
      question: 'Como faço para começar e quanto tempo demora a configuração?',
      answer:
        'Leva menos de 3 minutos! Assim que seu acesso é liberado, você entra no painel, escolhe as cores da sua loja, adiciona os prêmios que deseja distribuir e já faz o download do seu QR Code exclusivo em alta definição para imprimir e colocar nas mesas ou no balcão.'
    },
    {
      question: 'Posso cancelar minha assinatura a qualquer momento?',
      answer:
        'Sim, com total liberdade e transparência. No plano mensal, não há fidelidade nem multas rescisórias. Você pode cancelar sua renovação a qualquer instante diretamente na sua área de cliente sem precisar justificar nada.'
    }
  ];

  const toggleAccordion = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <section id="faq" className="py-20 md:py-28 bg-white relative scroll-mt-16">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="text-center mb-16 space-y-4">
          <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-rose-50 border border-rose-200/80 text-rose-700 text-xs font-extrabold uppercase tracking-wider">
            <HelpCircle className="w-3.5 h-3.5 text-rose-500" />
            <span>Tire Suas Dúvidas</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
            Perguntas Frequentes
          </h2>
          <p className="text-base sm:text-lg text-slate-600 leading-relaxed max-w-2xl mx-auto">
            Tudo o que você precisa saber sobre a implementação, segurança e resultados da Roleta Vantajosa no seu comércio.
          </p>
        </div>

        {/* Accordion List */}
        <div className="space-y-4">
          {faqs.map((faq, idx) => {
            const isOpen = openIndex === idx;
            return (
              <div
                key={idx}
                className={`rounded-2xl border transition-all duration-200 overflow-hidden ${
                  isOpen
                    ? 'border-rose-300 bg-rose-50/30 shadow-md shadow-rose-500/5'
                    : 'border-slate-200 bg-white hover:border-slate-300'
                }`}
              >
                <button
                  onClick={() => toggleAccordion(idx)}
                  type="button"
                  aria-expanded={isOpen}
                  className="w-full py-5 px-6 text-left flex items-center justify-between gap-4 font-bold text-base sm:text-lg text-slate-900 focus:outline-none cursor-pointer"
                >
                  <span className={isOpen ? 'text-rose-600' : 'text-slate-800'}>
                    {faq.question}
                  </span>
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-transform duration-200 ${
                      isOpen
                        ? 'bg-rose-100 text-rose-600 rotate-180'
                        : 'bg-slate-100 text-slate-500'
                    }`}
                  >
                    <ChevronDown className="w-4 h-4" />
                  </div>
                </button>

                {isOpen && (
                  <div className="px-6 pb-6 pt-1 text-sm sm:text-base text-slate-600 leading-relaxed animate-in fade-in-50 duration-200">
                    <p>{faq.answer}</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* WhatsApp Objection Killer Callout */}
        <div className="mt-12 p-6 rounded-3xl bg-slate-50 border border-slate-200/80 flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
              <MessageCircle className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-900">Ainda tem alguma dúvida específica?</p>
              <p className="text-xs text-slate-500">Nossa equipe comercial está pronta para atender você via WhatsApp.</p>
            </div>
          </div>
          <Link
            href="/login"
            className="shrink-0 px-5 py-2.5 rounded-xl text-xs font-bold text-slate-800 bg-white hover:bg-slate-100 border border-slate-200 shadow-xs transition-colors"
          >
            Falar com consultor
          </Link>
        </div>

      </div>
    </section>
  );
}
