'use client';

import React, { useState, useEffect } from 'react';
import { Drawer } from 'vaul';
import { X, Clock, User, Scissors, Check, Loader2, Sparkles } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

interface Service {
  id: string;
  name: string;
  duration: string | number;
  price: string | number;
  status: 'active' | 'inactive';
}

interface NewAppointmentDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  selectedTime: string;
  services: Service[];
  onSuccess: () => void;
}

export function NewAppointmentDrawer({ isOpen, onClose, selectedTime, services: initialServices, onSuccess }: NewAppointmentDrawerProps) {
  const [clientName, setClientName] = useState('');
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [services, setServices] = useState<any[]>(initialServices || []);

  const supabase = createClient();

  useEffect(() => {
    async function fetchServices() {
      if (!isOpen) return;
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data: configData } = await supabase
          .from('business_config')
          .select('context_json')
          .eq('owner_id', user.id)
          .single();

        if (configData?.context_json) {
          const list = (configData.context_json as any).services || [];
          // Filter out inactive services
          setServices(list.filter((s: any) => s.status !== 'inactive'));
        }
      } catch (err: any) {
        console.error('❌ [NEW_APP_DRAWER] Fetch services error:', err.message);
      }
    }

    fetchServices();
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientName || !selectedService) return;

    setIsSubmitting(true);
    setError(null);

    try {
      // Extract numeric duration
      const durationStr = String(selectedService.duration);
      const durationMinutes = parseInt(durationStr.replace(/[^0-9]/g, '')) || 30;

      const response = await fetch('/api/agenda/book', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientName,
          serviceName: selectedService.name,
          startTime: selectedTime,
          duration: durationMinutes // Send as number
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Falha ao realizar agendamento');
      }

      onSuccess();
      onClose();
      // Reset form
      setClientName('');
      setSelectedService(null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Drawer.Root open={isOpen} onOpenChange={onClose}>
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[110]" />
        <Drawer.Content 
          onOpenAutoFocus={(e) => e.preventDefault()}
          className="fixed bottom-0 left-0 right-0 max-h-[90%] bg-white rounded-t-[3rem] z-[111] flex flex-col outline-none shadow-2xl"
        >
          <div className="mx-auto w-12 h-1.5 flex-shrink-0 rounded-full bg-gray-200 my-4" />
          <Drawer.Title className="sr-only">Novo Agendamento</Drawer.Title>
          <Drawer.Description className="sr-only">Preencha os dados do cliente para realizar um novo agendamento manual na agenda do Google.</Drawer.Description>
          
          <div className="flex-1 overflow-y-auto px-6 pb-8 space-y-8">
            {/* Header */}
            <div className="flex flex-col items-center text-center gap-4">
              <div className="w-20 h-20 rounded-full bg-blue-50 flex items-center justify-center border-4 border-white shadow-xl shadow-blue-500/10">
                <Sparkles size={32} className="text-blue-600" />
              </div>
              <div className="flex flex-col gap-1">
                <h2 className="text-2xl font-black text-gray-900 tracking-tight">Manual Booking</h2>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Reserve um horário agora</p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Error Message */}
              {error && (
                <div className="p-4 bg-red-50 text-red-600 rounded-2xl text-xs font-bold border border-red-100 animate-in fade-in zoom-in duration-300">
                  {error}
                </div>
              )}

              {/* Client Name Input */}
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 flex items-center gap-2">
                  <User size={12} />
                  Nome do Cliente
                </label>
                <input
                  required
                  type="text"
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  placeholder="Ex: João Silva"
                  className="w-full p-5 bg-gray-50 border border-black/5 rounded-3xl text-sm font-black outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500/20 transition-all"
                />
              </div>

              {/* Service Selection */}
              <div className="space-y-3">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 flex items-center gap-2">
                  <Scissors size={12} />
                  Selecione o Serviço
                </label>
                <div className="grid grid-cols-1 gap-2">
                  {services.map((service, index) => (
                    <button
                      key={index}
                      type="button"
                      onClick={() => setSelectedService(service)}
                      className={`flex items-center justify-between p-4 rounded-2xl border transition-all ${
                        selectedService?.name === service.name
                          ? 'bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-500/20'
                          : 'bg-white border-black/5 text-gray-900 hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex flex-col items-start gap-0.5">
                        <span className="text-sm font-black tracking-tight">{service.name}</span>
                        <span className={`text-[10px] font-bold uppercase tracking-widest ${
                          selectedService?.name === service.name ? 'text-white/60' : 'text-gray-400'
                        }`}>
                          {service.duration} • {service.price}
                        </span>
                      </div>
                      {selectedService?.name === service.name && <Check size={16} />}
                    </button>
                  ))}
                  {services.length === 0 && (
                    <p className="text-[10px] font-bold text-gray-400 text-center py-4 bg-gray-50 border border-dashed border-gray-200 rounded-2xl uppercase tracking-widest">
                      Nenhum serviço cadastrado nas configurações.
                    </p>
                  )}
                </div>
              </div>

              {/* Info Box */}
              <div className="p-5 bg-blue-50 rounded-3xl border border-blue-100 flex items-center gap-4">
                <Clock size={20} className="text-blue-600" />
                <div className="flex flex-col">
                  <span className="text-[10px] font-black text-blue-900 uppercase tracking-widest">Horário Selecionado</span>
                  <span className="text-sm font-black text-blue-600">{selectedTime}</span>
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isSubmitting || !clientName || !selectedService}
                className={`w-full h-16 rounded-3xl font-black uppercase tracking-widest text-sm flex items-center justify-center gap-3 transition-all ${
                  isSubmitting || !clientName || !selectedService
                    ? 'bg-gray-100 text-gray-300'
                    : 'bg-blue-600 text-white shadow-xl shadow-blue-500/20 active:scale-95'
                }`}
              >
                {isSubmitting ? (
                  <Loader2 className="animate-spin" size={20} />
                ) : (
                  <>
                    <Check size={20} />
                    Confirmar Agendamento
                  </>
                )}
              </button>
            </form>
          </div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}
