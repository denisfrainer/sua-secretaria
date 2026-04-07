'use client';

import React, { useState, useEffect } from 'react';
import { Plus, Search, Filter, Loader2, ArrowLeft } from 'lucide-react';
import { ServiceCard } from '../../../components/services/ServiceCard';
import { ServiceDrawer } from '../../../components/services/ServiceDrawer';
import Link from 'next/link';

import { createClient } from '@/lib/supabase/client';

export default function ServicesPage() {
  const [services, setServices] = useState<any[]>([]);
  const [configId, setConfigId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [editingService, setEditingService] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const supabase = createClient();

  const fetchServices = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: configData, error: configError } = await supabase
        .from('business_config')
        .select('id, context_json')
        .eq('owner_id', user.id)
        .single();

      if (configError) throw configError;

      if (configData) {
        setConfigId(configData.id);
        const servicesList = (configData.context_json as any).services || [];
        setServices(servicesList);
      }
    } catch (err: any) {
      console.error('❌ [SERVICES] Fetch error:', err.message);
      setError('Falha ao carregar serviços.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchServices();
  }, []);

  const handleSave = async (formData: any) => {
    if (!configId) return;
    setSaving(true);
    try {
      let updatedServices = [...services];
      
      if (editingService) {
        // Update existing
        updatedServices = updatedServices.map(s => 
          s.id === editingService.id ? { ...formData, id: s.id } : s
        );
      } else {
        // Create new
        const newService = {
          ...formData,
          id: crypto.randomUUID()
        };
        updatedServices.push(newService);
      }

      const { data: currentConfig } = await supabase
        .from('business_config')
        .select('context_json')
        .eq('id', configId)
        .single();

      const newContext = {
        ...(currentConfig?.context_json as any),
        services: updatedServices
      };

      const { error: updateError } = await supabase
        .from('business_config')
        .update({ context_json: newContext })
        .eq('id', configId);

      if (updateError) throw updateError;

      setServices(updatedServices);
      setIsDrawerOpen(false);
    } catch (err: any) {
      console.error('❌ [SERVICES] Save error:', err.message);
      setError('Falha ao salvar serviço.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (serviceId: string) => {
    if (!configId) return;
    try {
      const updatedServices = services.filter(s => s.id !== serviceId);
      
      const { data: currentConfig } = await supabase
        .from('business_config')
        .select('context_json')
        .eq('id', configId)
        .single();

      const newContext = {
        ...(currentConfig?.context_json as any),
        services: updatedServices
      };

      const { error: updateError } = await supabase
        .from('business_config')
        .update({ context_json: newContext })
        .eq('id', configId);

      if (updateError) throw updateError;

      setServices(updatedServices);
      setIsDrawerOpen(false);
    } catch (err: any) {
      console.error('❌ [SERVICES] Delete error:', err.message);
      setError('Falha ao excluir serviço.');
    }
  };

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
        onSave={handleSave}
        onDelete={handleDelete}
        saving={saving}
      />
    </div>
  );
}
