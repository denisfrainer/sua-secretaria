'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Plus, 
  Loader2, 
  Scissors, 
  ArrowLeft,
  LayoutGrid,
  Search,
  Filter
} from 'lucide-react';
import { ServiceCard } from '@/components/services/ServiceCard';
import { ServiceDrawer } from '@/components/services/ServiceDrawer';

// ==============================================================
// TYPES
// ==============================================================

interface Service {
  id: string;
  name: string;
  description: string;
  price: number;
  duration: number;
  status: 'active' | 'inactive';
}

interface BusinessConfig {
  id: number;
  owner_id: string;
  context_json: {
    services: Service[];
    [key: string]: any;
  };
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.05 }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4 } }
};

import { MinimalistHeader } from '@/components/dashboard/MinimalistHeader';

export default function CatalogPage() {
  const supabase = createClient();
  const router = useRouter();

  const [config, setConfig] = useState<BusinessConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return;
      }

      const { data, error } = await supabase
        .from('business_config')
        .select('*')
        .eq('owner_id', user.id)
        .maybeSingle();

      if (data) {
        // Ensure services have IDs and proper types
        const normalizedServices = (data.context_json?.services || []).map((s: any) => ({
          id: s.id || crypto.randomUUID(),
          name: s.name || '',
          description: s.description || '',
          price: typeof s.price === 'string' ? parseFloat(s.price.replace(/[^\d.-]/g, '')) || 0 : s.price || 0,
          duration: typeof s.duration === 'string' ? parseInt(s.duration.replace(/[^\d]/g, '')) || 30 : s.duration || 30,
          status: s.status || 'active'
        }));
        
        setConfig({
          ...data,
          context_json: {
            ...(data.context_json || {}),
            services: normalizedServices
          }
        });
      }
      setLoading(false);
    }
    fetchData();
  }, [supabase, router]);

  const handleSaveService = async (formData: any) => {
    if (!config) return;
    setSaving(true);

    try {
      let newServices = [...(config.context_json?.services || [])];
      
      if (editingService) {
        // Update existing
        newServices = newServices.map(s => 
          s.id === editingService.id ? { ...formData, id: s.id } : s
        );
      } else {
        // Add new
        newServices.push({ ...formData, id: crypto.randomUUID() });
      }

      const { error } = await supabase
        .from('business_config')
        .update({
          context_json: {
            ...config.context_json,
            services: newServices
          },
          updated_at: new Date().toISOString()
        })
        .eq('id', config.id);

      if (error) throw error;

      setConfig({
        ...config,
        context_json: { ...config.context_json, services: newServices }
      });
      setIsDrawerOpen(false);
      setEditingService(null);
    } catch (err) {
      console.error('Error saving service:', err);
      alert('Erro ao salvar serviço');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteService = async (id: string) => {
    if (!config) return;
    setSaving(true);

    try {
      const newServices = config.context_json.services.filter(s => s.id !== id);

      const { error } = await supabase
        .from('business_config')
        .update({
          context_json: {
            ...config.context_json,
            services: newServices
          },
          updated_at: new Date().toISOString()
        })
        .eq('id', config.id);

      if (error) throw error;

      setConfig({
        ...config,
        context_json: { ...config.context_json, services: newServices }
      });
      setIsDrawerOpen(false);
      setEditingService(null);
    } catch (err) {
      console.error('Error deleting service:', err);
      alert('Erro ao excluir serviço');
    } finally {
      setSaving(false);
    }
  };

  const filteredServices = config?.context_json.services.filter(s => 
    s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.description.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Loader2 className="animate-spin text-blue-600" size={32} />
        <p className="text-sm font-bold text-gray-400 uppercase tracking-widest">Carregando catálogo...</p>
      </div>
    );
  }

  if (!config) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6 text-center px-6">
        <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center">
          <Scissors size={32} className="text-gray-300" />
        </div>
        <div className="space-y-2">
          <h2 className="text-xl font-black text-gray-900 tracking-tight">Configuração Necessária</h2>
          <p className="text-sm font-medium text-gray-500 max-w-xs mx-auto">
            Defina o nome da sua empresa nas configurações básicas antes de gerenciar seus serviços.
          </p>
        </div>
        <button 
          onClick={() => router.push('/dashboard/settings/studio')}
          className="px-8 py-4 bg-black text-white rounded-2xl font-black text-xs uppercase tracking-widest active:scale-95 transition-all shadow-xl shadow-black/10"
        >
          Configurar Empresa
        </button>
      </div>
    );
  }

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="flex flex-col gap-2 pb-32 overflow-x-hidden"
    >
      <MinimalistHeader title="Catálogo de Serviços" />
      
      {/* Header Section */}
      <header className="flex flex-col gap-6 mt-4">
        <div className="flex items-center justify-end">
          <div className="flex items-center gap-2 px-4 py-2 bg-white shadow-sm border border-black/5 rounded-2xl">
            <LayoutGrid size={14} className="text-blue-600" />
            <span className="text-[10px] font-black text-gray-900 uppercase tracking-widest">
              {config.context_json?.services?.length || 0} Serviços
            </span>
          </div>
        </div>

        <div className="space-y-1">
          <p className="text-base font-medium text-gray-500">Gerencie os procedimentos e valores do seu negócio.</p>
        </div>

        {/* Search & Action Bar */}
        <div className="flex items-center gap-3">
          <div className="relative flex-1 group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-600 transition-colors" size={18} />
            <input 
              type="text" 
              placeholder="Buscar serviço..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-4 bg-white border border-black/5 rounded-2xl text-sm font-medium outline-none focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500/20 transition-all shadow-sm"
            />
          </div>
          <button 
            onClick={() => {
              setEditingService(null);
              setIsDrawerOpen(true);
            }}
            className="w-14 h-14 bg-black text-white rounded-2xl flex items-center justify-center shadow-xl shadow-black/10 active:scale-95 transition-all hover:bg-gray-900 shrink-0"
          >
            <Plus size={24} />
          </button>
        </div>
      </header>

      {/* Services Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <AnimatePresence mode="popLayout">
          {filteredServices.length > 0 ? (
            filteredServices.map((service) => (
              <motion.div key={service.id} variants={itemVariants} layout>
                <ServiceCard 
                  service={service} 
                  onEdit={() => {
                    setEditingService(service);
                    setIsDrawerOpen(true);
                  }}
                />
              </motion.div>
            ))
          ) : (
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }}
              className="col-span-full py-20 text-center space-y-4 bg-gray-50/50 rounded-[40px] border border-dashed border-gray-200"
            >
              <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center mx-auto shadow-sm border border-black/5">
                <Search size={24} className="text-gray-300" />
              </div>
              <p className="text-sm font-bold text-gray-400 uppercase tracking-widest">
                {searchQuery ? 'Nenhum serviço encontrado' : 'Seu catálogo está vazio'}
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Drawer */}
      <ServiceDrawer 
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        service={editingService}
        onSave={handleSaveService}
        onDelete={handleDeleteService}
        saving={saving}
      />
    </motion.div>
  );
}
