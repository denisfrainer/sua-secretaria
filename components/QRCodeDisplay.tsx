"use client";

import { useEffect, useState } from 'react';
import { Loader2, QrCode as QrCodeIcon, CheckCircle2 } from 'lucide-react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export default function QRCodeDisplay({ instanceName, onConnected }: { instanceName: string, onConnected?: () => void }) {
    const [qrBase64, setQrBase64] = useState<string | null>(null);
    const [isPolling, setIsPolling] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const supabase = createClient();
    const router = useRouter();

    useEffect(() => {
        let interval: NodeJS.Timeout;

        const checkStatus = async () => {
            try {
                const res = await fetch(`/api/instance/status?instance=${instanceName}`);
                const data = await res.json();

                if (data.state === 'open') {
                    setIsPolling(false);
                    // Update the DB state to CONNECTED
                    const { data: { session } } = await supabase.auth.getSession();
                    if (session) {
                       // 1. Fetch current config
                       const { data: config } = await supabase
                         .from('business_config')
                         .select('context_json, id')
                         .eq('owner_id', session.user.id)
                         .single();

                       if (config) {
                         const newContext = { ...config.context_json, connection_status: 'CONNECTED' };
                         // 2. Update status
                         await supabase
                           .from('business_config')
                           .update({ context_json: newContext })
                           .eq('id', config.id);
                       }
                    }
                    if (onConnected) onConnected(); 
                    clearInterval(interval);
                    router.refresh();
                    return;
                }

                if (data.qr) {
                    setQrBase64(data.qr);
                }

            } catch (err) {
                console.error("Erro ao checar status do QR code", err);
            }
        };

        if (isPolling) {
            checkStatus(); // immediate run
            interval = setInterval(checkStatus, 3000); 
        }

        return () => clearInterval(interval);
    }, [instanceName, isPolling, onConnected, router, supabase]);

    if (!isPolling) {
        return (
            <div className="flex flex-col items-center justify-center p-8 bg-green-50 border border-green-100 rounded-2xl gap-4 animate-in fade-in zoom-in duration-500">
               <CheckCircle2 size={48} className="text-green-500" />
               <p className="text-lg font-bold text-green-800">WhatsApp Conectado com Sucesso!</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col items-center justify-center p-8 sm:p-10 bg-white border border-black/10 rounded-3xl shadow-sm gap-6 w-full max-w-md mx-auto">
            <div className="flex flex-col items-center gap-2 text-center">
                <QrCodeIcon size={32} className="text-blue-600 mb-2" />
                <h3 className="text-xl font-extrabold text-gray-900">Conecte seu WhatsApp</h3>
                <p className="text-sm text-gray-500 font-medium">Abra o WhatsApp em seu celular, vá em "Aparelhos Conectados" e escaneie o código abaixo.</p>
            </div>

            <div className="w-64 h-64 bg-gray-50 rounded-2xl border border-gray-200 flex items-center justify-center overflow-hidden relative shadow-inner">
                {qrBase64 ? (
                    <Image 
                        src={qrBase64.includes('base64,') ? qrBase64 : `data:image/png;base64,${qrBase64}`}
                        alt="QR Code do WhatsApp" 
                        layout="fill" 
                        objectFit="cover"
                        className="animate-in fade-in duration-500"
                    />
                ) : (
                    <div className="flex flex-col items-center gap-3">
                        <Loader2 size={32} className="animate-spin text-gray-300" />
                        <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Gerando Código</span>
                    </div>
                )}
            </div>

            <div className="flex items-center gap-2 text-sm text-blue-600 font-medium px-4 py-2 bg-blue-50 rounded-full animate-pulse">
                <Loader2 size={16} className="animate-spin" />
                Aguardando leitura...
            </div>
        </div>
    );
}
