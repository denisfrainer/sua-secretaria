'use client';

import { useState } from 'react';
import { 
  Calendar as CalendarIcon, 
  Clock, 
  CreditCard, 
  ChevronLeft, 
  ChevronRight,
  User,
  MessageCircle,
  CheckCircle2,
  ArrowRight
} from 'lucide-react';
import { 
  format, 
  addMonths, 
  subMonths, 
  startOfMonth, 
  endOfMonth, 
  startOfWeek, 
  endOfWeek, 
  isSameMonth, 
  isSameDay, 
  addDays, 
  isBefore, 
  startOfDay 
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { motion, AnimatePresence } from 'framer-motion';

interface SchedulingInterfaceProps {
  profile: any;
}

type BookingStep = 'calendar' | 'time' | 'form' | 'success';

const MOCK_TIMES = [
  "09:00", "09:45", "10:30", "11:15", 
  "14:00", "14:45", "15:30", "16:15", "17:00"
];

export default function SchedulingInterface({ profile }: SchedulingInterfaceProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [step, setStep] = useState<BookingStep>('calendar');
  
  const [formData, setFormData] = useState({
    name: '',
    phone: ''
  });

  const businessName = profile.business_name || profile.full_name || 'Nossa Empresa';

  // Calendar Helpers
  const renderHeader = () => {
    return (
      <div className="flex items-center justify-between px-2 mb-6">
        <h2 className="text-lg font-bold text-gray-900 capitalize">
          {format(currentMonth, 'MMMM yyyy', { locale: ptBR })}
        </h2>
        <div className="flex gap-1">
          <button 
            onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <ChevronLeft size={20} className="text-gray-600" />
          </button>
          <button 
            onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <ChevronRight size={20} className="text-gray-600" />
          </button>
        </div>
      </div>
    );
  };

  const renderDays = () => {
    const days = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
    return (
      <div className="grid grid-cols-7 mb-2">
        {days.map((day, i) => (
          <div key={i} className="text-center text-[10px] font-black uppercase tracking-widest text-gray-400">
            {day}
          </div>
        ))}
      </div>
    );
  };

  const renderCells = () => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart);
    const endDate = endOfWeek(monthEnd);
    const calendarRows = [];
    let days = [];
    let day = startDate;
    let formattedDate = "";

    const today = startOfDay(new Date());

    while (day <= endDate) {
      for (let i = 0; i < 7; i++) {
        formattedDate = format(day, "d");
        const cloneDay = day;
        const isDisabled = !isSameMonth(day, monthStart) || isBefore(day, today);
        const isSelected = selectedDate && isSameDay(day, selectedDate);

        days.push(
          <button
            key={day.toString()}
            disabled={isDisabled}
            onClick={() => {
              setSelectedDate(cloneDay);
              setStep('calendar'); // Just ensure we are on calendar step to show times
            }}
            className={`
              relative h-12 flex items-center justify-center text-sm font-semibold transition-all rounded-full
              ${isDisabled ? 'text-gray-200 cursor-default' : 'hover:bg-blue-50 hover:text-blue-600 cursor-pointer'}
              ${isSelected ? 'bg-blue-600 text-white hover:bg-blue-700 hover:text-white shadow-lg shadow-blue-200' : 'text-gray-700'}
            `}
          >
            {formattedDate}
            {isSelected && (
              <motion.div 
                layoutId="activeDay"
                className="absolute inset-0 border-2 border-blue-600 rounded-full"
                transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
              />
            )}
          </button>
        );
        day = addDays(day, 1);
      }
      calendarRows.push(
        <div className="grid grid-cols-7 gap-1" key={day.toString()}>
          {days}
        </div>
      );
      days = [];
    }
    return <div className="flex flex-col gap-1">{calendarRows}</div>;
  };

  const handleBooking = (e: React.FormEvent) => {
    e.preventDefault();
    setStep('success');
  };

  return (
    <div className="max-w-4xl w-full mx-auto animate-in fade-in slide-in-from-bottom-8 duration-1000">
      <div className="bg-white rounded-[2.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.08)] border border-gray-100 overflow-hidden flex flex-col md:flex-row">
        
        {/* Left Column: Business Info */}
        <div className="w-full md:w-[320px] p-8 md:p-10 bg-gray-50/50 border-r border-gray-100">
          <div className="flex flex-col items-center md:items-start text-center md:text-left gap-6">
            {/* Business Logo/Avatar */}
            <div className="w-20 h-20 rounded-[2rem] bg-white shadow-sm border border-gray-100 flex items-center justify-center overflow-hidden shrink-0">
              {profile.avatar_url ? (
                <img src={profile.avatar_url} alt={businessName} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-blue-600 flex items-center justify-center text-white text-2xl font-black">
                  {businessName.charAt(0).toUpperCase()}
                </div>
              )}
            </div>

            {/* Info Block */}
            <div className="flex flex-col gap-2">
              <h1 className="text-xl font-black text-gray-950 tracking-tight leading-tight">
                {businessName}
              </h1>
              <h2 className="text-lg font-bold text-gray-600">
                Consultoria especializada
              </h2>
            </div>

            {/* Details Tags */}
            <div className="flex flex-col gap-3 w-full">
              <div className="flex items-center gap-3 text-gray-500 font-medium text-base">
                <div className="w-8 h-8 rounded-lg bg-white border border-gray-100 flex items-center justify-center text-gray-400">
                  <Clock size={16} />
                </div>
                <span>45 min</span>
              </div>
              <div className="flex items-center gap-3 text-gray-500 font-medium text-base">
                <div className="w-8 h-8 rounded-lg bg-white border border-gray-100 flex items-center justify-center text-gray-400">
                  <CreditCard size={16} />
                </div>
                <span>R$ 150,00</span>
              </div>
            </div>

            {/* Step Indicator (Desktop) */}
            <div className="hidden md:flex flex-col gap-4 mt-8 w-full border-t border-gray-100 pt-8">
              <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Progresso</p>
              <div className="flex flex-col gap-3">
                <div className={`flex items-center gap-3 text-sm font-bold transition-colors ${step === 'calendar' ? 'text-blue-600' : 'text-gray-400'}`}>
                  <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${step === 'calendar' ? 'border-blue-600 bg-blue-50' : 'border-gray-200'}`}>1</div>
                  Data e hora
                </div>
                <div className={`flex items-center gap-3 text-sm font-bold transition-colors ${step === 'form' ? 'text-blue-600' : 'text-gray-400'}`}>
                  <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${step === 'form' ? 'border-blue-600 bg-blue-50' : 'border-gray-200'}`}>2</div>
                  Seus dados
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Interaction Flow */}
        <div className="flex-1 p-8 md:p-10 min-h-[500px] flex flex-col">
          <AnimatePresence mode="wait">
            {step === 'calendar' && (
              <motion.div 
                key="calendar-step"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="flex flex-col h-full"
              >
                <h3 className="text-2xl font-black text-gray-950 tracking-tight mb-8">
                  Selecione o melhor horário
                </h3>

                <div className="flex flex-col lg:flex-row gap-10">
                  {/* Calendar View */}
                  <div className="flex-1 max-w-sm">
                    {renderHeader()}
                    {renderDays()}
                    {renderCells()}
                  </div>

                  {/* Time Slots */}
                  <div className="w-full lg:w-48 flex flex-col animate-in fade-in slide-in-from-right-4 duration-500">
                    {selectedDate ? (
                      <>
                        <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-6">
                          {format(selectedDate, "EEEE, d 'de' MMMM", { locale: ptBR })}
                        </p>
                        <div className="grid grid-cols-2 lg:grid-cols-1 gap-2 max-h-[350px] overflow-y-auto pr-2 custom-scrollbar">
                          {MOCK_TIMES.map((time) => (
                            <button
                              key={time}
                              onClick={() => {
                                setSelectedTime(time);
                                setStep('form');
                              }}
                              className="py-3 px-4 rounded-xl border border-gray-100 font-bold text-gray-700 hover:border-blue-600 hover:bg-blue-50/50 hover:text-blue-600 transition-all text-center"
                            >
                              {time}
                            </button>
                          ))}
                        </div>
                      </>
                    ) : (
                      <div className="flex flex-col items-center justify-center h-full text-center p-8 bg-gray-50 rounded-[2rem] border border-dashed border-gray-200">
                        <CalendarIcon size={24} className="text-gray-300 mb-3" />
                        <p className="text-sm font-bold text-gray-400">
                          Selecione uma data para ver horários
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            )}

            {step === 'form' && (
              <motion.div 
                key="form-step"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="flex flex-col h-full max-w-md mx-auto w-full pt-4"
              >
                <button 
                  onClick={() => setStep('calendar')}
                  className="flex items-center gap-2 text-sm font-bold text-gray-400 hover:text-gray-900 transition-colors mb-8 group"
                >
                  <ChevronLeft size={18} className="group-hover:-translate-x-1 transition-transform" />
                  Voltar para horários
                </button>

                <h3 className="text-2xl font-black text-gray-950 tracking-tight mb-2">
                  Quase lá!
                </h3>
                <p className="text-base text-gray-500 mb-8 font-medium">
                  Confirme seus dados para finalizar o agendamento para <strong>{selectedTime}</strong> no dia <strong>{selectedDate && format(selectedDate, "d 'de' MMMM", { locale: ptBR })}</strong>.
                </p>

                <form onSubmit={handleBooking} className="flex flex-col gap-5">
                  <div className="flex flex-col gap-2">
                    <label className="text-sm font-bold text-gray-900 px-1">Nome completo</label>
                    <input 
                      required
                      type="text"
                      placeholder="Como podemos te chamar?"
                      value={formData.name}
                      onChange={(e) => setFormData({...formData, name: e.target.value})}
                      className="h-14 px-5 rounded-2xl bg-gray-50 border border-transparent focus:bg-white focus:border-blue-600 focus:ring-4 focus:ring-blue-100 transition-all outline-none text-base font-medium placeholder:text-gray-400 shadow-inner"
                    />
                  </div>

                  <div className="flex flex-col gap-2">
                    <label className="text-sm font-bold text-gray-900 px-1">WhatsApp</label>
                    <div className="relative">
                      <input 
                        required
                        type="tel"
                        placeholder="(00) 00000-0000"
                        value={formData.phone}
                        onChange={(e) => setFormData({...formData, phone: e.target.value})}
                        className="h-14 w-full px-5 pl-12 rounded-2xl bg-gray-50 border border-transparent focus:bg-white focus:border-blue-600 focus:ring-4 focus:ring-blue-100 transition-all outline-none text-base font-medium placeholder:text-gray-400 shadow-inner"
                      />
                      <MessageCircle size={20} className="absolute left-4 top-4 text-gray-300" />
                    </div>
                  </div>

                  <button 
                    type="submit"
                    className="mt-4 h-14 bg-blue-600 text-white font-bold text-lg rounded-2xl shadow-xl shadow-blue-500/20 hover:bg-blue-700 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-3 group"
                  >
                    Confirmar agendamento
                    <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
                  </button>
                </form>
              </motion.div>
            )}

            {step === 'success' && (
              <motion.div 
                key="success-step"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex flex-col items-center justify-center h-full text-center py-12"
              >
                <div className="w-24 h-24 rounded-[2.5rem] bg-green-50 text-green-500 flex items-center justify-center mb-8 shadow-inner border border-green-100 animate-bounce">
                  <CheckCircle2 size={48} />
                </div>
                <h3 className="text-3xl font-black text-gray-950 tracking-tight mb-4">
                  Agendamento confirmado!
                </h3>
                <p className="text-lg text-gray-500 font-medium max-w-sm mb-10 leading-relaxed">
                  Tudo certo, <strong>{formData.name}</strong>! Enviamos uma confirmação para seu WhatsApp.
                </p>
                <div className="bg-gray-50 p-6 rounded-3xl border border-gray-100 w-full max-w-sm">
                  <div className="flex flex-col gap-2">
                    <p className="text-sm font-black uppercase tracking-widest text-gray-400">Resumo</p>
                    <p className="text-base font-bold text-gray-700">
                      {selectedDate && format(selectedDate, "EEEE, d 'de' MMMM", { locale: ptBR })} às {selectedTime}
                    </p>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <div className="text-center mt-12 text-[11px] font-black text-gray-400 uppercase tracking-widest flex items-center justify-center gap-3">
        <div className="w-8 h-px bg-gray-200" />
        Desenvolvido por Meatende.ai
        <div className="w-8 h-px bg-gray-200" />
      </div>

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #e5e7eb;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #d1d5db;
        }
      `}</style>
    </div>
  );
}
