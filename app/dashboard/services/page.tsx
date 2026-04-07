'use client';

import React, { useState, useEffect } from 'react';
import { Plus, Search, Filter, Loader2, ArrowLeft } from 'lucide-react';
import { ServiceCard } from '@/components/services/ServiceCard';
import { ServiceDrawer } from '@/components/services/ServiceDrawer';
import Link from 'next/link';

// Mock Data for MVP
const MOCK_SERVICES = [
  { id: '1', name: 'Corte de Cabelo Masculino', description: 'Corte degradê moderno com finalização.', price: 50, duration: 30, status: 'active' },
  { id: '2', name: 'Barba Completa', description: 'Barba com toalha quente e óleos essenciais.', price: 40, duration: 30, status: 'active' },
  { id: '3', name: 'Combo Corte + Barba', description: 'Corte e barba com desconto especial.', price: 80, duration: 60, status: 'active' },
  { id: '4', name: 'Luzes / Mechas', description: 'Coloração profissional.', price: 150, duration: 120, status: 'inactive' },
];

export default function ServicesPage() {
  const [services, setServices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [editingService, setEditingService] = useState<any>(null);

  useEffect(() => {
    console.log('📡 [SERVICES] Fetching services list...');
    // Simulate API fetch
    const timer = setTimeout(() => {
      setServices(MOCK_SERVICES);
      setLoading(false);
    }, 800);
    return () => clearTimeout(timer);
  }, []);

  const handleCreate = () => {
    console.log('➕ [SERVICES] Opening create drawer');
    setEditingService(null);
    setIsDrawerOpen(true);
  };

  const handleEdit = (service: any) => {
    console.log('📝 [SERVICES] Opening edit drawer for:', service.id);
    setEditingService(service);
    setIsDrawerOpen(true);
  };

  return (
    <div className="w-full max-w-4xl px-4 py-8 flex flex-col gap-8 mx-auto animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col gap-4">
        <Link 
          href="/dashboard" 
          className="flex items-center gap-2 text-sm font-bold text-gray-400 hover:text-black transition-colors w-fit"
        >
          <ArrowLeft size={16} />
          Voltar ao Dashboard
        </Link>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex flex-col gap-1">
            <h1 className="text-3xl font-black tracking-tight text-gray-900">Serviços</h1>
            <p className="text-gray-500 font-medium">Gerencie o catálogo de serviços oferecidos pela sua IA.</p>
          </div>
          <button
            onClick={handleCreate}
            className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-2xl shadow-lg shadow-blue-500/20 text-sm font-bold hover:bg-blue-700 active:scale-95 transition-all"
          >
            <Plus size={18} />
            Novo Serviço
          </button>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex items-center gap-4 bg-white p-2 rounded-2xl border border-black/5 shadow-sm">
        <div className="flex-1 relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input 
            type="text" 
            placeholder="Buscar serviço..." 
            className="w-full pl-11 pr-4 py-2 bg-transparent text-sm font-medium outline-none placeholder:text-gray-400"
          />
        </div>
        <button className="p-2 text-gray-400 hover:text-black transition-colors">
          <Filter size={18} />
        </button>
      </div>

      {/* Services List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {loading ? (
          <div className="col-span-full py-20 flex flex-col items-center justify-center gap-4">
            <Loader2 className="animate-spin text-blue-600" size={32} />
            <p className="text-sm font-bold text-gray-400">Carregando serviços...</p>
          </div>
        ) : services.length > 0 ? (
          services.map((service) => (
            <ServiceCard 
              key={service.id} 
              service={service} 
              onEdit={() => handleEdit(service)} 
            />
          ))
        ) : (
          <div className="col-span-full py-20 text-center border-2 border-dashed border-gray-100 rounded-3xl flex flex-col items-center gap-4">
            <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center">
              <Plus className="text-gray-300" />
            </div>
            <p className="text-sm font-medium text-gray-400">Nenhum serviço cadastrado ainda.</p>
          </div>
        )}
      </div>

      <ServiceDrawer 
        isOpen={isDrawerOpen} 
        onClose={() => setIsDrawerOpen(false)} 
        service={editingService} 
      />
    </div>
  );
}
