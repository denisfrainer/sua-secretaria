'use client';

import React, { useState, useEffect, useRef } from 'react';
import { 
  format, 
  addDays, 
  startOfDay, 
  isSameDay,
  isAfter,
  parseISO
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { 
  Check, 
  Loader2, 
  Calendar as CalendarIcon, 
  Clock, 
  User, 
  MessageSquare,
  ArrowRight,
  CalendarOff,
  Scissors,
  Shield
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';

interface SchedulingInterfaceProps {
  profile: any;
  businessConfig?: any;
}

type Step = 'services' | 'select' | 'form' | 'success';

export default function SchedulingInterface({ profile, businessConfig }: SchedulingInterfaceProps) {
  // --- State ---
  const [selectedDate, setSelectedDate] = useState<Date>(startOfDay(new Date()));
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [selectedService, setSelectedService] = useState<any>(null);
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [step, setStep] = useState<Step>('services');
  const [isBooking, setIsBooking] = useState(false);
  
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
  });

  const scrollRef = useRef<HTMLDivElement>(null);

  // --- Date Generation ---
  const dates = Array.from({ length: 30 }).map((_, i) => addDays(startOfDay(new Date()), i));

  // --- Logic: Fetch Availability ---
  useEffect(() => {
    if (step !== 'select') return;

    async function fetchAvailability() {
      const formattedDate = format(selectedDate, 'yyyy-MM-dd');
      setLoadingSlots(true);
      setSelectedSlot(null);
      
      try {
        const response = await fetch(`/api/calendar/availability?profileId=${profile.id}&date=${formattedDate}`);
        const data = await response.json();
        setAvailableSlots(data.availableSlots || []);
      } catch (error) {
        console.error('[UI_SCHEDULING] Fetch error:', error);
        setAvailableSlots([]);
      } finally {
        setLoadingSlots(false);
      }
    }

    fetchAvailability();
  }, [selectedDate, profile.id, step]);

  // --- Logic: Submit Booking ---
  const handleBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDate || !selectedSlot) return;

    const payload = {
      profileId: profile.id,
      date: format(selectedDate, 'yyyy-MM-dd'),
      time: selectedSlot,
      clientName: formData.name,
      clientPhone: formData.phone,
      serviceType: selectedService?.name
    };

    setIsBooking(true);

    try {
      const response = await fetch('/api/calendar/book', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) throw new Error('Falha no agendamento');
      setStep('success');
    } catch (error) {
      console.error('[UI_SCHEDULING] Booking error:', error);
      alert('Erro ao realizar agendamento. Tente novamente.');
    } finally {
      setIsBooking(false);
    }
  };

  // --- UI Components ---

  const renderProfileHeader = () => {
    const businessInfo = businessConfig?.context_json?.business_info;
    const businessName = businessInfo?.name || profile.display_name || profile.full_name;
    const logoUrl = businessInfo?.logo_url;

    return (
      <div className="flex flex-col mb-8">
        <div className="flex items-center gap-4">
          <div className="w-24 h-24 rounded-full bg-white border border-gray-100 shadow-sm flex items-center justify-center overflow-hidden relative">
            {logoUrl ? (
              <Image 
                src={logoUrl} 
                alt={businessName} 
                fill 
                className="object-cover"
              />
            ) : (
              <User size={32} className="text-gray-300" />
            )}
          </div>
          <div className="flex flex-col">
            <h1 className="text-xl font-bold text-gray-900 leading-tight">
              {businessName}
            </h1>
            <p className="text-sm text-gray-500 leading-tight mt-0.5">
              {businessInfo?.description || 'Profissional qualificado'}
            </p>
            <div className="inline-flex items-center gap-1 bg-green-100 text-green-700 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full mt-1.5 w-fit">
              <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
              Online para Agendamento
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderServiceSelection = () => {
    const services = businessConfig?.context_json?.services || [
      { id: '1', name: 'Atendimento Geral', duration: 30, price: 0, description: 'Agende seu horário para um atendimento personalizado.' }
    ];

    return (
      <div className="w-full animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="mb-4">
          <h2 className="text-lg font-bold text-gray-900">Selecione um serviço</h2>
          <p className="text-sm text-gray-500">Escolha a melhor opção para você</p>
        </div>

        <div className="flex flex-col gap-3">
          {services.map((service: any) => (
            <div key={service.id} className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex flex-col gap-4">
              <div className="flex gap-4">
                <div className="w-16 h-16 rounded-xl bg-purple-50 flex items-center justify-center text-purple-600 shrink-0 overflow-hidden relative border border-purple-100">
                  {service.image_url ? (
                    <Image 
                      src={service.image_url} 
                      alt={service.name} 
                      fill 
                      className="object-cover"
                    />
                  ) : (
                    <Scissors size={28} />
                  )}
                </div>
                <div className="flex flex-col flex-1">
                  <h3 className="text-base font-bold text-gray-900">{service.name}</h3>
                  <p className="text-xs text-gray-500 leading-snug line-clamp-2 mt-0.5">
                    {service.description || 'Nenhuma descrição fornecida.'}
                  </p>
                  <div className="flex items-center gap-2 text-xs font-semibold text-gray-700 mt-2">
                    <Clock size={12} />
                    {service.duration} min
                    <span className="text-gray-300">•</span>
                    <span className="text-purple-600">
                      {service.price > 0 ? `R$ ${service.price}` : 'Consultar valor'}
                    </span>
                  </div>
                </div>
              </div>
              <button
                onClick={() => {
                  setSelectedService(service);
                  setStep('select');
                }}
                className="w-full h-11 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-sm font-bold transition-all active:scale-[0.98]"
              >
                Escolher horário
              </button>
            </div>
          ))}
        </div>

        {/* Footer Trust Badge */}
        <div className="flex items-center gap-3 p-4 mt-8 bg-purple-50/50 rounded-2xl border border-purple-100/50">
          <Shield size={24} className="text-purple-600" />
          <div className="flex flex-col">
            <span className="text-sm font-bold text-purple-900 uppercase tracking-tight">Agendamento Seguro</span>
            <span className="text-[10px] font-bold text-purple-700/70 uppercase tracking-widest">Sua reserva está garantida</span>
          </div>
        </div>
      </div>
    );
  };
  
  const renderDateSelector = () => (
    <div className="w-full mb-8">
      <div className="flex items-center justify-between mb-4">
        <div className="flex flex-col">
          <h2 className="text-lg font-bold text-gray-900">Data do Atendimento</h2>
          <p className="text-sm text-gray-500">{format(selectedDate, "MMMM 'de' yyyy", { locale: ptBR })}</p>
        </div>
      </div>
      
      <div 
        ref={scrollRef}
        className="flex gap-3 overflow-x-auto pb-4 no-scrollbar scroll-smooth snap-x"
      >
        {dates.map((date) => {
          const isSelected = isSameDay(date, selectedDate);
          return (
            <button
              key={date.toISOString()}
              onClick={() => setSelectedDate(date)}
              className={`
                flex-shrink-0 w-16 h-20 flex flex-col items-center justify-center rounded-2xl border-2 transition-all snap-center
                ${isSelected 
                  ? 'bg-purple-600 border-purple-600 text-white shadow-md' 
                  : 'bg-white border-gray-100 text-gray-500 hover:border-gray-200'
                }
              `}
            >
              <span className="text-[10px] font-bold uppercase tracking-widest mb-1 opacity-70">
                {format(date, 'eee', { locale: ptBR })}
              </span>
              <span className="text-xl font-bold">
                {format(date, 'd')}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );

  const renderSlotList = () => (
    <div className="w-full flex-1 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold uppercase tracking-widest text-gray-400">
          Horários disponíveis
        </h3>
      </div>
      
      {loadingSlots ? (
        <div className="grid grid-cols-3 gap-3">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="h-12 bg-white border border-gray-100 animate-pulse rounded-xl" />
          ))}
        </div>
      ) : availableSlots.length > 0 ? (
        <div className="grid grid-cols-3 gap-3">
          {availableSlots.map((slot) => {
            const isSelected = selectedSlot === slot;
            return (
              <button
                key={slot}
                onClick={() => setSelectedSlot(slot)}
                className={`
                  h-12 flex items-center justify-center rounded-xl border font-bold text-sm transition-all
                  ${isSelected 
                    ? 'bg-purple-600 border-purple-600 text-white shadow-sm' 
                    : 'bg-white border-gray-100 text-gray-700 hover:border-gray-200'
                  }
                `}
              >
                {slot}
              </button>
            );
          })}
        </div>
      ) : (
        <div className="w-full py-12 flex flex-col items-center justify-center bg-white border border-dashed border-gray-200 rounded-2xl text-center px-4">
          <CalendarOff size={32} className="text-gray-300 mb-3" />
          <p className="text-sm font-bold text-gray-600">Infelizmente a agenda está lotada hoje.</p>
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">Selecione outra data acima</p>
        </div>
      )}

      <div className="flex flex-col gap-3 mt-6">
        <button
          onClick={() => setStep('form')}
          disabled={!selectedSlot}
          className="w-full h-14 bg-purple-600 text-white rounded-xl font-bold text-base flex items-center justify-center gap-2 active:scale-[0.98] transition-all disabled:opacity-50 disabled:grayscale"
        >
          Próximo passo
          <ArrowRight size={20} />
        </button>
        <button
          onClick={() => setStep('services')}
          className="w-full h-10 text-gray-400 font-bold text-xs uppercase tracking-widest hover:text-gray-600 transition-colors"
        >
          Voltar para serviços
        </button>
      </div>
    </div>
  );

  const renderForm = () => (
    <div className="w-full animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="mb-8">
        <h2 className="text-xl font-bold text-gray-900 tracking-tight">Finalizar Reserva</h2>
        <div className="flex flex-col gap-1 mt-2 p-4 bg-purple-50 rounded-xl border border-purple-100">
           <span className="text-xs font-bold text-purple-700 uppercase tracking-widest">{selectedService?.name}</span>
           <span className="text-sm font-bold text-purple-900">
             {format(selectedDate, "EEEE, d 'de' MMMM", { locale: ptBR })} às {selectedSlot}
           </span>
        </div>
      </div>

      <form onSubmit={handleBooking} className="flex flex-col gap-5">
        <div className="space-y-1.5">
          <label className="text-xs font-bold uppercase tracking-wider text-gray-500 pl-1">Seu Nome Completo</label>
          <input 
            required
            type="text"
            value={formData.name}
            onChange={(e) => setFormData({...formData, name: e.target.value})}
            className="w-full h-12 px-4 bg-white border border-gray-200 rounded-xl focus:border-purple-500 focus:ring-2 focus:ring-purple-50 transition-all outline-none text-sm font-semibold shadow-sm"
            placeholder="Como podemos te chamar?"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-bold uppercase tracking-wider text-gray-500 pl-1">Seu WhatsApp</label>
          <input 
            required
            type="tel"
            value={formData.phone}
            onChange={(e) => setFormData({...formData, phone: e.target.value})}
            className="w-full h-12 px-4 bg-white border border-gray-200 rounded-xl focus:border-purple-500 focus:ring-2 focus:ring-purple-50 transition-all outline-none text-sm font-semibold shadow-sm"
            placeholder="(00) 00000-0000"
          />
        </div>

        <div className="pt-4 flex flex-col gap-3">
          <button
            type="submit"
            disabled={isBooking}
            className="w-full h-14 bg-purple-600 text-white rounded-xl font-bold text-base flex items-center justify-center gap-3 active:scale-[0.98] transition-all disabled:opacity-50"
          >
            {isBooking ? <Loader2 className="animate-spin" /> : 'Confirmar Reserva'}
          </button>
          
          <button
            type="button"
            onClick={() => setStep('select')}
            className="w-full h-10 text-gray-400 font-bold text-xs uppercase tracking-widest hover:text-gray-600 transition-colors"
          >
            Voltar
          </button>
        </div>
      </form>
    </div>
  );

  const renderSuccess = () => (
    <div className="w-full py-8 flex flex-col items-center text-center animate-in zoom-in duration-500">
      <div className="w-20 h-20 bg-green-500 text-white rounded-full flex items-center justify-center mb-6 shadow-xl shadow-green-200">
        <Check size={40} strokeWidth={3} />
      </div>
      <h2 className="text-2xl font-bold text-gray-900 tracking-tight mb-2">Reserva Confirmada!</h2>
      <p className="text-gray-500 text-sm font-medium mb-10 max-w-[280px] mx-auto">
        Tudo certo! Você receberá os detalhes e o lembrete direto no seu WhatsApp.
      </p>
      
      <div className="w-full p-6 bg-white border border-gray-100 rounded-2xl shadow-sm mb-10 text-left">
        <div className="flex flex-col gap-3">
          <div className="flex flex-col">
            <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Serviço</span>
            <span className="text-sm font-bold text-gray-900 uppercase">{selectedService?.name}</span>
          </div>
          <div className="w-full h-px bg-gray-50" />
          <div className="flex flex-col">
            <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Horário</span>
            <span className="text-sm font-bold text-gray-900">
              {format(selectedDate, "EEEE, d 'de' MMMM", { locale: ptBR })} às {selectedSlot}
            </span>
          </div>
        </div>
      </div>

      <button
        onClick={() => {
          setStep('services');
          setSelectedSlot(null);
          setSelectedService(null);
        }}
        className="w-full h-14 border border-gray-200 rounded-xl font-bold text-sm text-gray-700 hover:bg-gray-50 transition-all active:scale-[0.98]"
      >
        Fazer outra reserva
      </button>
    </div>
  );

  return (
    <div className="w-full max-w-md mx-auto min-h-screen bg-[#f8f9fa] p-5 font-sans flex flex-col">
      {renderProfileHeader()}

      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.3 }}
          className="flex-1 flex flex-col"
        >
          {step === 'services' && renderServiceSelection()}
          {step === 'select' && (
            <div className="flex-1 flex flex-col animate-in fade-in slide-in-from-bottom-4 duration-500">
              {renderDateSelector()}
              {renderSlotList()}
            </div>
          )}
          {step === 'form' && renderForm()}
          {step === 'success' && renderSuccess()}
        </motion.div>
      </AnimatePresence>

      {/* App-like Branding */}
      <div className="mt-12 flex flex-col items-center gap-2 opacity-30 pb-4">
         <span className="text-[9px] font-bold uppercase tracking-[0.3em] text-gray-500">Desenvolvido por Sua SecretarIA</span>
      </div>

      <style jsx global>{`
        .no-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .no-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </div>
  );
}
