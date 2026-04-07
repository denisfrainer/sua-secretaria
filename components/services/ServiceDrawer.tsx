'use client';

import React, { useState, useEffect } from 'react';
import { Drawer } from 'vaul';
import { X, Save, Trash2, Clock, DollarSign, Edit3, CheckCircle2, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface Service {
  id: string;
  name: string;
  description: string;
  price: number;
  duration: number;
  status: 'active' | 'inactive';
}

export function ServiceDrawer({ 
  isOpen, 
  onClose, 
  service,
  onSave,
  onDelete,
  saving: externalSaving
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  service?: Service | null;
  onSave: (data: any) => void;
  onDelete: (id: string) => void;
  saving?: boolean;
}) {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    duration: 30,
    price: 0,
    status: 'active' as 'active' | 'inactive',
  });

  const [showConfirmDelete, setShowConfirmDelete] = useState(false);

  useEffect(() => {
    if (service) {
      setFormData({
        name: service.name,
        description: service.description,
        duration: service.duration,
        price: service.price,
        status: service.status,
      });
    } else {
      setFormData({
        name: '',
        description: '',
        duration: 30,
        price: 0,
        status: 'active',
      });
    }
  }, [service, isOpen]);

  const handleSave = () => {
    onSave(formData);
  };

  const handleDelete = () => {
    if (service?.id) {
      onDelete(service.id);
    }
    setShowConfirmDelete(false);
  };

  return (
    <Drawer.Root open={isOpen} onOpenChange={onClose} direction="right">
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100]" />
        <Drawer.Content 
          className="fixed top-0 right-0 bottom-0 w-full max-w-[420px] bg-white border-l border-black/5 z-[101] shadow-2xl flex flex-col outline-none"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-black/5">
            <div className="flex flex-col">
              <h2 className="text-xl font-black text-gray-900 tracking-tight">
                {service ? 'Editar Serviço' : 'Novo Serviço'}
              </h2>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">
                {service ? `ID: ${service.id}` : 'Complete os dados abaixo'}
              </p>
            </div>
            <button 
              onClick={onClose} 
              className="p-2.5 rounded-xl bg-gray-50 text-gray-400 hover:text-black hover:bg-gray-100 transition-all"
            >
              <X size={20} />
            </button>
          </div>

          {/* Form Content */}
          <div className="flex-1 overflow-y-auto p-6 space-y-8 scroll-smooth">
            {/* Main Info */}
            <section className="space-y-4">
              <div className="flex items-center gap-2 text-blue-600">
                <Edit3 size={16} />
                <h3 className="text-xs font-black uppercase tracking-widest">Informações Básicas</h3>
              </div>
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-bold text-gray-600">Nome do Serviço</label>
                  <input 
                    type="text" 
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Ex: Corte Moderno"
                    className="w-full px-4 py-3 bg-gray-50 border border-black/5 rounded-2xl text-sm font-medium outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-bold text-gray-600">Descrição</label>
                  <textarea 
                    rows={3} 
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="O que está incluso?"
                    className="w-full px-4 py-3 bg-gray-50 border border-black/5 rounded-2xl text-sm font-medium outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all resize-none"
                  />
                </div>
              </div>
            </section>

            {/* Price & Duration */}
            <section className="space-y-4">
              <div className="flex items-center gap-2 text-blue-600">
                <DollarSign size={16} />
                <h3 className="text-xs font-black uppercase tracking-widest">Preço & Tempo</h3>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-bold text-gray-600">Preço (R$)</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold">R$</span>
                    <input 
                      type="number" 
                      value={formData.price}
                      onChange={(e) => setFormData({ ...formData, price: Number(e.target.value) })}
                      className="w-full pl-11 pr-4 py-3 bg-gray-50 border border-black/5 rounded-2xl text-sm font-medium outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all" 
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-bold text-gray-600">Duração (min)</label>
                  <select 
                    value={formData.duration}
                    onChange={(e) => setFormData({ ...formData, duration: Number(e.target.value) })}
                    className="w-full px-4 py-3 bg-gray-50 border border-black/5 rounded-2xl text-sm font-medium outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all appearance-none"
                  >
                    {[15, 30, 45, 60, 90, 120, 150, 180].map((t) => (
                      <option key={t} value={t}>{t} minutos</option>
                    ))}
                  </select>
                </div>
              </div>
            </section>

            {/* Status Toggle */}
            <section className="p-4 bg-gray-50 rounded-3xl border border-black/5 flex items-center justify-between">
              <div className="flex flex-col">
                <span className="text-sm font-black text-gray-900 tracking-tight">Status do Serviço</span>
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Disponível para agendamento</span>
              </div>
              <button 
                onClick={() => setFormData({ ...formData, status: formData.status === 'active' ? 'inactive' : 'active' })}
                className={`relative w-12 h-6 rounded-full transition-colors ${formData.status === 'active' ? 'bg-green-500' : 'bg-gray-200'}`}
              >
                <motion.div 
                  className="absolute top-1 left-1 w-4 h-4 rounded-full bg-white shadow-sm"
                  animate={{ x: formData.status === 'active' ? 24 : 0 }}
                  transition={{ type: "spring", stiffness: 500, damping: 30 }}
                />
              </button>
            </section>

            {/* Danger Zone */}
            {service && (
              <section className="pt-8 mt-8 border-t border-red-50 space-y-4">
                <div className="flex items-center gap-2 text-red-500">
                  <Trash2 size={16} />
                  <h3 className="text-xs font-black uppercase tracking-widest">Zona de Perigo</h3>
                </div>
                <div className="p-5 bg-red-50/50 rounded-3xl border border-red-100 flex flex-col gap-4">
                  <p className="text-xs font-bold text-red-600/70 leading-relaxed uppercase tracking-widest">
                    A exclusão deste serviço é permanente e removerá todos os vínculos com a IA.
                  </p>
                  <button 
                    onClick={() => setShowConfirmDelete(true)}
                    className="w-full py-3 bg-red-500/10 text-red-600 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-red-500 hover:text-white transition-all active:scale-95 border border-red-200"
                  >
                    Excluir Serviço
                  </button>
                </div>
              </section>
            )}
          </div>

          {/* Footer Actions */}
          <div className="p-6 border-t border-black/5 bg-gray-50/50 group">
            <button
              onClick={handleSave}
              disabled={externalSaving}
              className="w-full flex items-center justify-center gap-3 py-4 bg-black text-white rounded-2xl shadow-xl shadow-black/10 text-sm font-black active:scale-[0.98] transition-all hover:bg-gray-900 disabled:opacity-50 disabled:cursor-not-allowed uppercase tracking-wider"
            >
              {externalSaving ? (
                <>
                  <motion.div 
                    animate={{ rotate: 360 }}
                    transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
                  >
                    <Save size={18} />
                  </motion.div>
                  Salvando...
                </>
              ) : (
                <>
                  <Save size={18} />
                  Salvar Alterações
                </>
              )}
            </button>
          </div>

          {/* Delete Dialog Overlay (Mini Modal) */}
          <AnimatePresence>
            {showConfirmDelete && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 z-[110] bg-white flex flex-col items-center justify-center p-8 text-center"
              >
                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-6">
                  <AlertCircle size={32} className="text-red-500" />
                </div>
                <h3 className="text-xl font-black text-gray-900 mb-2">Tem certeza?</h3>
                <p className="text-sm font-bold text-gray-400 mb-8 uppercase tracking-widest leading-loose">
                  Esta ação não pode ser desfeita. O serviço será deletado do sistema.
                </p>
                <div className="w-full flex flex-col gap-3">
                  <button 
                    onClick={handleDelete}
                    className="w-full py-4 bg-red-500 text-white rounded-2xl text-xs font-black uppercase tracking-widest shadow-lg shadow-red-500/20 active:scale-95 transition-all"
                  >
                    Sim, Excluir Definitivamente
                  </button>
                  <button 
                    onClick={() => setShowConfirmDelete(false)}
                    className="w-full py-4 bg-gray-100 text-gray-500 rounded-2xl text-xs font-black uppercase tracking-widest active:scale-95 transition-all hover:bg-gray-200"
                  >
                    Cancelar
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}
