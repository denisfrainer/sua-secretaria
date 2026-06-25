'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Settings2, 
  MessageSquarePlus, 
  Clock, 
  Plus,
  Trash2,
  Info
} from 'lucide-react';

interface Bubble {
  id: string;
  text: string;
}

interface Combo {
  id: string;
  bubbles: Bubble[];
}

export const OutreachManager = () => {
  const [isActive, setIsActive] = useState(false);
  const [dailyLimit, setDailyLimit] = useState(80);
  const [cooldown, setCooldown] = useState({ min: 8, max: 15 });
  const [huntDays, setHuntDays] = useState(['SEG', 'TER', 'QUA', 'QUI', 'SEX']);
  
  const [combos, setCombos] = useState<Combo[]>([
    {
      id: 'combo-1',
      bubbles: [
        { id: 'b1', text: '{Bom dia|Boa tarde}, tudo bem? Me chamo Denis.' },
        { id: 'b2', text: 'Vocês trabalham com algum sistema de agendamento?' }
      ]
    }
  ]);

  const toggleDay = (day: string) => {
    if (huntDays.includes(day)) {
      setHuntDays(huntDays.filter(d => d !== day));
    } else {
      setHuntDays([...huntDays, day]);
    }
  };

  const addCombo = () => {
    setCombos([...combos, { id: `combo-${Date.now()}`, bubbles: [{ id: `b-${Date.now()}`, text: '' }] }]);
  };

  const removeCombo = (id: string) => {
    setCombos(combos.filter(c => c.id !== id));
  };

  const addBubble = (comboId: string) => {
    setCombos(combos.map(combo => {
      if (combo.id === comboId && combo.bubbles.length < 3) {
        return {
          ...combo,
          bubbles: [...combo.bubbles, { id: `b-${Date.now()}`, text: '' }]
        };
      }
      return combo;
    }));
  };

  const removeBubble = (comboId: string, bubbleId: string) => {
    setCombos(combos.map(combo => {
      if (combo.id === comboId) {
        return {
          ...combo,
          bubbles: combo.bubbles.filter(b => b.id !== bubbleId)
        };
      }
      return combo;
    }));
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6 animate-in fade-in duration-700">
      
      {/* HEADER: Kill Switch & Status */}
      <motion.div 
        initial={{ y: -10, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="bg-white rounded-3xl p-6 lg:p-8 shadow-sm border border-slate-100 flex flex-col md:flex-row items-center justify-between gap-6"
      >
        <div className="flex items-center gap-5">
          <button 
            onClick={() => setIsActive(!isActive)}
            className={`relative inline-flex h-14 w-24 items-center rounded-full transition-colors focus:outline-none ${isActive ? 'bg-emerald-500' : 'bg-slate-200'}`}
          >
            <span className={`block h-10 w-10 transform rounded-full bg-white transition-transform shadow-sm ${isActive ? 'translate-x-12' : 'translate-x-2'}`} />
          </button>
          <div>
            <h2 className="text-2xl font-black tracking-tight text-slate-900">Motor de Prospecção</h2>
            <div className="flex items-center gap-2 mt-1">
              <span className="relative flex h-2.5 w-2.5">
                {isActive && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>}
                <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${isActive ? 'bg-emerald-500' : 'bg-slate-400'}`}></span>
              </span>
              <span className="text-sm font-bold text-slate-500 uppercase tracking-widest">
                {isActive ? 'Ativo e Caçando' : 'Hibernando'}
              </span>
            </div>
          </div>
        </div>

        <div className="flex gap-4">
          <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Disparos Hoje</p>
            <p className="text-2xl font-black text-slate-900 tracking-tighter">45 <span className="text-sm font-bold text-slate-400">/ {dailyLimit}</span></p>
          </div>
          <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 min-w-[140px]">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Próxima Caçada</p>
            <p className="text-2xl font-black text-slate-900 tracking-tighter">{isActive ? '14:35' : '--:--'}</p>
          </div>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* SECTION 1: O Arsenal (Combos) */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between px-2">
            <h3 className="text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <MessageSquarePlus className="text-slate-400" size={20} />
              O Arsenal (Scripts)
            </h3>
            <button 
              onClick={addCombo}
              className="text-xs font-bold text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-full hover:bg-emerald-100 transition-colors flex items-center gap-1"
            >
              <Plus size={14} /> Novo Combo
            </button>
          </div>

          <div className="space-y-4">
            {combos.map((combo, index) => (
              <motion.div 
                key={combo.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100"
              >
                <div className="flex justify-between items-center mb-4">
                  <span className="text-xs font-bold bg-slate-100 text-slate-600 px-3 py-1 rounded-full uppercase tracking-widest">
                    Combo {index + 1}
                  </span>
                  <button onClick={() => removeCombo(combo.id)} className="text-slate-400 hover:text-rose-500 transition-colors">
                    <Trash2 size={16} />
                  </button>
                </div>

                <div className="space-y-3">
                  {combo.bubbles.map((bubble, bIndex) => (
                    <div key={bubble.id} className="relative flex items-start gap-4">
                      {/* Timeline indicator */}
                      <div className="flex flex-col items-center mt-2">
                        <div className="w-6 h-6 rounded-full bg-emerald-100 flex items-center justify-center text-xs font-bold text-emerald-700 z-10">
                          {bIndex + 1}
                        </div>
                        {bIndex < combo.bubbles.length - 1 && (
                          <div className="w-0.5 h-full bg-slate-100 absolute top-8 bottom-[-16px]"></div>
                        )}
                      </div>

                      <div className="flex-1 space-y-2">
                        <textarea
                          placeholder="Digite a mensagem..."
                          className="w-full bg-slate-50 border border-slate-100 rounded-2xl p-4 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all resize-none h-20"
                          defaultValue={bubble.text}
                        />
                        {bIndex < combo.bubbles.length - 1 && (
                          <div className="text-[10px] font-bold text-slate-400 flex items-center gap-1 ml-2">
                            <Clock size={12} /> Delay: 2-4 segundos simulando digitação
                          </div>
                        )}
                        <button 
                            onClick={() => removeBubble(combo.id, bubble.id)} 
                            className="absolute top-2 right-2 text-slate-300 hover:text-rose-400 transition-colors p-2"
                        >
                            <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                  
                  {combo.bubbles.length < 3 && (
                    <div className="pl-10 pt-2">
                      <button 
                        onClick={() => addBubble(combo.id)}
                        className="text-[11px] font-bold text-slate-500 flex items-center gap-1 hover:text-slate-800 transition-colors border border-slate-200 border-dashed rounded-xl px-4 py-2 w-full justify-center"
                      >
                        <Plus size={14} /> Adicionar Bolha
                      </button>
                    </div>
                  )}
                </div>
                
                <div className="mt-4 pt-4 border-t border-slate-50 flex items-center gap-2 text-[11px] text-slate-400 font-medium bg-slate-50 p-3 rounded-xl">
                  <Info size={14} className="text-indigo-400" />
                  <span>Dica de Spintax: Use <strong className="text-indigo-500 font-mono">{"{Oi|Olá|Bom dia}"}</strong> para rotacionar variações e evitar bloqueios.</span>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* SECTION 2: Motor de Cadência */}
        <div className="space-y-4">
          <h3 className="text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2 px-2">
            <Settings2 className="text-slate-400" size={20} />
            Cadência (Anti-ban)
          </h3>

          <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 space-y-6">
            
            {/* Daily Limit */}
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Limite Diário</label>
                <span className="text-sm font-black text-slate-900">{dailyLimit} leads</span>
              </div>
              <input 
                type="range" 
                min="10" 
                max="200" 
                value={dailyLimit}
                onChange={(e) => setDailyLimit(Number(e.target.value))}
                className="w-full accent-emerald-500"
              />
            </div>

            {/* Cooldown */}
            <div className="space-y-3 pt-4 border-t border-slate-50">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-widest block">Janela de Disparo (Minutos)</label>
              <div className="flex items-center gap-3">
                <div className="flex-1 bg-slate-50 border border-slate-100 rounded-xl px-4 py-3">
                  <span className="text-[10px] text-slate-400 block font-bold mb-1">MÍNIMO</span>
                  <input type="number" value={cooldown.min} onChange={(e) => setCooldown({...cooldown, min: Number(e.target.value)})} className="w-full bg-transparent font-black tracking-tighter text-lg focus:outline-none" />
                </div>
                <span className="text-slate-300 font-bold">-</span>
                <div className="flex-1 bg-slate-50 border border-slate-100 rounded-xl px-4 py-3">
                  <span className="text-[10px] text-slate-400 block font-bold mb-1">MÁXIMO</span>
                  <input type="number" value={cooldown.max} onChange={(e) => setCooldown({...cooldown, max: Number(e.target.value)})} className="w-full bg-transparent font-black tracking-tighter text-lg focus:outline-none" />
                </div>
              </div>
            </div>

            {/* Days Selection */}
            <div className="space-y-3 pt-4 border-t border-slate-50">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-widest block">Dias de Caçada</label>
              <div className="flex flex-wrap gap-2">
                {['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SAB'].map(day => (
                  <button
                    key={day}
                    onClick={() => toggleDay(day)}
                    className={`w-10 h-10 rounded-xl text-[10px] font-bold flex items-center justify-center transition-all ${
                      huntDays.includes(day) 
                        ? 'bg-slate-900 text-white shadow-md' 
                        : 'bg-slate-50 text-slate-400 border border-slate-100'
                    }`}
                  >
                    {day}
                  </button>
                ))}
              </div>
            </div>

            {/* Business Hours */}
            <div className="space-y-3 pt-4 border-t border-slate-50">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-widest block">Horário de Operação</label>
              <div className="flex items-center gap-3">
                <div className="flex-1 bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 flex items-center gap-2">
                  <Clock size={16} className="text-slate-400" />
                  <input type="time" defaultValue="08:00" className="w-full bg-transparent font-bold text-sm focus:outline-none text-slate-700" />
                </div>
                <div className="flex-1 bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 flex items-center gap-2">
                  <Clock size={16} className="text-slate-400" />
                  <input type="time" defaultValue="18:00" className="w-full bg-transparent font-bold text-sm focus:outline-none text-slate-700" />
                </div>
              </div>
            </div>

          </div>

          <button className="w-full bg-slate-900 text-white font-bold tracking-tight rounded-2xl py-4 shadow-xl hover:bg-slate-800 transition-all hover:-translate-y-0.5 active:translate-y-0 active:shadow-sm">
            Salvar Configurações
          </button>
        </div>
      </div>
      
    </div>
  );
};
