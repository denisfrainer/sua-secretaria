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
  ArrowRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface SchedulingInterfaceProps {
  profile: any;
  businessConfig?: any;
}

type Step = 'select' | 'form' | 'success';

export default function SchedulingInterface({ profile, businessConfig }: SchedulingInterfaceProps) {
  // --- State ---
  const [selectedDate, setSelectedDate] = useState<Date>(startOfDay(new Date()));
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [step, setStep] = useState<Step>('select');
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
    async function fetchAvailability() {
      const formattedDate = format(selectedDate, 'yyyy-MM-dd');
      console.log(`[UI_SCHEDULING] Fetching slots for date: ${formattedDate}`);
      
      setLoadingSlots(true);
      setSelectedSlot(null); // Reset slot when date changes
      
      try {
        const response = await fetch(`/api/calendar/availability?profileId=${profile.id}&date=${formattedDate}`);
        const data = await response.json();
        
        const slots = data.availableSlots || [];
        console.log(`[UI_SCHEDULING] API returned ${slots.length} slots.`);
        setAvailableSlots(slots);
      } catch (error) {
        console.error('[UI_SCHEDULING] Fetch error:', error);
        setAvailableSlots([]);
      } finally {
        setLoadingSlots(false);
      }
    }

    fetchAvailability();
  }, [selectedDate, profile.id]);

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
    };

    console.log('[UI_SCHEDULING] Executing booking payload:', payload);
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
  
  const renderDateSelector = () => (
    <div className="w-full mb-10">
      <div className="flex items-center justify-between mb-4 px-2">
        <h2 className="text-sm font-black uppercase tracking-widest text-gray-400">
          {format(selectedDate, 'MMMM yyyy', { locale: ptBR })}
        </h2>
      </div>
      
      <div 
        ref={scrollRef}
        className="flex gap-3 overflow-x-auto pb-4 no-scrollbar scroll-smooth snap-x"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
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
                  ? 'bg-black border-black text-white shadow-lg' 
                  : 'bg-white border-gray-100 text-gray-500 hover:border-gray-300'
                }
              `}
            >
              <span className="text-[10px] font-black uppercase tracking-tighter mb-1 opacity-70">
                {format(date, 'eee', { locale: ptBR })}
              </span>
              <span className="text-xl font-black">
                {format(date, 'd')}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );

  const renderSlotList = () => (
    <div className="w-full flex-1 flex flex-col gap-3">
      <h3 className="text-sm font-black uppercase tracking-widest text-gray-400 mb-2 px-2">
        Horários Disponíveis
      </h3>
      
      {loadingSlots ? (
        <div className="flex flex-col gap-3">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-14 w-full bg-gray-50 animate-pulse rounded-xl" />
          ))}
        </div>
      ) : availableSlots.length > 0 ? (
        <div className="flex flex-col gap-3">
          {availableSlots.map((slot) => {
            const isSelected = selectedSlot === slot;
            return (
              <button
                key={slot}
                onClick={() => setSelectedSlot(slot)}
                className={`
                  w-full h-14 px-6 flex items-center justify-between rounded-xl border-2 transition-all
                  ${isSelected 
                    ? 'bg-gray-100 border-black text-black' 
                    : 'bg-white border-gray-100 text-gray-700 hover:border-gray-200'
                  }
                `}
              >
                <span className="text-base font-black">{slot}</span>
                {isSelected && <Check size={20} className="text-black" />}
              </button>
            );
          })}
        </div>
      ) : (
        <div className="w-full py-12 flex flex-col items-center justify-center border-2 border-dashed border-gray-100 rounded-3xl">
          <Clock size={24} className="text-gray-300 mb-2" />
          <p className="text-sm font-bold text-gray-300 uppercase tracking-widest">Sem horários para hoje</p>
        </div>
      )}
    </div>
  );

  const renderForm = () => (
    <div className="w-full animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="mb-8">
        <h2 className="text-2xl font-black text-gray-900 tracking-tight">Finalizar Agendamento</h2>
        <p className="text-sm font-medium text-gray-500 mt-1">
          {format(selectedDate, "EEEE, d 'de' MMMM", { locale: ptBR })} às {selectedSlot}
        </p>
      </div>

      <form onSubmit={handleBooking} className="flex flex-col gap-6">
        <div className="space-y-2">
          <label className="text-[11px] font-black uppercase tracking-widest text-gray-400 px-1">Seu Nome</label>
          <input 
            required
            type="text"
            value={formData.name}
            onChange={(e) => setFormData({...formData, name: e.target.value})}
            className="w-full h-14 px-5 bg-white border-2 border-gray-100 rounded-xl focus:border-black transition-all outline-none text-base font-bold shadow-sm"
            placeholder="Ex: João Silva"
          />
        </div>

        <div className="space-y-2">
          <label className="text-[11px] font-black uppercase tracking-widest text-gray-400 px-1">Seu WhatsApp</label>
          <input 
            required
            type="tel"
            value={formData.phone}
            onChange={(e) => setFormData({...formData, phone: e.target.value})}
            className="w-full h-14 px-5 bg-white border-2 border-gray-100 rounded-xl focus:border-black transition-all outline-none text-base font-bold shadow-sm"
            placeholder="(00) 00000-0000"
          />
        </div>

        <div className="pt-4 flex flex-col gap-3">
          <button
            type="submit"
            disabled={isBooking}
            className="w-full h-16 bg-black text-white rounded-2xl font-black text-base uppercase tracking-widest flex items-center justify-center gap-3 active:scale-[0.98] transition-all disabled:opacity-50"
          >
            {isBooking ? <Loader2 className="animate-spin" /> : 'Confirmar Agendamento'}
          </button>
          
          <button
            type="button"
            onClick={() => setStep('select')}
            className="w-full h-12 text-gray-400 font-bold text-sm uppercase tracking-widest hover:text-black transition-colors"
          >
            Voltar
          </button>
        </div>
      </form>
    </div>
  );

  const renderSuccess = () => (
    <div className="w-full py-12 flex flex-col items-center text-center animate-in zoom-in duration-500">
      <div className="w-20 h-20 bg-black text-white rounded-full flex items-center justify-center mb-6 shadow-xl leading-none">
        <Check size={40} strokeWidth={3} />
      </div>
      <h2 className="text-2xl font-black text-gray-900 tracking-tight mb-2">Agendamento Realizado!</h2>
      <p className="text-gray-500 font-medium mb-10">Tudo pronto. Enviamos os detalhes para o seu WhatsApp.</p>
      
      <div className="w-full p-6 border-2 border-gray-100 rounded-3xl mb-8">
        <div className="flex flex-col gap-1">
          <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">Data e Hora</span>
          <span className="text-base font-black text-gray-900">
            {format(selectedDate, "EEEE, d 'de' MMMM", { locale: ptBR })} às {selectedSlot}
          </span>
        </div>
      </div>

      <button
        onClick={() => {
          setStep('select');
          setSelectedSlot(null);
        }}
        className="px-8 py-4 border-2 border-black rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-black hover:text-white transition-all"
      >
        Novo Agendamento
      </button>
    </div>
  );

  // --- Main Layout ---
  return (
    <div className="w-full max-w-xl mx-auto py-8">
      {/* Wireframe Container */}
      <div className="bg-white border-2 border-black rounded-[2.5rem] p-8 md:p-12 shadow-[12px_12px_0px_0px_rgba(0,0,0,0.03)]">
        
        {/* Header: Professional Info */}
        {step !== 'success' && (
          <div className="flex flex-col items-start mb-12">
            <h1 className="text-3xl font-black tracking-tight text-gray-900 leading-none mb-2">
              {profile.display_name || profile.full_name}
            </h1>
            <p className="text-sm font-bold text-gray-400 uppercase tracking-[0.2em]">Agende seu Atendimento</p>
          </div>
        )}

        <AnimatePresence mode="wait">
          {step === 'select' && (
            <motion.div 
              key="select"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              className="flex flex-col h-full"
            >
              {renderDateSelector()}
              {renderSlotList()}
              
              {selectedSlot && (
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-10"
                >
                  <button
                    onClick={() => setStep('form')}
                    className="w-full h-16 bg-black text-white rounded-2xl font-black text-base uppercase tracking-widest flex items-center justify-center gap-3 shadow-lg active:scale-[0.98] transition-all"
                  >
                    Continuar
                    <ArrowRight size={20} />
                  </button>
                </motion.div>
              )}
            </motion.div>
          )}

          {step === 'form' && (
            <motion.div 
              key="form"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
            >
              {renderForm()}
            </motion.div>
          )}

          {step === 'success' && (
            <motion.div 
              key="success"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
            >
              {renderSuccess()}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Footer Branding (Subtle Wireframe) */}
      <div className="mt-10 flex flex-col items-center gap-2 opacity-20">
         <div className="w-12 h-px bg-black" />
         <span className="text-[10px] font-black uppercase tracking-widest text-black">Sua SecretarIA</span>
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
