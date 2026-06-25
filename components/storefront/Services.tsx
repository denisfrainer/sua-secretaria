'use client';

import React, { useEffect, useState } from 'react';
import { Clock, DollarSign, MessageCircle, Sparkles } from 'lucide-react';
import { useWhatsAppRedirect } from './WhatsAppRedirect';

export interface ServiceItem {
  id: string;
  name: string;
  description: string;
  price: number;
  duration: number; // in minutes
  category?: 'Alongamento' | 'Tratamento' | 'Clássico' | 'Nail Art';
}

interface ServicesProps {
  services?: ServiceItem[];
  phone: string;
  professionalName: string;
}

const DEFAULT_SERVICES: ServiceItem[] = [
  {
    id: '1',
    name: 'Alongamento em Gel Premium',
    description: 'Extensão de unhas esculpidas em gel com acabamento extrafino, natural, resistente e durável. Ideal para quem busca comprimento e perfeição.',
    price: 150.00,
    duration: 120,
    category: 'Alongamento'
  },
  {
    id: '2',
    name: 'Blindagem de Unhas Naturais',
    description: 'Camada de gel protetora que blinda as suas unhas contra quebras e descamações, fazendo com que o esmalte dure intacto por até 25 dias.',
    price: 85.00,
    duration: 60,
    category: 'Tratamento'
  },
  {
    id: '3',
    name: 'Esmaltação em Gel (Mão)',
    description: 'Esmaltação moderna com cura em cabine LED. Brilho espelhado instantâneo que não lasca e seca imediatamente.',
    price: 60.00,
    duration: 45,
    category: 'Clássico'
  },
  {
    id: '4',
    name: 'Manicure & Pedicure Completa',
    description: 'Tratamento clássico com cuticulagem detalhada, esfoliação relaxante, hidratação profunda e esmaltação convencional de alta cobertura.',
    price: 80.00,
    duration: 90,
    category: 'Clássico'
  },
  {
    id: '5',
    name: 'Nail Art Personalizada (por unha)',
    description: 'Trabalho artístico manual: francesinha reversa, encapsuladas, detalhes geométricos, foil, glitter ou desenhos minimalistas únicos.',
    price: 15.00,
    duration: 15,
    category: 'Nail Art'
  },
  {
    id: '6',
    name: 'Manutenção de Alongamento',
    description: 'Reposição do gel estrutural e ajuste do ponto de tensão, recomendada a cada 21-28 dias para garantir a saúde das unhas naturais.',
    price: 110.00,
    duration: 90,
    category: 'Alongamento'
  }
];

export function Services({ services = DEFAULT_SERVICES, phone, professionalName }: ServicesProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>('Todos');
  const redirectToWhatsApp = useWhatsAppRedirect({ componentName: 'Services' });

  useEffect(() => {
    console.log('[STOREFRONT_MOUNT] Services mounted', {
      professionalName,
      phone,
      servicesCount: services.length
    });
  }, [professionalName, phone, services.length]);

  // Extract categories
  const categories = ['Todos', ...Array.from(new Set(services.map(s => s.category).filter(Boolean)))];

  const filteredServices = selectedCategory === 'Todos'
    ? services
    : services.filter(s => s.category === selectedCategory);

  const handleBookService = (service: ServiceItem) => {
    const text = `Olá ${professionalName}, tudo bem? Acessei seu portfólio online e gostaria de agendar um horário para o serviço: *${service.name}* (R$ ${service.price.toFixed(2)}). Qual o próximo horário disponível?`;
    redirectToWhatsApp(phone, text, service.name);
  };

  return (
    <section className="mx-auto max-w-4xl px-4 sm:px-6 py-12" id="servicos">
      <div className="flex flex-col items-center text-center mb-10">
        <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-50 border border-amber-200 text-amber-700 text-xs font-black uppercase tracking-widest mb-4">
          <Sparkles size={12} className="stroke-[2.5]" />
          <span>Menu de Especialidades</span>
        </div>
        <h2 className="text-3xl font-black text-slate-900 tracking-tight">Nossos Serviços</h2>
        <p className="text-slate-500 font-medium mt-2 max-w-lg">
          Trabalhos minuciosos desenvolvidos com produtos de alta performance para a máxima saúde das suas unhas.
        </p>
      </div>

      {/* Category Tabs */}
      <div className="flex items-center justify-start sm:justify-center gap-2 overflow-x-auto pb-4 mb-8 no-scrollbar scroll-smooth">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat!)}
            className={`px-5 py-2 rounded-full text-sm font-black whitespace-nowrap transition-all border cursor-pointer ${
              selectedCategory === cat
                ? 'bg-rose-600 text-white border-rose-600 shadow-md shadow-rose-200'
                : 'bg-white text-slate-600 border-slate-200/80 hover:bg-slate-50/60'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Services Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {filteredServices.map((service) => (
          <div
            key={service.id}
            className="flex flex-col justify-between p-6 bg-white rounded-3xl border border-rose-100/50 shadow-sm hover:shadow-md hover:border-rose-200/60 transition-all group"
          >
            <div>
              {/* Category Tag */}
              {service.category && (
                <span className="inline-block text-[10px] font-extrabold text-rose-500 bg-rose-50 px-2 py-0.5 rounded-md uppercase tracking-wider mb-3">
                  {service.category}
                </span>
              )}

              <h3 className="text-lg font-extrabold text-slate-800 tracking-tight group-hover:text-rose-600 transition-colors">
                {service.name}
              </h3>
              
              <p className="text-sm font-medium text-slate-500 mt-2 line-clamp-3 leading-relaxed">
                {service.description}
              </p>
            </div>

            {/* Price & Booking Bar */}
            <div className="flex items-center justify-between border-t border-slate-100 pt-4 mt-6">
              <div className="flex items-center gap-4">
                <div className="flex flex-col">
                  <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Valor</span>
                  <span className="text-lg font-black text-slate-900">
                    R$ {service.price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                </div>

                <div className="h-8 w-[1px] bg-slate-100" />

                <div className="flex flex-col">
                  <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Tempo</span>
                  <span className="text-sm font-black text-slate-700 flex items-center gap-1">
                    <Clock size={13} className="text-slate-400" />
                    {service.duration} min
                  </span>
                </div>
              </div>

              <button
                onClick={() => handleBookService(service)}
                className="flex items-center gap-1.5 px-4 py-2.5 bg-rose-50 hover:bg-rose-100/80 text-rose-600 rounded-xl text-xs font-black transition-all border border-rose-100 hover:scale-[1.03] active:scale-[0.97] cursor-pointer"
              >
                <MessageCircle size={14} className="stroke-[2.5]" />
                Reservar
              </button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
