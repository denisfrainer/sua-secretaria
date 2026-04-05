"use client";

import { useEffect, useState, useCallback, useRef } from 'react';
import { Loader2, QrCode as QrCodeIcon, CheckCircle2, Phone, Sparkles, Smartphone, ArrowLeft } from 'lucide-react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

/**
 * 2-Step WhatsApp Pairing Component
 * Steps:
 * 1. Input phone number (Step 1)
 * 2. Generate & Display 8-char Code (Step 2)
 * 3. Polling for connection state
 */
export default function QRCodeDisplay({ instanceName, onConnected }: { instanceName: string, onConnected?: () => void }) {
    const [qrBase64, setQrBase64] = useState<string | null>(null);
    const [pairingCode, setPairingCode] = useState<string | null>(null);
    const [phoneNumber, setPhoneNumber] = useState('');
    const [isPolling, setIsPolling] = useState(true);
    const [loadingPairing, setLoadingPairing] = useState(false);
    const [showPairingView, setShowPairingView] = useState(false);
    
    const supabase = createClient();
    const router = useRouter();
    const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);

    // Final Success Callback
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

    // Developer Secret Bypass
    const handleDevBypass = async () => {
        console.log("🛠️ [DEV] Bypassing WhatsApp connection...");
        await markAsConnected();
    };

    // ACTION: Explicitly fetch a Pairing Code
    const handleGeneratePairingCode = async () => {
        const cleanNumber = phoneNumber.replace(/\D/g, '');
        if (!cleanNumber || cleanNumber.length < 10) {
            alert("Por favor, insira um número válido com DDD (ex: 5511999999999)");
            return;
        }
        
        setLoadingPairing(true);
        console.log(`🔌 [QR-UI] Manual Pairing Code request for: ${cleanNumber}`);
        
        try {
            const res = await fetch(`/api/instance/status?instance=${instanceName}&number=${cleanNumber}`);
            const data = await res.json();
            
            if (data.pairingCode) {
                console.log(`✅ [QR-UI] Pairing Code received: ${data.pairingCode}`);
                setPairingCode(data.pairingCode);
                setQrBase64(null); // Clear QR if we are doing pairing
            } else if (data.error) {
                alert(`Erro: ${data.error}`);
            }
        } catch (err) {
            console.error("❌ [QR-UI] Error generating pairing code", err);
        } finally {
            setLoadingPairing(false);
        }
    };

    // Polling Logic: State Aware
    useEffect(() => {
        const checkStatus = async () => {
            try {
                // IMPORTANT: If we have a pairing code, we poll WITHTOUT the number 
                // to check solely for connection state, avoiding re-generation.
                const res = await fetch(`/api/instance/status?instance=${instanceName}`);
                const data = await res.json();

                if (data.state === 'open') {
                    console.log("🎉 [QR-UI] Connection state is OPEN. Completing...");
                    await markAsConnected();
                    if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current);
                    return;
                }

                // If not connected and we are in QR mode (not pairing), update QR
                if (!pairingCode && !showPairingView && data.qr) {
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
    }, [instanceName, isPolling, markAsConnected, pairingCode, showPairingView]);

    // SUCCESS VIEW
    if (!isPolling) {
        return (
            <div className="flex flex-col items-center justify-center p-8 bg-green-50 border border-green-200 rounded-3xl gap-4 animate-in fade-in zoom-in duration-500 w-full max-w-md mx-auto">
               <div className="w-16 h-16 rounded-full bg-green-500 flex items-center justify-center shadow-lg shadow-green-200">
                   <CheckCircle2 size={32} className="text-white" />
               </div>
               <p className="text-xl font-extrabold text-green-900 text-center">Conectado!</p>
               <p className="text-sm font-medium text-green-600 text-center">Sua IA já está ativa e monitorando suas mensagens.</p>
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
                    {showPairingView 
                        ? (pairingCode ? "Código gerado! Use-o no seu celular." : "Digite seu número WhatsApp com DDD.") 
                        : "Escaneie o QR Code no seu WhatsApp ou use o código numérico."}
                </p>
            </div>

            {/* MAIN DISPLAY AREA */}
            <div className="w-full flex flex-col items-center gap-6 z-10">
                
                {!showPairingView ? (
                    /* QR CODE VIEW */
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
                    /* PAIRING CODE VIEW (STATE MACHINE) */
                    <div className="w-full flex flex-col gap-4 animate-in slide-in-from-bottom-4 duration-500">
                        {pairingCode ? (
                            /* STEP 2: DISPLAY CODE */
                            <div className="flex flex-col gap-4">
                                <div className="flex flex-col items-center gap-6 p-8 bg-blue-600 rounded-[32px] text-white shadow-xl shadow-blue-200">
                                    <Smartphone size={32} className="opacity-80" />
                                    <div className="flex flex-col items-center gap-3">
                                        <span className="text-xs font-extrabold uppercase tracking-[0.2em] opacity-60">Código de Pareamento</span>
                                        <div className="text-5xl font-black tracking-widest font-mono drop-shadow-sm select-all">
                                            {pairingCode.length >= 8 
                                                ? `${pairingCode.slice(0, 4)}-${pairingCode.slice(4, 8)}` 
                                                : pairingCode}
                                        </div>
                                    </div>
                                    <p className="text-center text-[13px] font-bold opacity-80 leading-snug px-2">
                                        Vá em <span className="text-white underline">Aparelhos Conectados</span> {">"} <span className="text-white underline">Vincular com número</span> no seu WhatsApp.
                                    </p>
                                </div>
                                <button
                                    onClick={() => setPairingCode(null)}
                                    className="flex items-center justify-center gap-2 text-sm font-bold text-gray-400 hover:text-gray-900 transition-colors"
                                >
                                    <ArrowLeft size={14} />
                                    Tentar outro número
                                </button>
                            </div>
                        ) : (
                            /* STEP 1: INPUT PHONE */
                            <div className="flex flex-col gap-4">
                                <div className="relative group">
                                    <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300 group-focus-within:text-blue-600 transition-colors" size={18} />
                                    <input 
                                        type="tel"
                                        placeholder="5511999999999"
                                        value={phoneNumber}
                                        onChange={(e) => setPhoneNumber(e.target.value)}
                                        className="w-full bg-white border border-black/10 rounded-2xl py-4 pl-12 pr-4 text-base font-bold text-gray-900 focus:outline-none focus:ring-4 focus:ring-blue-600/5 focus:border-blue-600 transition-all placeholder:text-gray-300"
                                    />
                                </div>
                                <button
                                    onClick={handleGeneratePairingCode}
                                    disabled={loadingPairing}
                                    className="w-full h-14 bg-slate-900 text-white rounded-2xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-slate-200 hover:bg-slate-800 active:scale-[0.98] transition-all disabled:opacity-50"
                                >
                                    {loadingPairing ? <Loader2 size={20} className="animate-spin" /> : <Sparkles size={20} />}
                                    Gerar Código
                                </button>
                            </div>
                        )}
                    </div>
                )}

                {/* MODE TOGGLE */}
                <div className="flex flex-col items-center gap-5 w-full pt-2">
                    <button 
                        onClick={() => {
                            setShowPairingView(!showPairingView);
                            setPairingCode(null);
                        }}
                        className="text-xs font-black text-gray-400 hover:text-blue-600 transition-all uppercase tracking-widest flex items-center gap-2 py-2"
                    >
                        {showPairingView ? "Voltar para Escaneamento" : "Vincular via Número"}
                    </button>

                    <div className="flex items-center gap-2 text-[13px] text-blue-600 font-bold px-5 py-2 bg-blue-50 rounded-full border border-blue-100 animate-pulse">
                        <div className="w-1.5 h-1.5 rounded-full bg-blue-600" />
                        Status: Aguardando Conexão
                    </div>
                </div>
            </div>

            {/* DEV BYPASS (Hidden Shortcut) */}
            <div className="w-full pt-6 mt-2 border-t border-black/5 flex flex-col items-center gap-3">
                <button
                    onClick={handleDevBypass}
                    className="text-[10px] font-bold text-gray-200 hover:text-gray-400 transition-colors uppercase tracking-[0.2em]"
                >
                    Admin: Pular Conexão
                </button>
            </div>
        </div>
    );
}
