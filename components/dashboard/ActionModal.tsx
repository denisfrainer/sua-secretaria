import React, { useState, useEffect } from 'react';
import { X, User, Phone, Info, Calendar, Clock, Lock, CheckCircle2 } from 'lucide-react';
import { format } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';

interface ActionModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedSlots: Date[];
  onConfirm: (data: { type: 'SCHEDULE' | 'BLOCK'; name?: string; phone?: string; notes?: string; service_type?: string; startTime?: string; appointmentDate?: string }) => Promise<void>;
  services?: { name: string; price: string }[];
  initialData?: {
    name?: string;
    phone?: string;
    notes?: string;
    service_type?: string;
    type: 'SCHEDULE' | 'BLOCK';
    startTime?: string;
    appointmentDate?: string;
  };
}

type ModalStep = 'SELECT' | 'FORM';

export function ActionModal({ isOpen, onClose, selectedSlots, onConfirm, initialData, services = [] }: ActionModalProps) {
  const [step, setStep] = useState<ModalStep>(initialData ? 'FORM' : 'SELECT');
  const [type, setType] = useState<'SCHEDULE' | 'BLOCK'>(initialData?.type || 'SCHEDULE');
  const [name, setName] = useState(initialData?.name || '');
  const [phone, setPhone] = useState(initialData?.phone || '');
  const [notes, setNotes] = useState(initialData?.notes || '');
  const [serviceType, setServiceType] = useState(initialData?.service_type || '');
  const [startTime, setStartTime] = useState(initialData?.startTime || '');
  const [appointmentDate, setAppointmentDate] = useState(initialData?.appointmentDate || '');
  const [loading, setLoading] = useState(false);

  // Reset step when opening
  useEffect(() => {
    if (isOpen && !initialData) {
      setStep('SELECT');
    }
  }, [isOpen, initialData]);

  useEffect(() => {
    if (initialData) {
      setName(initialData.name || '');
      setPhone(initialData.phone || '');
      setNotes(initialData.notes || '');
      setServiceType(initialData.service_type || '');
      setStartTime(initialData.startTime ? format(new Date(initialData.startTime), 'HH:mm') : '');
      setAppointmentDate(initialData.appointmentDate || '');
      setStep('FORM');
      setType(initialData.type);
    }
  }, [initialData]);

  if (!isOpen) return null;

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setLoading(true);
    try {
      await onConfirm({
        type,
        name: type === 'SCHEDULE' ? name : 'Bloqueio de Agenda',
        phone: type === 'SCHEDULE' ? phone : '00000000000',
        notes,
        service_type: serviceType,
        startTime,
        appointmentDate
      });
      onClose();
    } catch (error) {
      console.error("❌ Error in modal submission:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectType = async (selectedType: 'SCHEDULE' | 'BLOCK') => {
    setType(selectedType);
    if (selectedType === 'SCHEDULE') {
      setStep('FORM');
    } else {
      // Auto-submit the block payload
      setLoading(true);
      try {
        await onConfirm({
          type: 'BLOCK',
          name: 'Horário Bloqueado',
          phone: '00000000000', // Bypass NOT NULL
          service_type: 'Bloqueio',
          notes: '',
          startTime,
          appointmentDate
        });
        onClose();
      } catch (error) {
        console.error("❌ Error blocking slot:", error);
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
      <AnimatePresence mode="wait">
        {step === 'SELECT' ? (
          <motion.div 
            key="select"
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="w-full max-w-xs bg-white rounded-[2.5rem] shadow-2xl overflow-hidden p-8"
          >
            <div className="flex flex-col items-center gap-6">
              <div className="flex flex-col items-center text-center gap-2">
                <h3 className="text-xl font-black text-[#1a2b4b]">O que deseja fazer?</h3>
                <p className="text-xs font-bold text-[#bac4d1] uppercase tracking-widest">Selecione uma opção</p>
              </div>

              <div className="w-full flex flex-col gap-3">
                <button 
                  onClick={() => handleSelectType('SCHEDULE')}
                  className="w-full flex items-center gap-4 px-6 py-5 rounded-2xl bg-blue-50 text-[#1e61ff] hover:bg-blue-100 transition-all group"
                >
                  <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <CheckCircle2 size={24} />
                  </div>
                  <span className="font-black text-sm uppercase tracking-widest">Agendar</span>
                </button>

                <button 
                  onClick={() => handleSelectType('BLOCK')}
                  className="w-full flex items-center gap-4 px-6 py-5 rounded-2xl bg-gray-50 text-[#1a2b4b] hover:bg-gray-100 transition-all group"
                >
                  <div className="w-12 h-12 rounded-xl bg-gray-200 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Lock size={24} />
                  </div>
                  <span className="font-black text-sm uppercase tracking-widest">Bloquear</span>
                </button>
              </div>

              <button 
                onClick={onClose}
                className="text-xs font-black text-[#bac4d1] uppercase tracking-[0.2em] hover:text-[#1a2b4b] transition-colors"
              >
                Cancelar
              </button>
            </div>
          </motion.div>
        ) : (
          <motion.div 
            key="form"
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            className="w-full max-w-lg bg-white rounded-[2.5rem] shadow-2xl overflow-hidden"
          >
            {/* Header */}
            <div className="relative px-8 pt-8 pb-6 border-b border-gray-50">
              <button 
                onClick={onClose}
                className="absolute right-6 top-6 p-2 rounded-full hover:bg-gray-100 transition-colors"
              >
                <X size={24} className="text-gray-400" />
              </button>
              
              <h2 className="text-2xl font-black text-[#1a2b4b]">
                {initialData ? 'Reagendar' : 'Agendar'}
              </h2>
              <p className="text-[#bac4d1] font-bold text-sm mt-1 uppercase tracking-widest">
                Preencha os detalhes abaixo
              </p>
            </div>

            <form onSubmit={handleSubmit} className="p-8">
              {/* Form Fields */}
              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-[#bac4d1] ml-4">
                    Nome da Cliente
                  </label>
                  <div className="relative">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 text-[#bac4d1]" size={20} />
                    <input
                      required
                      autoFocus
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Ex: Maria Silva"
                      className="w-full pl-12 pr-6 py-4 bg-gray-50 border-transparent focus:bg-white focus:border-[#1e61ff] rounded-2xl outline-none transition-all font-bold text-[#1a2b4b]"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-[#bac4d1] ml-4">
                    WhatsApp / Telefone
                  </label>
                  <div className="relative">
                    <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-[#bac4d1]" size={20} />
                    <input
                      required
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="(11) 99999-9999"
                      className="w-full pl-12 pr-6 py-4 bg-gray-50 border-transparent focus:bg-white focus:border-[#1e61ff] rounded-2xl outline-none transition-all font-bold text-[#1a2b4b]"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-[#bac4d1] ml-4">
                    Serviço
                  </label>
                  <div className="relative">
                    <Info className="absolute left-4 top-1/2 -translate-y-1/2 text-[#bac4d1]" size={20} />
                    <select
                      required
                      value={serviceType}
                      onChange={(e) => setServiceType(e.target.value)}
                      className="w-full pl-12 pr-6 py-4 bg-gray-50 border-transparent focus:bg-white focus:border-[#1e61ff] rounded-2xl outline-none transition-all font-bold text-[#1a2b4b] appearance-none"
                    >
                      <option value="">Selecione um serviço</option>
                      {services.map((s, idx) => (
                        <option key={idx} value={s.name}>
                          {s.name} - R$ {s.price}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {initialData && (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-[#bac4d1] ml-4">Data</label>
                      <div className="relative">
                        <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-[#bac4d1]" size={18} />
                        <input
                          type="date"
                          value={appointmentDate}
                          onChange={(e) => setAppointmentDate(e.target.value)}
                          className="w-full pl-12 pr-4 py-4 bg-gray-50 border-transparent focus:bg-white focus:border-[#1e61ff] rounded-2xl outline-none font-bold text-[#1a2b4b]"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-[#bac4d1] ml-4">Horário</label>
                      <div className="relative">
                        <Clock className="absolute left-4 top-1/2 -translate-y-1/2 text-[#bac4d1] pointer-events-none" size={18} />
                        <select
                          value={startTime}
                          onChange={(e) => setStartTime(e.target.value)}
                          className="w-full pl-12 pr-10 py-4 bg-gray-50 border-transparent focus:bg-white focus:border-[#1e61ff] rounded-2xl outline-none font-bold text-[#1a2b4b] appearance-none cursor-pointer"
                        >
                          {Array.from({ length: 24 * 2 }).map((_, i) => {
                            const h = Math.floor(i / 2);
                            const m = (i % 2) * 30;
                            const time = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
                            return (
                              <option key={time} value={time}>
                                {time}
                              </option>
                            );
                          })}
                        </select>
                      </div>
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-[#bac4d1] ml-4">
                    Observações (Opcional)
                  </label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Ex: Alongamento em gel, francesinha..."
                    rows={3}
                    className="w-full px-6 py-4 bg-gray-50 border-transparent focus:bg-white focus:border-[#1e61ff] rounded-2xl outline-none transition-all font-bold text-[#1a2b4b] resize-none"
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="mt-10 flex flex-col gap-3">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-5 rounded-[2rem] font-black text-lg bg-[#1e61ff] text-white shadow-xl shadow-blue-500/20 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50"
                >
                  {loading ? 'Salvando...' : 'Confirmar'}
                </button>
                
                <button
                  type="button"
                  onClick={() => setStep('SELECT')}
                  className="w-full py-4 rounded-[2rem] font-black text-sm text-[#bac4d1] uppercase tracking-widest hover:text-[#1a2b4b] transition-colors"
                >
                  Voltar
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
