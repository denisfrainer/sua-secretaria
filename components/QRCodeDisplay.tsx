"use client";

import { useEffect, useState, useCallback } from 'react';
import { Loader2, QrCode as QrCodeIcon, CheckCircle2, Phone, Sparkles, Smartphone } from 'lucide-react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export default function QRCodeDisplay({ instanceName, onConnected }: { instanceName: string, onConnected?: () => void }) {
    const [qrBase64, setQrBase64] = useState<string | null>(null);
    const [pairingCode, setPairingCode] = useState<string | null>(null);
    const [phoneNumber, setPhoneNumber] = useState('');
    const [isPolling, setIsPolling] = useState(true);
    const [loadingPairing, setLoadingPairing] = useState(false);
    const [showPairingInput, setShowPairingInput] = useState(false);
    
    const supabase = createClient();
    const router = useRouter();

    const markAsConnected = useCallback(async () => {
        setIsPolling(false);
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
            const { data: config } = await supabase
                .from('business_config')
                .select('context_json, id')
                .eq('owner_id', session.user.id)
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

    const handleDevBypass = async () => {
        console.log("🛠️ [DEV] Bypassing WhatsApp connection...");
        await markAsConnected();
    };

    const handleGeneratePairingCode = async () => {
        if (!phoneNumber || phoneNumber.length < 10) {
            alert("Por favor, insira um número válido (com DDD)");
            return;
        }
        setLoadingPairing(true);
        try {
            // We force a fetch with the phone number
            const res = await fetch(`/api/instance/status?instance=${instanceName}&number=${phoneNumber.replace(/\D/g, '')}`);
            const data = await res.json();
            if (data.pairingCode) {
                setPairingCode(data.pairingCode);
                setQrBase64(null); // Clear QR if we are doing pairing
            }
        } catch (err) {
            console.error("Erro ao gerar pairing code", err);
        } finally {
            setLoadingPairing(false);
        }
    };

    useEffect(() => {
        let interval: NodeJS.Timeout;

        const checkStatus = async () => {
            try {
                // If we have a pairing code, we still poll but we don't need to send the number again 
                // unless it's the first time (handled by the button)
                const res = await fetch(`/api/instance/status?instance=${instanceName}${pairingCode ? `&number=${phoneNumber.replace(/\D/g, '')}` : ''}`);
                const data = await res.json();

                if (data.state === 'open') {
                    await markAsConnected();
                    clearInterval(interval);
                    return;
                }

                if (!pairingCode && data.qr) {
                    setQrBase64(data.qr);
                }
                
                if (data.pairingCode) {
                    setPairingCode(data.pairingCode);
                }

            } catch (err) {
                console.error("Erro ao checar status do QR code", err);
            }
        };

        if (isPolling) {
            checkStatus();
            interval = setInterval(checkStatus, 5000); 
        }

        return () => clearInterval(interval);
    }, [instanceName, isPolling, markAsConnected, pairingCode, phoneNumber]);

    if (!isPolling) {
        return (
            <div className="flex flex-col items-center justify-center p-8 bg-green-50 border border-green-100 rounded-3xl gap-4 animate-in fade-in zoom-in duration-500 w-full max-w-md mx-auto">
               <div className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center">
                   <CheckCircle2 size={40} className="text-green-500" />
               </div>
               <p className="text-xl font-extrabold text-green-800 text-center">Conectado!</p>
               <p className="text-sm font-medium text-green-600 text-center">Sua IA já está monitorando suas mensagens.</p>
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
                <h3 className="text-2xl font-extrabold text-gray-900 tracking-tight">Vincular Dispositivo</h3>
                <p className="text-[15px] text-gray-500 font-medium leading-relaxed max-w-[280px]">
                    {showPairingInput 
                        ? "Insira seu número com DDD para gerar o código de pareamento." 
                        : "Escaneie o QR Code no seu WhatsApp ou use o código numérico."}
                </p>
            </div>

            {/* MAIN DISPLAY AREA */}
            <div className="w-full flex flex-col items-center gap-6 z-10">
                
                {!showPairingInput ? (
                    <div className="w-64 h-64 bg-zinc-50 rounded-3xl border border-black/5 flex items-center justify-center overflow-hidden relative shadow-sm transition-all hover:shadow-md">
                        {qrBase64 ? (
                            <Image 
                                src={qrBase64.includes('base64,') ? qrBase64 : `data:image/png;base64,${qrBase64}`}
                                alt="QR Code do WhatsApp" 
                                fill
                                className="object-cover p-4 animate-in fade-in duration-700"
                            />
                        ) : (
                            <div className="flex flex-col items-center gap-4">
                                <div className="relative">
                                    <div className="absolute inset-0 bg-blue-600/20 rounded-full animate-ping" />
                                    <Loader2 size={32} className="animate-spin text-blue-600 relative" />
                                </div>
                                <span className="text-xs font-bold text-gray-400 uppercase tracking-[0.2em] ml-1">Gerando QR</span>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="w-full flex flex-col gap-4 animate-in slide-in-from-bottom-4 duration-500">
                        {pairingCode ? (
                            <div className="flex flex-col items-center gap-6 p-6 bg-blue-600 rounded-3xl text-white shadow-xl shadow-blue-200">
                                <Smartphone size={32} />
                                <div className="flex flex-col items-center gap-2">
                                    <span className="text-xs font-bold uppercase tracking-widest opacity-60">Código de Pareamento</span>
                                    <div className="text-4xl font-extrabold tracking-[0.15em] font-mono">
                                        {pairingCode.slice(0, 4)}-{pairingCode.slice(4)}
                                    </div>
                                </div>
                                <p className="text-center text-sm font-medium opacity-80 leading-snug">
                                    No seu WhatsApp, escolha "Vincular com número de telefone" e digite este código.
                                </p>
                            </div>
                        ) : (
                            <div className="flex flex-col gap-3">
                                <div className="relative group">
                                    <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300 group-focus-within:text-blue-600 transition-colors" size={18} />
                                    <input 
                                        type="text"
                                        placeholder="Ex: 5548999998888"
                                        value={phoneNumber}
                                        onChange={(e) => setPhoneNumber(e.target.value)}
                                        className="w-full bg-white border border-black/10 rounded-2xl py-4 pl-12 pr-4 text-base font-bold text-gray-900 focus:outline-none focus:ring-4 focus:ring-blue-600/5 focus:border-blue-600 transition-all placeholder:text-gray-300"
                                    />
                                </div>
                                <button
                                    onClick={handleGeneratePairingCode}
                                    disabled={loadingPairing}
                                    className="w-full h-14 bg-blue-600 text-white rounded-2xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-blue-200 hover:bg-blue-700 active:scale-[0.98] transition-all disabled:opacity-50"
                                >
                                    {loadingPairing ? <Loader2 size={20} className="animate-spin" /> : <Sparkles size={20} />}
                                    Gerar Código Numérico
                                </button>
                            </div>
                        )}
                    </div>
                )}

                {/* TOGGLE OPTIONS */}
                <div className="flex flex-col items-center gap-4 w-full">
                    <button 
                        onClick={() => {
                            setShowPairingInput(!showPairingInput);
                            setPairingCode(null);
                        }}
                        className="text-sm font-bold text-gray-400 hover:text-blue-600 transition-colors uppercase tracking-widest flex items-center gap-2"
                    >
                        {showPairingInput ? "Voltar p/ QR Code" : "Vincular via Número"}
                    </button>

                    <div className="flex items-center gap-2 text-sm text-blue-600 font-medium px-4 py-2 bg-blue-50 rounded-full border border-blue-100/50">
                        <div className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-pulse" />
                        Aguardando leitura...
                    </div>
                </div>
            </div>

            {/* DEV BYPASS (Surgical Hidden) */}
            <div className="w-full pt-4 mt-2 border-t border-black/5 flex flex-col items-center gap-3">
                <button
                    onClick={handleDevBypass}
                    className="text-[11px] font-bold text-gray-300 hover:text-gray-900 transition-colors uppercase tracking-widest"
                >
                    Dev Mode: Pular Conexão
                </button>
            </div>
        </div>
    );
}
