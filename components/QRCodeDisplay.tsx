"use client";

import { useEffect, useState, useCallback, useRef } from 'react';
import { 
    Loader2, 
    QrCode as QrCodeIcon, 
    CheckCircle2, 
    AlertCircle,
    RefreshCw
} from 'lucide-react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * 1-Step WhatsApp QR Connection Component (Simplified)
 * Features:
 * - Direct QR Code Scanning
 * - Real-time Status Polling
 * - Clean UI with Framer Motion transitions
 */
export default function QRCodeDisplay({ 
    instanceName, 
    onConnected,
    onReProvision
}: { 
    instanceName: string, 
    onConnected?: () => void,
    onReProvision?: () => void
}) {
    const [qrBase64, setQrBase64] = useState<string | null>(null);
    const [isPolling, setIsPolling] = useState(true);
    const [apiState, setApiState] = useState<string | null>(null);
    
    const supabase = createClient();
    const router = useRouter();
    const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);

    // Final Success Callback
    const markAsConnected = useCallback(async () => {
        setIsPolling(false);
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
            const { data: config } = await supabase
                .from('business_config')
                .select('context_json, id')
                .eq('owner_id', user.id)
                .single();

            if (config) {
                const newContext = { ...config.context_json, connection_status: 'CONNECTED' };
                await supabase
                    .from('business_config')
                    .update({ context_json: newContext })
                    .eq('id', config.id);
            }
        }
        if (onConnected) onConnected();
        router.refresh();
    }, [supabase, onConnected, router]);

    // Polling Logic
    useEffect(() => {
        const checkStatus = async () => {
            try {
                const res = await fetch(`/api/instance/status?instance=${instanceName}`);
                const data = await res.json();
                
                setApiState(data.state);

                if (data.state === 'open' || data.state === 'connected') {
                    await markAsConnected();
                    if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current);
                    return;
                }

                if (data.qr) {
                    console.log(`[QR_RENDER] Base64 length: ${data.qr.length}`);
                    setQrBase64(data.qr);
                } else if (data.state === 'NOT_FOUND') {
                    // Stale instance detected
                    setIsPolling(false); 
                    if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current);
                }
            } catch (err) {
                console.error("❌ [QR-UI] Polling error:", err);
            }
        };

        if (isPolling) {
            checkStatus();
            pollingIntervalRef.current = setInterval(checkStatus, 5000); 
        }

        return () => {
             if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current);
        };
    }, [instanceName, isPolling, markAsConnected]);

    // SUCCESS VIEW
    if (!isPolling && (apiState === 'open' || apiState === 'connected')) {
        return (
            <div className="flex flex-col items-center justify-center p-8 bg-green-50 border border-green-200 rounded-3xl gap-4 animate-in fade-in zoom-in duration-500 w-full max-w-md mx-auto">
               <div className="w-16 h-16 rounded-full bg-green-500 flex items-center justify-center shadow-lg shadow-green-200">
                   <CheckCircle2 size={32} className="text-white" />
               </div>
               <p className="text-xl font-extrabold text-green-900 text-center font-source">Conectado!</p>
               <p className="text-sm font-medium text-green-600 text-center font-source">Sua IA já está ativa e monitorando suas mensagens.</p>
            </div>
        );
    }

    // NOT_FOUND / STALE VIEW
    if (!isPolling && apiState === 'NOT_FOUND') {
        return (
            <div className="flex flex-col items-center justify-center p-8 bg-amber-50 border border-amber-200 rounded-3xl gap-6 animate-in fade-in zoom-in duration-500 w-full max-w-md mx-auto font-source">
               <div className="w-16 h-16 rounded-full bg-amber-500 flex items-center justify-center shadow-lg shadow-amber-200">
                   <AlertCircle size={32} className="text-white" />
               </div>
               <div className="text-center gap-1 flex flex-col">
                    <p className="text-xl font-extrabold text-amber-900">Instância não encontrada</p>
                    <p className="text-sm font-medium text-amber-700">A instância anterior expirou ou foi removida. Vamos criar uma nova.</p>
               </div>
               <button 
                onClick={() => onReProvision?.()}
                className="w-full py-4 bg-amber-600 hover:bg-amber-700 text-white rounded-2xl font-bold transition-all shadow-md active:scale-95 flex items-center justify-center gap-2"
               >
                 <RefreshCw size={20} />
                 Reiniciar Instância
               </button>
            </div>
        );
    }

    return (
        <div className="flex flex-col items-center justify-center gap-8 w-full max-w-md mx-auto relative font-source selection:bg-blue-100 selection:text-blue-900">
            
            <div className="flex flex-col items-center gap-2 text-center z-10">
                <div className="w-12 h-12 rounded-2xl bg-blue-600/5 flex items-center justify-center mb-2 border border-blue-600/10">
                    <QrCodeIcon size={24} className="text-blue-600" />
                </div>
                <h3 className="text-2xl font-extrabold text-gray-900 tracking-tight font-source">Vincular Dispositivo</h3>
                <p className="text-[15px] text-gray-500 font-medium leading-relaxed max-w-[280px] font-source">
                    Abra o WhatsApp no seu celular, vá em Aparelhos Conectados e escaneie o código abaixo.
                </p>
            </div>

            {/* MAIN QR AREA - THE ONLY CONTAINER */}
            <div className="w-full flex flex-col items-center gap-6 z-10">
                <motion.div 
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="flex items-center justify-center p-6 bg-white rounded-[32px] shadow-[0_8px_30px_rgb(0,0,0,0.04)] w-full max-w-[320px] aspect-square mx-auto border border-black/5 relative overflow-hidden transition-all hover:shadow-lg"
                >
                    {qrBase64 ? (
                        <div className="relative" style={{ width: '256px', height: '256px' }}>
                            <img 
                                src={qrBase64.startsWith('data:') ? qrBase64 : `data:image/png;base64,${qrBase64}`}
                                alt="WhatsApp QR Code"
                                className="w-full h-full object-contain"
                                style={{ imageRendering: 'pixelated' }}
                            />
                        </div>
                    ) : (
                        <div className="flex flex-col items-center gap-6">
                            {apiState === 'DISCONNECTED' ? (
                                <>
                                    <p className="text-xs font-bold text-amber-600 uppercase tracking-widest text-center px-4">Conexão Interrompida</p>
                                    <button 
                                        onClick={() => setIsPolling(true)}
                                        className="py-3 px-6 bg-blue-600 text-white rounded-xl font-bold text-sm hover:bg-blue-700 transition-all flex items-center gap-2"
                                    >
                                        <RefreshCw size={16} />
                                        Gerar Novo QR
                                    </button>
                                </>
                            ) : (
                                <div className="flex flex-col items-center gap-4">
                                    <div className="relative">
                                        <div className="absolute inset-0 bg-blue-600/20 rounded-full animate-ping" />
                                        <Loader2 size={32} className="animate-spin text-blue-600 relative" />
                                    </div>
                                    <span className="text-xs font-bold text-gray-400 uppercase tracking-[0.2em] ml-1 font-source">Gerando QR</span>
                                </div>
                            )}
                        </div>
                    )}
                </motion.div>

                <div className="flex flex-col items-center gap-5 w-full pt-2">
                    <div className="flex items-center gap-2 text-[13px] text-blue-600 font-bold px-5 py-2 bg-blue-50 rounded-full border border-blue-100 animate-pulse font-source">
                        <div className="w-1.5 h-1.5 rounded-full bg-blue-600" />
                        Status: Aguardando Escaneamento
                    </div>
                </div>
            </div>

            {/* FOOTER NOTICE */}
            <div className="w-full pt-6 mt-2 border-t border-black/5 flex justify-center text-[11px] font-bold text-gray-400 uppercase tracking-widest">
                Modo Seguro: Conexão Criptografada
            </div>
        </div>
    );
}
