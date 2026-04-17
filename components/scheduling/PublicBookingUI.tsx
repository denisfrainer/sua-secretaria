'use client';

import React, { useState } from 'react';
import { 
  Calendar, 
  Clock, 
  ChevronDown, 
  ChevronRight,
  ChevronLeft,
  Share2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';

interface Service {
  id: string;
  name: string;
  description: string;
  duration: number;
  price: number;
  imageUrl?: string;
}

interface Category {
  id: string;
  name: string;
  services: Service[];
}

interface PublicBookingUIProps {
  profile: any;
  businessConfig?: any;
}

const PRIMARY_COLOR = '#ef7076'; // Coral from reference

export default function PublicBookingUI({ profile, businessConfig }: PublicBookingUIProps) {
  const [expandedCategories, setExpandedCategories] = useState<string[]>(['alongamentos']);
  
  // Mock Data to match reference exactly
  const categories: Category[] = [
    {
      id: 'alongamentos',
      name: 'Alongamentos',
      services: [
        {
          id: 'fiber-glass',
          name: 'Alongamento em Fibra de Vidro',
          description: 'Estrutura resistente, aparência natural, ideal pra quem quer durabilidade.',
          duration: 120,
          price: 290,
          imageUrl: 'https://images.unsplash.com/photo-1632345031435-072796ac9691?q=80&w=200&auto=format&fit=crop'
        },
        {
          id: 'soft-gel',
          name: 'Alongamento Soft Gel (Tips)',
          description: 'Alongamento com tips full cover + gel: rápido, leve e com ótimo acabamento.',
          duration: 120,
          price: 240,
          imageUrl: 'https://images.unsplash.com/photo-1604654894611-6973b376cbde?q=80&w=200&auto=format&fit=crop'
        }
      ]
    }
  ];

  const businessName = profile.display_name || profile.full_name || 'Demonstração Nail Designer';
  const logoUrl = profile.avatar_url || '/assets/whatsapp.svg'; // Fallback

  const toggleCategory = (id: string) => {
    setExpandedCategories(prev => {
      const isExpanded = prev.includes(id);
      console.log(`[BOOKING_UI] ${isExpanded ? 'Collapsing' : 'Expanding'} category: ${id}`);
      return isExpanded ? prev.filter(c => c !== id) : [...prev, id];
    });
  };

  const handleBookingClick = (service: Service) => {
    console.log(`[BOOKING_UI] User clicked "Agendar" for service:`, {
      id: service.id,
      name: service.name,
      price: service.price
    });
    // In a real flow, this would navigate to the calendar step
    alert(`Agendamento iniciado para: ${service.name}`);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans antialiased">
      
      {/* 1. HEADER SECTION */}
      <div className="relative w-full h-48 bg-gradient-to-br from-rose-100 to-rose-200 overflow-hidden">
        {/* Decorative elements or background image */}
        <div className="absolute inset-0 opacity-20 pointer-events-none">
          <Image 
            src="https://images.unsplash.com/photo-1519014816548-bf5fe059798b?q=80&w=1200" 
            alt="Hero Background" 
            fill 
            className="object-cover"
          />
        </div>
      </div>

      {/* 2. HERO CARD CONTAINER */}
      <div className="max-w-md mx-auto w-full px-5 -mt-16 z-10 flex flex-col items-center">
        
        {/* LOGO BOX - Overlapping */}
        <div className="relative w-28 h-28 rounded-full bg-white shadow-xl flex items-center justify-center p-1 border-4 border-white overflow-hidden">
           {profile.avatar_url ? (
             <Image src={profile.avatar_url} alt="Logo" fill className="object-cover" />
           ) : (
             <div className="text-4xl">💅</div>
           )}
        </div>

        {/* MAIN ID CARD */}
        <div className="w-full bg-white rounded-[2.5rem] shadow-2xl shadow-slate-200/60 mt-[-56px] pt-20 pb-10 px-8 flex flex-col items-center text-center gap-6">
          <div className="flex flex-col gap-2">
            <h1 className="text-[28px] font-black tracking-tight text-slate-900 leading-tight">
              {businessName}
            </h1>
            <p className="text-lg font-medium text-slate-500">
              Agende seu horário
            </p>
          </div>

          <button 
            style={{ backgroundColor: PRIMARY_COLOR }}
            className="w-full max-w-[240px] h-14 rounded-2xl flex items-center justify-center gap-3 text-white font-black text-base shadow-lg shadow-rose-200 hover:brightness-105 active:scale-95 transition-all"
          >
            <Calendar size={20} />
            Agendar Agora
          </button>
        </div>

        {/* 3. SERVICES SECTION */}
        <div className="w-full mt-12 mb-20 flex flex-col gap-8">
          <h2 className="text-2xl font-black text-slate-900 text-center tracking-tight">
            Serviços
          </h2>

          <div className="flex flex-col gap-4">
            {categories.map((category) => (
              <div key={category.id} className="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden transition-all">
                {/* Accordion Trigger */}
                <button 
                  onClick={() => toggleCategory(category.id)}
                  className="w-full flex items-center justify-between px-8 py-6 text-left hover:bg-slate-50 transition-colors"
                >
                  <span className="text-lg font-black text-slate-900 tracking-tight">
                    {category.name}
                  </span>
                  <motion.div
                    animate={{ rotate: expandedCategories.includes(category.id) ? 180 : 0 }}
                    transition={{ type: "spring", stiffness: 300, damping: 20 }}
                  >
                    <ChevronDown size={22} className="text-slate-400" />
                  </motion.div>
                </button>

                {/* Accordion Content */}
                <AnimatePresence initial={false}>
                  {expandedCategories.includes(category.id) && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3, ease: "easeInOut" }}
                    >
                      <div className="px-5 pb-8 flex flex-col">
                        {category.services.map((service, idx) => (
                          <div 
                            key={service.id} 
                            className={`flex flex-col gap-4 pt-6 ${idx !== 0 ? 'border-t border-slate-50 mt-6' : ''}`}
                          >
                            <div className="flex gap-4 items-start px-2">
                              {/* Thumbnail */}
                              <div className="relative w-16 h-16 rounded-full overflow-hidden shrink-0 shadow-inner bg-slate-100">
                                {service.imageUrl && (
                                  <Image src={service.imageUrl} alt={service.name} fill className="object-cover" />
                                )}
                              </div>
                              
                              {/* Info */}
                              <div className="flex flex-col gap-1">
                                <h3 className="font-bold text-slate-900 leading-tight">
                                  {service.name}
                                </h3>
                                <p className="text-xs font-medium text-slate-400 line-clamp-2 leading-relaxed">
                                  {service.description}
                                </p>
                                <div className="flex items-center gap-4 mt-1">
                                  <div className="flex items-center gap-1.5 text-slate-400 text-xs font-bold">
                                    <Clock size={14} />
                                    {service.duration} min
                                  </div>
                                  <div className="text-slate-900 text-sm font-black">
                                    R$ {service.price.toFixed(2).replace('.', ',')}
                                  </div>
                                </div>
                              </div>
                            </div>
                            
                            {/* Inner CTA */}
                            <button 
                              onClick={() => handleBookingClick(service)}
                              style={{ backgroundColor: PRIMARY_COLOR }}
                              className="w-full h-12 rounded-xl text-white font-bold text-sm hover:brightness-105 active:scale-95 transition-all shadow-sm opacity-90"
                            >
                              Agendar
                            </button>
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* Footer Branding */}
      <div className="w-full py-12 flex flex-col items-center gap-3 opacity-30 mt-auto">
        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
          Desenvolvido por Sua SecretarIA
        </p>
      </div>

    </div>
  );
}
