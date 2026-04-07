'use client';

import React from 'react';
import { Clock, DollarSign, ChevronRight } from 'lucide-react';
import { motion } from 'framer-motion';

interface Service {
  id: string;
  name: string;
  description: string;
  price: number;
  duration: number;
  status: 'active' | 'inactive';
}

export function ServiceCard({ service, onEdit }: { service: Service; onEdit: () => void }) {
  const isActive = service.status === 'active';

  return (
    <motion.div
      whileHover={{ y: -4, scale: 1.01 }}
      whileTap={{ scale: 0.98 }}
      onClick={onEdit}
      className={`relative p-6 bg-white rounded-3xl border border-black/5 shadow-sm group cursor-pointer transition-all hover:bg-gray-50/50 hover:border-black/10`}
    >
      <div className="flex flex-col gap-4">
        {/* Top Section: Name & Status */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-black text-gray-900 truncate tracking-tight">{service.name}</h3>
            <p className="text-sm text-gray-400 font-medium line-clamp-1">{service.description}</p>
          </div>
          <div 
            className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
              isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-400'
            }`}
          >
            {isActive ? 'Ativo' : 'Inativo'}
          </div>
        </div>

        {/* Bottom Section: Price & Duration */}
        <div className="flex items-center gap-6 pt-2 border-t border-black/5">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center">
              <DollarSign size={14} className="text-blue-600" />
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Preço</span>
              <span className="text-sm font-black text-gray-900">
                R$ {service.price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-purple-50 flex items-center justify-center">
              <Clock size={14} className="text-purple-600" />
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Duração</span>
              <span className="text-sm font-black text-gray-900">{service.duration} min</span>
            </div>
          </div>

          <div className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity translate-x-2 group-hover:translate-x-0">
            <ChevronRight size={20} className="text-gray-300" />
          </div>
        </div>
      </div>
    </motion.div>
  );
}
