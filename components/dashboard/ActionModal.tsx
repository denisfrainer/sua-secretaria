import React, { useState, useEffect } from 'react';
import { X, User, Phone, Info, Calendar, Clock } from 'lucide-react';
import { format } from 'date-fns';

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

export function ActionModal({ isOpen, onClose, selectedSlots, onConfirm, initialData, services = [] }: ActionModalProps) {
  const [type, setType] = useState<'SCHEDULE' | 'BLOCK'>(initialData?.type || (selectedSlots.length > 1 ? 'BLOCK' : 'SCHEDULE'));
  const [name, setName] = useState(initialData?.name || '');
  const [phone, setPhone] = useState(initialData?.phone || '');
  const [notes, setNotes] = useState(initialData?.notes || '');
  const [serviceType, setServiceType] = useState(initialData?.service_type || '');
  const [startTime, setStartTime] = useState(initialData?.startTime || '');
  const [appointmentDate, setAppointmentDate] = useState(initialData?.appointmentDate || '');
  const [loading, setLoading] = useState(false);

  // Update local state when initialData changes (e.g. when opening for a different appointment)
  useEffect(() => {
    if (initialData) {
      setName(initialData.name || '');
      setPhone(initialData.phone || '');
      setNotes(initialData.notes || '');
      setServiceType(initialData.service_type || '');
      setStartTime(initialData.startTime ? format(new Date(initialData.startTime), 'HH:mm') : '');
      setAppointmentDate(initialData.appointmentDate || '');
    }
  }, [initialData]);

  if (!isOpen) return null;

  const isMulti = selectedSlots.length > 1;
  const canSchedule = !isMulti;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
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

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-lg bg-white rounded-t-[2.5rem] sm:rounded-[2.5rem] shadow-2xl overflow-hidden animate-in slide-in-from-bottom duration-300">
        
        {/* Header */}
        <div className="relative px-8 pt-8 pb-6 border-b border-gray-50">
          <button 
            onClick={onClose}
            className="absolute right-6 top-6 p-2 rounded-full hover:bg-gray-100 transition-colors"
          >
            <X size={24} className="text-gray-400" />
          </button>
          
          <h2 className="text-2xl font-black text-[#1a2b4b]">
            {initialData ? 'Editar Agendamento' : 'Novo Registro'}
          </h2>
          <p className="text-[#bac4d1] font-bold text-sm mt-1 uppercase tracking-widest">
            {isMulti ? `${selectedSlots.length} horários selecionados` : 'Selecione a ação desejada'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="p-8">
          {/* Action Toggle */}
          <div className="flex p-1 bg-gray-50 rounded-2xl mb-8">
            <button
              type="button"
              disabled={!canSchedule}
              onClick={() => setType('SCHEDULE')}
              className={`flex-1 py-3 rounded-xl text-sm font-black transition-all ${
                type === 'SCHEDULE' 
                  ? 'bg-white text-[#1e61ff] shadow-sm' 
                  : 'text-[#bac4d1] opacity-50 cursor-not-allowed'
              } ${!canSchedule && type === 'SCHEDULE' ? 'opacity-20' : ''}`}
            >
              Agendar Cliente
            </button>
            <button
              type="button"
              onClick={() => setType('BLOCK')}
              className={`flex-1 py-3 rounded-xl text-sm font-black transition-all ${
                type === 'BLOCK' 
                  ? 'bg-black text-white shadow-lg' 
                  : 'text-[#bac4d1]'
              }`}
            >
              Bloquear Horário
            </button>
          </div>

          {!canSchedule && type === 'SCHEDULE' && (
            <div className="mb-6 p-4 bg-blue-50 border border-blue-100 rounded-2xl flex gap-3 items-start">
              <Info className="text-[#1e61ff] shrink-0" size={20} />
              <p className="text-xs font-bold text-blue-700 leading-relaxed">
                Seleção múltipla permitida apenas para bloqueios. Para agendar um cliente, selecione apenas um horário.
              </p>
            </div>
          )}

          {/* Form Fields */}
          <div className="space-y-6">
            {type === 'SCHEDULE' && (
              <>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-[#bac4d1] ml-4">
                    Nome da Cliente
                  </label>
                  <div className="relative">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 text-[#bac4d1]" size={20} />
                    <input
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Ex: Maria Silva"
                      className="w-full pl-12 pr-6 py-4 bg-gray-50 border-transparent focus:bg-white focus:border-[#1e61ff] focus:ring-4 focus:ring-blue-500/10 rounded-2xl outline-none transition-all font-bold text-[#1a2b4b]"
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
                      className="w-full pl-12 pr-6 py-4 bg-gray-50 border-transparent focus:bg-white focus:border-[#1e61ff] focus:ring-4 focus:ring-blue-500/10 rounded-2xl outline-none transition-all font-bold text-[#1a2b4b]"
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
                      className="w-full pl-12 pr-6 py-4 bg-gray-50 border-transparent focus:bg-white focus:border-[#1e61ff] focus:ring-4 focus:ring-blue-500/10 rounded-2xl outline-none transition-all font-bold text-[#1a2b4b] appearance-none"
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
              </>
            )}

            {initialData && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-[#bac4d1] ml-4">
                    Data
                  </label>
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
                  <label className="text-[10px] font-black uppercase tracking-widest text-[#bac4d1] ml-4">
                    Horário
                  </label>
                  <div className="relative">
                    <Clock className="absolute left-4 top-1/2 -translate-y-1/2 text-[#bac4d1]" size={18} />
                    <input
                      type="time"
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                      className="w-full pl-12 pr-4 py-4 bg-gray-50 border-transparent focus:bg-white focus:border-[#1e61ff] rounded-2xl outline-none font-bold text-[#1a2b4b]"
                    />
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
                className="w-full px-6 py-4 bg-gray-50 border-transparent focus:bg-white focus:border-[#1e61ff] focus:ring-4 focus:ring-blue-500/10 rounded-2xl outline-none transition-all font-bold text-[#1a2b4b] resize-none"
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="mt-10 flex flex-col gap-3">
            <button
              type="submit"
              disabled={loading || (type === 'SCHEDULE' && !canSchedule)}
              className={`w-full py-5 rounded-[2rem] font-black text-lg transition-all shadow-xl ${
                type === 'SCHEDULE'
                  ? 'bg-[#1e61ff] text-white shadow-blue-500/20 hover:scale-[1.02] active:scale-[0.98]'
                  : 'bg-black text-white shadow-black/10 hover:scale-[1.02] active:scale-[0.98]'
              } disabled:opacity-50 disabled:scale-100`}
            >
              {loading ? 'Salvando...' : initialData ? 'Salvar Alterações' : type === 'SCHEDULE' ? 'Confirmar Agendamento' : 'Bloquear Horários'}
            </button>
            
            <button
              type="button"
              onClick={onClose}
              className="w-full py-4 rounded-[2rem] font-black text-sm text-[#bac4d1] uppercase tracking-widest hover:text-[#1a2b4b] transition-colors"
            >
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
