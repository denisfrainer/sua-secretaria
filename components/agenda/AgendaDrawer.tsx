'use client';

import React from 'react';
import { Drawer } from 'vaul';
import { X, Phone, CalendarRange, Trash2, Ban, User, Clock, Plus, ExternalLink, ShieldOff } from 'lucide-react';
import { motion } from 'framer-motion';

interface SlotData {
  time: string;
  booked: { client: string; service: string; status: string } | null;
  type: 'booked' | 'free';
}

export function AgendaDrawer({ isOpen, onClose, slot }: { isOpen: boolean; onClose: () => void; slot?: SlotData | null }) {
  if (!slot) return null;
  const isBooked = !!slot.booked;

  const handleAction = (type: string) => {
    console.log(`🖱️ [AGENDA] Action clicked: ${type} for ${slot.time}`);
    if (type === 'whatsapp') {
      window.open('https://wa.me/5500000000000', '_blank');
    }
    // onClose();
  };

  return (
    <Drawer.Root open={isOpen} onOpenChange={onClose}>
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100]" />
        <Drawer.Content className="fixed bottom-0 left-0 right-0 max-h-[90%] bg-white rounded-t-[3rem] z-[101] flex flex-col outline-none shadow-2xl">
          <div className="mx-auto w-12 h-1.5 flex-shrink-0 rounded-full bg-gray-200 my-4" />
          
          <div className="flex-1 overflow-y-auto px-6 pb-8 space-y-8 scroll-smooth">
            {/* Header Slot Info */}
            <div className="flex flex-col items-center text-center gap-4">
              <div className="w-20 h-20 rounded-full bg-blue-50 flex items-center justify-center border-4 border-white shadow-xl shadow-blue-500/10">
                {isBooked ? (
                  <User size={32} className="text-blue-600" />
                ) : (
                  <Clock size={32} className="text-blue-600" />
                )}
              </div>
              <div className="flex flex-col gap-1">
                <h2 className="text-2xl font-black text-gray-900 tracking-tight">
                  {isBooked ? `Atendimento: ${slot.booked?.client}` : 'Horário Livre'}
                </h2>
                <div className="flex items-center justify-center gap-2 text-sm font-bold text-gray-400 uppercase tracking-widest">
                  <Clock size={14} />
                  {slot.time}
                  <span className="w-1 h-1 rounded-full bg-gray-300" />
                  {isBooked ? slot.booked?.service : 'Disponível'}
                </div>
              </div>
            </div>

            {/* Actions Grid */}
            <div className="grid grid-cols-1 gap-3">
              {isBooked ? (
                <>
                  <button 
                    onClick={() => handleAction('whatsapp')}
                    className="w-full flex items-center justify-between p-5 bg-green-500 text-white rounded-3xl shadow-lg shadow-green-500/20 active:scale-95 transition-all group overflow-hidden relative"
                  >
                    <div className="flex items-center gap-3 relative z-10">
                      <Phone size={20} />
                      <span className="text-sm font-black uppercase tracking-wider">Chamar no WhatsApp</span>
                    </div>
                    <ExternalLink size={18} className="translate-x-4 opacity-0 group-hover:translate-x-0 group-hover:opacity-100 transition-all" />
                  </button>

                  <div className="grid grid-cols-2 gap-3">
                    <button 
                      onClick={() => handleAction('reschedule')}
                      className="flex flex-col items-center justify-center gap-3 p-6 bg-gray-50 text-gray-500 rounded-3xl border border-black/5 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-100 transition-all active:scale-95"
                    >
                      <CalendarRange size={24} />
                      <span className="text-[10px] font-black uppercase tracking-widest">Reagendar</span>
                    </button>
                    <button 
                      onClick={() => handleAction('cancel')}
                      className="flex flex-col items-center justify-center gap-3 p-6 bg-gray-50 text-gray-500 rounded-3xl border border-black/5 hover:bg-red-50 hover:text-red-600 hover:border-red-100 transition-all active:scale-95"
                    >
                      <Trash2 size={24} />
                      <span className="text-[10px] font-black uppercase tracking-widest">Cancelar</span>
                    </button>
                  </div>

                  <button 
                    onClick={() => handleAction('block')}
                    className="w-full flex items-center gap-3 p-5 bg-gray-900 text-white rounded-3xl border border-black/5 hover:bg-black transition-all active:scale-95"
                  >
                    <Ban size={20} className="text-gray-400" />
                    <span className="text-sm font-black uppercase tracking-wider">Bloquear Horário</span>
                  </button>
                </>
              ) : (
                <>
                  <button 
                    onClick={() => handleAction('new_booking')}
                    className="w-full flex items-center justify-between p-5 bg-blue-600 text-white rounded-3xl shadow-lg shadow-blue-500/20 active:scale-95 transition-all group overflow-hidden relative"
                  >
                    <div className="flex items-center gap-3 relative z-10">
                      <Plus size={20} />
                      <span className="text-sm font-black uppercase tracking-wider">Novo Agendamento</span>
                    </div>
                    <ChevronRight size={18} className="translate-x-4 opacity-0 group-hover:translate-x-0 group-hover:opacity-100 transition-all" />
                  </button>

                  <button 
                    onClick={() => handleAction('block')}
                    className="w-full flex items-center gap-3 p-5 bg-gray-900 text-white rounded-3xl border border-black/5 hover:bg-black transition-all active:scale-95"
                  >
                    <Ban size={20} className="text-gray-400" />
                    <span className="text-sm font-black uppercase tracking-wider">Bloquear Horário</span>
                  </button>
                </>
              )}
            </div>

            {/* Quick Note / Info Section */}
            <div className="p-6 bg-gray-50 rounded-3xl border border-black/5 flex items-start gap-4">
              <ShieldOff size={20} className="text-gray-300 mt-1" />
              <div className="flex flex-col gap-1">
                <span className="text-xs font-black text-gray-900 uppercase tracking-widest">Privacidade & Segurança</span>
                <p className="text-[11px] font-bold text-gray-400 leading-relaxed uppercase tracking-widest">
                  Apenas você e o assistente de IA podem visualizar e operar os detalhes desta agenda. 
                  Operações manuais ignoram as regras de automação padrão.
                </p>
              </div>
            </div>
          </div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}

function ChevronRight(props: any) {
  return (
    <svg 
      {...props} 
      xmlns="http://www.w3.org/2000/svg" 
      width="24" height="24" 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round"
    >
      <path d="m9 18 6-6-6-6"/>
    </svg>
  );
}
