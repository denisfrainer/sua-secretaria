'use client';

import React, { useState } from 'react';
import { X, Calendar, Trash2, AlertTriangle } from 'lucide-react';

interface AppointmentOptionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onReschedule: () => void;
  onCancel: () => void;
  onDelete: () => void;
  clientName: string;
}

export function AppointmentOptionsModal({ 
  isOpen, 
  onClose, 
  onReschedule, 
  onCancel,
  onDelete,
  clientName 
}: AppointmentOptionsModalProps) {
  const [showConfirm, setShowConfirm] = useState(false);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-xs bg-white rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        {!showConfirm ? (
          <>
            <div className="px-6 pt-6 pb-4 border-b border-gray-50 flex justify-between items-center">
              <h3 className="text-lg font-black text-[#1a2b4b] truncate pr-4">{clientName}</h3>
              <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-full transition-colors">
                <X size={20} className="text-gray-400" />
              </button>
            </div>
            
            <div className="p-4 space-y-2">
              <button 
                onClick={() => { onReschedule(); onClose(); }}
                className="w-full flex items-center gap-3 px-6 py-4 rounded-2xl hover:bg-blue-50 text-blue-600 transition-all group"
              >
                <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center group-hover:bg-blue-100 transition-colors">
                  <Calendar size={18} />
                </div>
                <div className="flex flex-col items-start">
                  <span className="font-black text-[11px] uppercase tracking-widest">Reagendar</span>
                  <span className="text-[10px] font-bold text-gray-400">Alterar dia ou horário</span>
                </div>
              </button>

              <button 
                onClick={() => { onCancel(); onClose(); }}
                className="w-full flex items-center gap-3 px-6 py-4 rounded-2xl hover:bg-amber-50 text-amber-600 transition-all group"
              >
                <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center group-hover:bg-amber-100 transition-colors">
                  <X size={18} />
                </div>
                <div className="flex flex-col items-start">
                  <span className="font-black text-[11px] uppercase tracking-widest">Desmarcar</span>
                  <span className="text-[10px] font-bold text-gray-400">Cancelar sem apagar</span>
                </div>
              </button>

              <div className="h-px bg-gray-100 mx-4 my-2" />

              <button 
                onClick={() => setShowConfirm(true)}
                className="w-full flex items-center gap-3 px-6 py-4 rounded-2xl hover:bg-red-50 text-red-500 transition-all group"
              >
                <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center group-hover:bg-red-100 transition-colors">
                  <Trash2 size={18} />
                </div>
                <div className="flex flex-col items-start">
                  <span className="font-black text-[11px] uppercase tracking-widest">Excluir</span>
                  <span className="text-[10px] font-bold text-gray-400">Remover permanentemente</span>
                </div>
              </button>
            </div>
          </>
        ) : (
          <div className="p-8 flex flex-col items-center text-center">
            <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mb-6">
              <AlertTriangle size={32} className="text-red-500" />
            </div>
            <h3 className="text-xl font-black text-[#1a2b4b] mb-2">Excluir?</h3>
            <p className="text-sm font-bold text-[#bac4d1] mb-8">
              Você realmente deseja apagar esse agendamento? Esta ação não pode ser desfeita.
            </p>
            
            <div className="w-full space-y-3">
              <button 
                onClick={() => { onDelete(); setShowConfirm(false); onClose(); }}
                className="w-full py-4 bg-red-500 text-white rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-red-600 transition-colors shadow-lg shadow-red-500/20"
              >
                Sim, Apagar
              </button>
              <button 
                onClick={() => setShowConfirm(false)}
                className="w-full py-4 text-[#bac4d1] font-black text-sm uppercase tracking-widest hover:text-[#1a2b4b] transition-colors"
              >
                Cancelar
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
