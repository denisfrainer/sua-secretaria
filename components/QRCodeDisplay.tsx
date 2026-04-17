"use client";

import { useEffect, useState, useCallback, useRef } from 'react';
import { 
    Loader2, 
    QrCode as QrCodeIcon, 
    CheckCircle2, 
    Users, 
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
export default function QRCodeDisplay({ instanceName, onConnected }: { instanceName: string, onConnected?: () => void }) {
    const [qrBase64, setQrBase64] = useState<string | null>(null);
    const [isPolling, setIsPolling] = useState(true);
    
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

                if (data.state === 'open') {
                    await markAsConnected();
                    if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current);
                    return;
                }

                if (data.qr) {
                    console.log(`[QR_RENDER] Base64 length: ${data.qr.length}`);
                    setQrBase64(data.qr);
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
    if (!isPolling) {
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

    return (
        <div className="flex flex-col items-center justify-center p-8 sm:p-10 bg-white border border-black/5 rounded-[32px] shadow-sm gap-8 w-full max-w-md mx-auto relative overflow-hidden font-source selection:bg-blue-100 selection:text-blue-900">
            
            {/* BRAND DECOR */}
            <div className="absolute -top-10 -right-10 w-32 h-32 bg-blue-50 rounded-full blur-3xl opacity-50" />
            <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-indigo-50 rounded-full blur-3xl opacity-50" />

            <div className="flex flex-col items-center gap-2 text-center z-10">
                <div className="w-12 h-12 rounded-2xl bg-blue-600/5 flex items-center justify-center mb-2 border border-blue-600/10">
                    <QrCodeIcon size={24} className="text-blue-600" />
                </div>
                <h3 className="text-2xl font-extrabold text-gray-900 tracking-tight font-source">Vincular Dispositivo</h3>
                <p className="text-[15px] text-gray-500 font-medium leading-relaxed max-w-[280px] font-source">
                    Abra o WhatsApp no seu celular, vá em Aparelhos Conectados e escaneie o código abaixo.
                </p>
            </div>

            {/* MAIN QR AREA */}
            <div className="w-full flex flex-col items-center gap-6 z-10">
                <motion.div 
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="flex items-center justify-center p-4 bg-white rounded-[32px] shadow-sm w-full max-w-[300px] aspect-square mx-auto border border-black/5 relative overflow-hidden transition-all hover:shadow-md"
                >
                    {qrBase64 ? (
                        <div className="relative w-full h-full">
                            <img 
                                src={qrBase64.startsWith('data:') ? qrBase64 : `data:image/png;base64,${qrBase64}`}
                                alt="WhatsApp QR Code"
                                className="w-full h-full object-contain"
                            />
                        </div>
                    ) : (
                        <div className="flex flex-col items-center gap-4">
                            <div className="relative">
                                <div className="absolute inset-0 bg-blue-600/20 rounded-full animate-ping" />
                                <Loader2 size={32} className="animate-spin text-blue-600 relative" />
                            </div>
                            <span className="text-xs font-bold text-gray-400 uppercase tracking-[0.2em] ml-1 font-source">Gerando QR</span>
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
