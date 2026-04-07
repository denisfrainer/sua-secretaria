'use client';

import React, { useState } from 'react';
import { X, Save, Clock, Coffee, Calendar, Check, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export function AgendaSettingsModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSave = () => {
    setSaving(true);
    console.log('⚙️ [AGENDA] Saving settings...');
    setTimeout(() => {
      setSaving(false);
      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        onClose();
      }, 1500);
    }, 1000);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-md"
          />
          
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="relative w-full max-w-[480px] bg-white rounded-[2.5rem] shadow-2xl shadow-black/20 overflow-hidden flex flex-col"
          >
            {/* Header */}
            <div className="p-8 pb-4 flex items-center justify-between">
              <div className="flex flex-col gap-1">
                <h2 className="text-2xl font-black text-gray-900 tracking-tight">Configurações</h2>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Defina sua rotina de trabalho</p>
              </div>
              <button 
                onClick={onClose}
                className="p-3 bg-gray-50 text-gray-400 hover:text-black hover:bg-gray-100 rounded-2xl transition-all"
              >
                <X size={20} />
              </button>
            </div>

            {/* Content */}
            <div className="p-8 pt-4 space-y-8 max-h-[60vh] overflow-y-auto scrollbar-hide">
              {/* Working Hours */}
              <section className="space-y-4">
                <div className="flex items-center gap-2 text-blue-600">
                  <Clock size={16} />
                  <h3 className="text-xs font-black uppercase tracking-widest leading-none">Horário de Atendimento</h3>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Início</label>
                    <input type="time" defaultValue="08:00" className="w-full p-4 bg-gray-50 border border-black/5 rounded-2xl text-sm font-black outline-none focus:ring-2 focus:ring-blue-500/20" />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Fim</label>
                    <input type="time" defaultValue="18:00" className="w-full p-4 bg-gray-50 border border-black/5 rounded-2xl text-sm font-black outline-none focus:ring-2 focus:ring-blue-500/20" />
                  </div>
                </div>
              </section>

              {/* Lunch Break */}
              <section className="space-y-4">
                <div className="flex items-center gap-2 text-orange-500">
                  <Coffee size={16} />
                  <h3 className="text-xs font-black uppercase tracking-widest leading-none">Intervalo / Almoço</h3>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Início</label>
                    <input type="time" defaultValue="12:00" className="w-full p-4 bg-gray-50 border border-black/5 rounded-2xl text-sm font-black outline-none focus:ring-2 focus:ring-orange-500/20" />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Fim</label>
                    <input type="time" defaultValue="13:30" className="w-full p-4 bg-gray-50 border border-black/5 rounded-2xl text-sm font-black outline-none focus:ring-2 focus:ring-orange-500/20" />
                  </div>
                </div>
              </section>

              {/* Recurring Blocks */}
              <section className="space-y-4 p-6 bg-gray-50 rounded-3xl border border-black/5">
                <div className="flex items-center gap-2 text-gray-400">
                  <Calendar size={16} />
                  <h3 className="text-xs font-black uppercase tracking-widest leading-none">Bloqueios Recorrentes</h3>
                </div>
                <p className="text-[10px] font-bold text-gray-400 leading-relaxed uppercase tracking-widest">
                  Estes horários serão automaticamente bloqueados em todos os dias da semana.
                </p>
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between p-3 bg-white border border-black/5 rounded-xl">
                    <span className="text-xs font-black text-gray-900 tracking-tight">Faxina Semanal (Sáb)</span>
                    <button className="text-red-500 hover:scale-110 active:scale-95 transition-all text-xs font-black uppercase">Remover</button>
                  </div>
                  <button className="w-full py-3 border-2 border-dashed border-gray-200 text-gray-300 rounded-xl text-xs font-black uppercase tracking-widest hover:border-blue-200 hover:text-blue-400 transition-all">
                    + Adicionar Bloqueio
                  </button>
                </div>
              </section>
            </div>

            {/* Footer */}
            <div className="p-8 pt-4 bg-gray-50/50 border-t border-black/5">
              <button
                onClick={handleSave}
                disabled={saving || success}
                className={`w-full flex items-center justify-center gap-3 py-4 rounded-3xl shadow-xl transition-all font-black uppercase tracking-widest text-sm ${
                  success 
                    ? 'bg-green-500 text-white' 
                    : 'bg-black text-white hover:bg-gray-900 active:scale-95'
                }`}
              >
                {saving ? (
                  <>
                    <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1 }}><Save size={18} /></motion.div>
                    Salvando...
                  </>
                ) : success ? (
                  <>
                    <Check size={18} />
                    Configurações Salvas
                  </>
                ) : (
                  <>
                    <Check size={18} />
                    Salvar Ajustes
                  </>
                )}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
