'use client';

import React, { useState, useEffect } from 'react';
import { X, Calendar, Trash2, AlertTriangle, Clock, Scissors, User, Info, Save, Phone } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { motion, AnimatePresence } from 'framer-motion';
import { Appointment } from '@/hooks/useAppointments';

interface AppointmentOptionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDelete: () => void;
  onSave: (data: any) => Promise<void>;
  services: { name: string; price: string; duration?: number }[];
  appointment: Appointment | null;
}

export function AppointmentOptionsModal({ 
  isOpen, 
  onClose, 
  onDelete,
  onSave,
  services,
  appointment 
}: AppointmentOptionsModalProps) {
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  // Form State
  const [name, setName] = useState('');
  const [phone, setPhone] = useState(''); // Added phone state
  const [serviceType, setServiceType] = useState('');
  const [notes, setNotes] = useState('');
  const [startTime, setStartTime] = useState('');
  const [appointmentDate, setAppointmentDate] = useState('');

  // Sync state when appointment changes
  useEffect(() => {
    if (appointment) {
      setName(appointment.client_name || '');
      setPhone(appointment.lead_phone || ''); // Initialize phone
      setServiceType(appointment.service_type || '');
      setNotes(appointment.notes || '');
      setStartTime(appointment.start_time ? format(parseISO(appointment.start_time), 'HH:mm') : '');
      setAppointmentDate(appointment.appointment_date || '');
      setShowConfirmDelete(false);
    }
  }, [appointment, isOpen]);

  if (!isOpen || !appointment) return null;

  const isBlockEvent = appointment.service_type === 'Bloqueio' || appointment.client_name === 'Horário Bloqueado' || appointment.status === 'blocked';

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      // Ensure we have a valid phone number to avoid DB constraint issues
      const safePhone = phone || appointment.lead_phone || '00000000000';
      
      await onSave({
        type: appointment.status === 'blocked' || isBlockEvent ? 'BLOCK' : 'SCHEDULE',
        name,
        phone: safePhone, // Pass the phone number!
        service_type: serviceType,
        notes,
        startTime,
        appointmentDate
      });
      onClose();
    } catch (error) {
      console.error("❌ Error saving appointment:", error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="w-full max-w-lg bg-white rounded-[2.5rem] shadow-2xl overflow-hidden"
      >
        {isBlockEvent ? (
          <div className="p-8 text-center flex flex-col items-center gap-6">
            <div className="w-16 h-16 rounded-full bg-blue-50 flex items-center justify-center text-[#1e61ff] mx-auto">
              <AlertTriangle size={32} />
            </div>
            <div className="flex flex-col items-center text-center gap-2">
              <h3 className="text-2xl font-black text-[#1a2b4b]">Deseja desbloquear esse horário?</h3>
            </div>
            <div className="w-full flex flex-col gap-3 mt-4">
              <button 
                type="button"
                onClick={onDelete}
                className="w-full py-4 rounded-2xl bg-[#1e61ff] text-white font-black uppercase tracking-widest text-sm hover:bg-blue-600 transition-colors"
              >
                Sim, desejo
              </button>
              <button 
                type="button"
                onClick={onClose}
                className="w-full py-4 rounded-2xl bg-gray-50 text-gray-400 font-black uppercase tracking-widest text-sm hover:bg-gray-100 transition-colors"
              >
                Não, cancelar
              </button>
            </div>
          </div>
        ) : !showConfirmDelete ? (
          <form onSubmit={handleSave}>
            {/* Header Area */}
            <div className="p-8 pb-4 relative border-b border-gray-50 bg-gray-50/30">
              <button 
                type="button"
                onClick={onClose} 
                className="absolute top-6 right-6 p-2 bg-white text-gray-400 hover:text-black shadow-sm border border-black/5 rounded-full transition-all"
              >
                <X size={20} />
              </button>

              <div className="flex flex-col gap-1 pr-10">
                <span className="text-[10px] font-black text-blue-600 uppercase tracking-[0.2em] mb-1">
                  Editar Agendamento
                </span>
                <h3 className="text-xl font-black text-gray-900 leading-tight">
                  Ajuste os detalhes abaixo
                </h3>
              </div>
            </div>
            
            {/* Form Fields Section */}
            <div className="p-8 space-y-5 max-h-[60vh] overflow-y-auto no-scrollbar">
              {/* Client Name */}
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-4">Nome da Cliente</label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" size={18} />
                  <input
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full pl-12 pr-6 py-4 bg-gray-50 border-2 border-transparent focus:bg-white focus:border-blue-500 rounded-2xl outline-none transition-all font-bold text-gray-900"
                    placeholder="Nome completo"
                  />
                </div>
              </div>

              {/* Phone Number - ADDED FIELD */}
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-4">WhatsApp / Telefone</label>
                <div className="relative">
                  <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" size={18} />
                  <input
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full pl-12 pr-6 py-4 bg-gray-50 border-2 border-transparent focus:bg-white focus:border-blue-500 rounded-2xl outline-none transition-all font-bold text-gray-900"
                    placeholder="(11) 99999-9999"
                  />
                </div>
              </div>

              {/* Service Selection */}
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-4">Serviço</label>
                <div className="relative">
                  <Scissors className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" size={18} />
                  <select
                    required
                    value={serviceType}
                    onChange={(e) => setServiceType(e.target.value)}
                    className="w-full pl-12 pr-10 py-4 bg-gray-50 border-2 border-transparent focus:bg-white focus:border-blue-500 rounded-2xl outline-none transition-all font-bold text-gray-900 appearance-none"
                  >
                    <option value="">Selecione o procedimento</option>
                    {services.map((s, idx) => (
                      <option key={idx} value={s.name}>{s.name} - R$ {s.price}</option>
                    ))}
                  </select>
                </div>
              </div>


            </div>

            {/* Footer Buttons */}
            <div className="px-8 pb-8 pt-4 grid grid-cols-2 gap-4 bg-gray-50/30">
              <button 
                type="button"
                onClick={() => setShowConfirmDelete(true)}
                className="w-full py-4 border-2 border-red-100 text-red-500 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-red-50 hover:border-red-200 transition-all active:scale-95"
              >
                Excluir
              </button>
              <button 
                type="submit"
                disabled={isSaving}
                className="w-full py-4 bg-blue-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-blue-500/20 hover:bg-blue-700 transition-all active:scale-95 flex items-center justify-center gap-2"
              >
                {isSaving ? 'Salvando...' : (
                  <>
                    <Save size={14} />
                    Salvar Agendamento
                  </>
                )}
              </button>
            </div>
          </form>
        ) : (
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="p-10 flex flex-col items-center text-center"
          >
            <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mb-6">
              <AlertTriangle size={36} className="text-red-500" />
            </div>
            <h3 className="text-2xl font-black text-gray-900 mb-2">Confirmar Exclusão</h3>
            <p className="text-sm font-bold text-gray-400 mb-8 leading-relaxed">
              Deseja remover permanentemente o agendamento de <span className="text-gray-900">{appointment.client_name}</span>?
            </p>
            
            <div className="w-full space-y-3">
              <button 
                onClick={() => { onDelete(); setShowConfirmDelete(false); onClose(); }}
                className="w-full py-5 bg-red-500 text-white rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-red-600 transition-all shadow-xl shadow-red-500/20 active:scale-95"
              >
                Sim, Apagar Agora
              </button>
              <button 
                onClick={() => setShowConfirmDelete(false)}
                className="w-full py-5 text-gray-400 font-black text-xs uppercase tracking-widest hover:text-gray-900 transition-colors"
              >
                Cancelar e Voltar
              </button>
            </div>
          </motion.div>
        )}
      </motion.div>
    </div>
  );
}
