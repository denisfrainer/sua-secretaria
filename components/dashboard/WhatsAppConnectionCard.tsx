'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import {
  Trash2,
  CheckCircle2,
  Loader2,
  Bot,
  QrCode,
  RefreshCw
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import QRCodeDisplay from '@/components/QRCodeDisplay';

interface DbState {
  id: string;
  instance_name: string | null;
  connection_status: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  context_json: any;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function extractDbState(row: any): DbState | null {
  if (!row) return null;
  return {
    id: row.id,
    instance_name: row.instance_name?.trim() || null,
    connection_status: row.status || row.context_json?.connection_status || 'DISCONNECTED',
    context_json: row.context_json || {},
  };
}

export function WhatsAppConnectionCard() {
  const [dbState, setDbState] = useState<DbState | null>(null);
  const [loading, setLoading] = useState(true);
  const [initializing, setInitializing] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);

  const supabaseRef = useRef(createClient());
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const hasInstance = Boolean(dbState?.instance_name);
  const isConnected = hasInstance && dbState?.connection_status === 'CONNECTED';

  const fetchFromDb = useCallback(async (isInitialLoad = false) => {
    try {
      const supabase = supabaseRef.current;
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setDbState(null);
        if (isInitialLoad) setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('business_config')
        .select('id, instance_name, context_json')
        .eq('owner_id', user.id)
        .maybeSingle();

      if (error) {
        console.error('[WA_CARD] DB error:', error.message);
        if (isInitialLoad) setLoading(false);
        return;
      }

      setDbState(extractDbState(data));
    } catch (err) {
      console.error('[WA_CARD] Exception:', err);
    } finally {
      if (isInitialLoad) setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFromDb(true);
    pollingRef.current = setInterval(() => {
      fetchFromDb(false);
    }, 4000);

    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, [fetchFromDb]);

  const handleInitializeInstance = async () => {
    setInitializing(true);
    try {
      const supabase = supabaseRef.current;
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const businessName = user.user_metadata?.business_name || 'Minha Empresa';
      const slug = businessName.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "");
      const prefix = process.env.NEXT_PUBLIC_INSTANCE_NAME;
      const name = `${prefix}-${slug || 'studio'}-${Math.floor(1000 + Math.random() * 9000)}`;

      const initRes = await fetch('/api/instance/initialize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ instanceName: name }),
      });

      if (initRes.status === 409) {
        const data = await initRes.json();
        alert(data.error || 'Instância já existe.');
      } else if (!initRes.ok) {
        throw new Error('Erro ao inicializar.');
      }

      await fetchFromDb(false);
    } catch (err) {
      console.error('[WA_CARD_INIT] Error:', err);
    } finally {
      setTimeout(() => setInitializing(false), 2000);
    }
  };

  const handleDeleteInstance = async () => {
    if (!dbState?.instance_name) return;
    const confirmed = window.confirm(`Deseja desconectar o WhatsApp?`);
    if (!confirmed) return;

    setDisconnecting(true);
    try {
      await fetch(`/api/instance/delete?instance=${dbState.instance_name}`, { method: 'POST' });
      await fetchFromDb(false);
    } catch (err) {
      console.error('[WA_CARD_DELETE] Error:', err);
    } finally {
      setDisconnecting(false);
    }
  };

  if (loading) {
    return (
      <div className="w-full h-48 bg-white rounded-3xl border border-slate-100 flex items-center justify-center">
        <Loader2 className="animate-spin text-indigo-200" size={32} />
      </div>
    );
  }

  return (
    <div className="bg-white rounded-[2rem] shadow-xl shadow-slate-200/50 border border-slate-100 overflow-hidden relative w-full mb-8">
      <AnimatePresence mode="wait">
        
        {/* STATE: IDLE */}
        {!hasInstance && !initializing && (
          <motion.div
            key="idle"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col gap-5 p-7"
          >
            <div className="flex justify-between items-start">
              <div className="w-14 h-14 rounded-2xl bg-indigo-50 flex items-center justify-center shrink-0 border border-indigo-100/50">
                <Bot size={28} className="text-[#533CFA]" />
              </div>
              <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-50 border border-slate-200 text-slate-400 text-[10px] font-black uppercase tracking-widest leading-none shrink-0">
                Desconectado
              </span>
            </div>

            <div className="flex flex-col gap-2">
                <h2 className="text-xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
                    <Image src="/assets/whatsapp.svg" alt="WA" width={22} height={22} />
                    Atendimento IA
                </h2>
                <p className="text-sm text-slate-500 leading-relaxed font-medium">
                    Conecte seu WhatsApp para que a IA atenda suas clientes 24h por dia.
                </p>
            </div>

            <button
              onClick={handleInitializeInstance}
              className="w-full h-14 bg-[#533CFA] hover:bg-[#432EEA] text-white font-black rounded-2xl shadow-lg shadow-indigo-100 active:scale-95 transition-all flex items-center justify-center gap-3"
            >
              <QrCode size={20} />
              Gerar Conexão
            </button>
          </motion.div>
        )}

        {/* STATE: LOADING */}
        {initializing && (
          <motion.div
            key="loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center justify-center text-center gap-4 p-12 min-h-[300px]"
          >
            <Loader2 className="animate-spin text-[#533CFA]" size={40} />
            <h3 className="text-lg font-bold text-slate-900">Iniciando IA...</h3>
          </motion.div>
        )}

        {/* STATE: QR CODE */}
        {hasInstance && !isConnected && !initializing && (
          <motion.div
            key="qr"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center gap-6 p-7"
          >
            <QRCodeDisplay
              instanceName={dbState!.instance_name!}
              onConnected={() => fetchFromDb(false)}
              onReProvision={handleInitializeInstance}
            />
            <div className="text-center">
                <h3 className="text-lg font-bold text-slate-900 mb-2">Escaneie o QR Code</h3>
                <p className="text-xs font-medium text-slate-400 leading-relaxed max-w-[240px] mx-auto">
                    Abra o WhatsApp, vá em "Aparelhos Conectados" e escaneie o código acima.
                </p>
            </div>
            <button
              onClick={handleDeleteInstance}
              className="text-xs font-bold text-rose-500 hover:underline"
            >
              Cancelar tentativa
            </button>
          </motion.div>
        )}

        {/* STATE: CONNECTED */}
        {isConnected && (
          <motion.div
            key="connected"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col gap-5 p-7"
          >
            <div className="flex justify-between items-start">
              <div className="w-14 h-14 rounded-2xl bg-emerald-50 flex items-center justify-center shrink-0 border border-emerald-100 relative overflow-hidden">
                <Bot size={28} className="text-emerald-500 z-10" />
                <div className="absolute inset-0 bg-emerald-400 animate-ping opacity-10" />
              </div>
              <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-600 text-[10px] font-black uppercase tracking-widest leading-none shrink-0">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Ativo
              </span>
            </div>

            <div className="flex flex-col gap-2">
                <h2 className="text-xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
                    <Image src="/assets/whatsapp.svg" alt="WA" width={22} height={22} />
                    WhatsApp Conectado
                </h2>
                <p className="text-sm text-slate-500 leading-relaxed font-medium">
                    Sua IA está ativa e atendendo clientes normalmente.
                </p>
            </div>

            <button
              onClick={handleDeleteInstance}
              disabled={disconnecting}
              className="w-full h-12 border border-rose-100 text-rose-500 font-bold text-sm rounded-xl hover:bg-rose-50 transition-all active:scale-95 flex items-center justify-center gap-2"
            >
              {disconnecting ? <Loader2 className="animate-spin" size={16} /> : <Trash2 size={16} />}
              Desconectar
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
