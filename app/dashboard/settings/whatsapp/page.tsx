'use client';

import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { 
  MessageSquare, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  RefreshCw,
  LogOut,
  ShieldCheck
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import QRCodeDisplay from '@/components/QRCodeDisplay';

export default function WhatsAppSettingsPage() {
  const [config, setConfig] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [disconnecting, setDisconnecting] = useState(false);
  const supabase = createClient();

  const fetchStatus = useCallback(async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data } = await supabase
        .from('business_config')
        .select('*')
        .eq('owner_id', user.id)
        .maybeSingle();
      setConfig(data);
    }
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  const handleInitializeInstance = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const businessName = user.user_metadata?.business_name || 'Minha Empresa';
      const slug = businessName.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "");
      const instanceName = `${slug || 'studio'}-${Math.floor(1000 + Math.random() * 9000)}`;

      // 1. Initialize instance via Evolution wrapper
      const initRes = await fetch('/api/instance/initialize', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ instanceName })
      });
      
      if (!initRes.ok) throw new Error("Erro ao inicializar IA.");

      // 2. Update or Insert business_config
      if (config) {
        await supabase
          .from('business_config')
          .update({ instance_name: instanceName })
          .eq('id', config.id);
      } else {
        await supabase
          .from('business_config')
          .insert({
            owner_id: user.id,
            instance_name: instanceName,
            context_json: {
              connection_status: "DISCONNECTED",
              business_info: { name: businessName, address: "", parking: "", handoff_phone: "" },
              operating_hours: {
                weekdays: { open: "09:00", close: "18:00", is_closed: false },
                saturday: { open: "09:00", close: "13:00", is_closed: false },
                sunday: { open: "00:00", close: "00:00", is_closed: true },
                observations: ""
              },
              services: [], faq: []
            }
          });
      }
      
      await fetchStatus();
    } catch (error) {
      console.error('Failed to initialize instance:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDisconnect = async () => {
    if (!config?.instance_name) return;
    setDisconnecting(true);
    try {
      // 1. Call Backend to logout/delete instance
      await fetch(`/api/instance/logout?instance=${config.instance_name}`, { method: 'POST' });
      
      // 2. Update Supabase
      const newContext = { ...config.context_json, connection_status: 'DISCONNECTED' };
      await supabase
        .from('business_config')
        .update({ context_json: newContext })
        .eq('id', config.id);
      
      await fetchStatus();
    } catch (error) {
      console.error('Failed to disconnect WhatsApp:', error);
    } finally {
      setDisconnecting(false);
    }
  };

  if (loading) return <div className="flex justify-center p-12"><Loader2 className="animate-spin text-blue-600 opacity-20" size={32} /></div>;

  const isConnected = config?.context_json?.connection_status === 'CONNECTED';

  return (
    <div className="flex flex-col gap-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-32">
      
      {/* Header Info */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-600 border border-blue-500/10">
            <MessageSquare size={20} />
          </div>
          <h2 className="text-xl font-black text-gray-900 tracking-tight">Conexão com WhatsApp</h2>
        </div>
        <p className="text-sm font-medium text-gray-500 max-w-lg">
          Vincule seu WhatsApp para que a IA Eliza possa atender seus clientes, tirar dúvidas e realizar agendamentos automaticamente.
        </p>
      </div>

      <AnimatePresence mode="wait">
        {isConnected ? (
          <motion.div 
            key="connected"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="w-full max-w-md mx-auto"
          >
            <div className="bg-white rounded-[2.5rem] border border-black/5 shadow-sm p-8 flex flex-col items-center text-center gap-6 relative overflow-hidden">
               {/* Success Decor */}
               <div className="absolute top-0 right-0 w-32 h-32 bg-green-50 rounded-full blur-3xl opacity-50 -mr-16 -mt-16" />
               
               <div className="w-20 h-20 rounded-[2rem] bg-green-500 flex items-center justify-center shadow-xl shadow-green-500/20 z-10">
                 <CheckCircle2 size={40} className="text-white" />
               </div>

               <div className="flex flex-col gap-1 z-10">
                 <h3 className="text-2xl font-black text-gray-900 tracking-tight">WhatsApp Ativo</h3>
                 <div className="flex items-center justify-center gap-2 text-xs font-black text-green-600 uppercase tracking-widest bg-green-50 px-4 py-1.5 rounded-full border border-green-100">
                    <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                    Conexão Estável
                 </div>
               </div>

               <p className="text-sm font-medium text-gray-400 max-w-[240px] leading-relaxed">
                 Sua instância <span className="font-bold text-gray-600">@{config?.instance_name}</span> está operando normalmente.
               </p>

               <div className="w-full pt-4 flex flex-col gap-3 border-t border-black/5">
                 <div className="flex items-center justify-center gap-2 text-[10px] font-black text-gray-300 uppercase tracking-widest">
                   <ShieldCheck size={14} />
                   Mensagens Criptografadas
                 </div>
                 
                 <button
                   onClick={handleDisconnect}
                   disabled={disconnecting}
                   className="w-full h-14 rounded-2xl bg-red-50 text-red-500 font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-red-100 transition-all active:scale-95 disabled:opacity-50"
                 >
                   {disconnecting ? <Loader2 className="animate-spin" size={16} /> : <LogOut size={16} />}
                   Desconectar WhatsApp
                 </button>
               </div>
            </div>
          </motion.div>
        ) : !config?.instance_name ? (
          <motion.div 
            key="no-instance"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="w-full max-w-sm mx-auto bg-white rounded-[2.5rem] border border-dashed border-gray-200 p-10 flex flex-col items-center text-center gap-6"
          >
            <div className="w-16 h-16 rounded-2xl bg-gray-50 flex items-center justify-center text-gray-300">
              <RefreshCw size={32} />
            </div>
            <div className="flex flex-col gap-2">
              <h3 className="text-lg font-black text-gray-900 tracking-tight">Infraestrutura Pendente</h3>
              <p className="text-sm font-medium text-gray-400">
                Você ainda não gerou sua instância de IA. Clique abaixo para construir seu terminal exclusivo.
              </p>
            </div>
            <button 
              onClick={handleInitializeInstance}
              className="w-full h-14 bg-blue-600 text-white font-black text-xs uppercase tracking-widest rounded-2xl shadow-lg shadow-blue-600/20 active:scale-95 transition-all"
            >
              Gerar Terminal de IA
            </button>
          </motion.div>
        ) : (
          <motion.div 
            key="qr"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <QRCodeDisplay 
              instanceName={config.instance_name} 
              onConnected={fetchStatus}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Troubleshooting Section */}
      {!isConnected && (
        <div className="bg-blue-50/50 border border-blue-100/50 rounded-3xl p-6 flex items-start gap-4 max-w-lg">
          <AlertCircle className="text-blue-500 shrink-0" size={20} />
          <div className="flex flex-col gap-1">
            <h4 className="text-sm font-black text-blue-900 tracking-tight">Problemas com o QR Code?</h4>
            <p className="text-xs font-medium text-blue-600/80 leading-relaxed">
              Certifique-se de que seu celular está conectado à internet. Se o código demorar para carregar, clique no botão "Reiniciar Instância" dentro da área do QR Code.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
