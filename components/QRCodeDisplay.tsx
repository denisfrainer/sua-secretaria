"use client";

import { useEffect, useState, useCallback, useRef } from 'react';
import { 
    Loader2, 
    QrCode as QrCodeIcon, 
    CheckCircle2, 
    Phone, 
    Sparkles, 
    Smartphone, 
    ArrowLeft,
    Copy,
    Check
} from 'lucide-react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { motion, AnimatePresence } from 'framer-motion';

// GOLD STANDARD: Specialized Phone Input
import 'react-phone-number-input/style.css';
import PhoneInput, { isValidPhoneNumber } from 'react-phone-number-input';

/**
 * 2-Step WhatsApp Pairing Component (Surgical Refactor)
 * Features:
 * - Gold Standard Phone Input (Masking + Country Selection)
 * - Strict Sanitization (Digits Only)
 * - Real-time Validation (12-13 digits for Brazil)
 * - Copy to Clipboard with Feedback
 * - Framer Motion Transitions
 */
export default function QRCodeDisplay({ instanceName, onConnected }: { instanceName: string, onConnected?: () => void }) {
    const [qrBase64, setQrBase64] = useState<string | null>(null);
    const [pairingCode, setPairingCode] = useState<string | null>(null);
    const [phoneNumber, setPhoneNumber] = useState<string | undefined>('');
    const [isPolling, setIsPolling] = useState(true);
    const [loadingPairing, setLoadingPairing] = useState(false);
    const [showPairingView, setShowPairingView] = useState(false);
    const [copied, setCopied] = useState(false);
    
    const supabase = createClient();
    const router = useRouter();
    const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);

    // Sanitizer: Digits only
    const cleanNumber = (val: string) => (val || '').replace(/\D/g, '');
    
    // Validation: 12-13 digits (Brazil standard +55 DD 9XXXX-XXXX or +55 DD XXXX-XXXX)
    const cleaned = cleanNumber(phoneNumber || '');
    const isNumberValid = cleaned.length >= 12 && cleaned.length <= 13;

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

    // Developer Secret Bypass
    const handleDevBypass = async () => {
        console.log("🛠️ [DEV] Bypassing WhatsApp connection...");
        await markAsConnected();
    };

    // ACTION: Explicitly fetch a Pairing Code
    const handleGeneratePairingCode = async () => {
        const finalNumber = cleanNumber(phoneNumber || '');
        if (!isNumberValid) return;
        
        setLoadingPairing(true);
        console.log(`🔌 [QR-UI] Sanitized Pairing request: ${finalNumber}`);
        
        try {
            const res = await fetch(`/api/instance/status?instance=${instanceName}&number=${finalNumber}`);
            const data = await res.json();
            
            if (data.pairingCode) {
                setPairingCode(data.pairingCode);
                setQrBase64(null);
            } else if (data.error) {
                alert(`Erro: ${data.error}`);
            }
        } catch (err) {
            console.error("❌ [QR-UI] Error generating pairing code", err);
        } finally {
            setLoadingPairing(false);
        }
    };

    const handleCopyCode = () => {
        if (!pairingCode) return;
        navigator.clipboard.writeText(pairingCode);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

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
               <p className="text-xl font-extrabold text-green-900 text-center font-source">Conectado!</p>
               <p className="text-sm font-medium text-green-600 text-center font-source">Sua IA já está ativa e monitorando suas mensagens.</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col items-center justify-center p-8 sm:p-10 bg-white border border-black/5 rounded-[32px] shadow-sm gap-8 w-full max-w-md mx-auto relative overflow-hidden font-source selection:bg-blue-100 selection:text-blue-900">
            
            {/* Custom PhoneInput Styles */}
            <style jsx global>{`
                .PhoneInput {
                    display: flex;
                    align-items: center;
                    width: 100%;
                    gap: 12px;
                    background: white;
                    border: 1px solid rgba(0,0,0,0.1);
                    border-radius: 16px;
                    padding: 8px 16px;
                    transition: all 0.2s;
                }
                .PhoneInput:focus-within {
                    border-color: #2563EB;
                    box-shadow: 0 0 0 4px rgba(37, 99, 235, 0.05);
                }
                .PhoneInputInput {
                    flex: 1;
                    background: transparent;
                    border: none;
                    outline: none;
                    font-size: 16px;
                    font-weight: 700;
                    color: #111827;
                    height: 48px;
                }
                .PhoneInputCountrySelect {
                    cursor: pointer;
                }
            `}</style>
            
            {/* BRAND DECOR */}
            <div className="absolute -top-10 -right-10 w-32 h-32 bg-blue-50 rounded-full blur-3xl opacity-50" />
            <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-indigo-50 rounded-full blur-3xl opacity-50" />

            <div className="flex flex-col items-center gap-2 text-center z-10">
                <div className="w-12 h-12 rounded-2xl bg-blue-600/5 flex items-center justify-center mb-2 border border-blue-600/10">
                    <QrCodeIcon size={24} className="text-blue-600" />
                </div>
                <h3 className="text-2xl font-extrabold text-gray-900 tracking-tight font-source">Vincular Dispositivo</h3>
                <p className="text-[15px] text-gray-500 font-medium leading-relaxed max-w-[280px] font-source">
                    {showPairingView 
                        ? (pairingCode ? "Código gerado! Use-o no seu celular." : "Digite seu número WhatsApp com DDD.") 
                        : "Escaneie o QR Code no seu WhatsApp ou use o código numérico."}
                </p>
            </div>

            {/* MAIN DISPLAY AREA */}
            <div className="w-full flex flex-col items-center gap-6 z-10">
                
                <AnimatePresence mode="wait">
                    {!showPairingView ? (
                        /* QR CODE VIEW */
                        <motion.div 
                            key="qr-view"
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="w-64 h-64 bg-zinc-50 rounded-3xl border border-black/5 flex items-center justify-center overflow-hidden relative shadow-sm transition-all hover:shadow-md"
                        >
                            {qrBase64 ? (
                                <Image 
                                    src={qrBase64.includes('base64,') ? qrBase64 : `data:image/png;base64,${qrBase64}`}
                                    alt="QR Code do WhatsApp" 
                                    fill
                                    className="object-cover p-4"
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
                        </motion.div>
                    ) : (
                        /* PAIRING CODE VIEW (STATE MACHINE) */
                        <motion.div 
                            key="pairing-view"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 10 }}
                            className="w-full flex flex-col gap-4"
                        >
                            {pairingCode ? (
                                /* STEP 2: DISPLAY CODE */
                                <motion.div 
                                    layoutId="code-card"
                                    className="flex flex-col gap-4"
                                >
                                    <div className="flex flex-col items-center gap-6 p-8 bg-blue-600 rounded-[32px] text-white shadow-xl shadow-blue-200 relative">
                                        <Smartphone size={32} className="opacity-80" />
                                        <div className="flex flex-col items-center gap-3">
                                            <span className="text-xs font-extrabold uppercase tracking-[0.2em] opacity-60">Código de Pareamento</span>
                                            <div className="text-5xl font-black tracking-widest font-mono drop-shadow-sm select-all">
                                                {pairingCode && pairingCode.length <= 15 
                                                    ? `${pairingCode.slice(0, 4)}-${pairingCode.slice(4, 8)}` 
                                                    : qrBase64 
                                                        ? "Gerando..." 
                                                        : "Processando..."}
                                            </div>
                                        </div>
                                        <p className="text-center text-[13px] font-bold opacity-80 leading-snug px-2">
                                            Vá em <span className="text-white underline">Aparelhos Conectados</span> {">"} <span className="text-white underline">Vincular com número</span> no seu WhatsApp.
                                        </p>

                                        {copied && (
                                            <motion.div 
                                                initial={{ opacity: 0, y: 10 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                className="absolute -top-4 bg-green-500 text-white text-[10px] font-black px-3 py-1 rounded-full shadow-lg"
                                            >
                                                COPIADO!
                                            </motion.div>
                                        )}
                                    </div>
                                    <button
                                        onClick={() => setPairingCode(null)}
                                        className="flex items-center justify-center gap-2 text-sm font-bold text-gray-400 hover:text-gray-900 transition-colors"
                                    >
                                        <ArrowLeft size={14} />
                                        Tentar outro número
                                    </button>
                                </motion.div>
                            ) : (
                                /* STEP 1: INPUT PHONE */
                                <div className="flex flex-col gap-4">
                                    <div className="flex flex-col gap-2">
                                        <PhoneInput
                                            international
                                            defaultCountry="BR"
                                            placeholder="Seu número WhatsApp"
                                            value={phoneNumber}
                                            onChange={setPhoneNumber}
                                            className="font-source"
                                        />
                                        {!isNumberValid && phoneNumber && phoneNumber.length > 5 && (
                                            <span className="text-[11px] font-bold text-red-500 ml-1">
                                                Número incompleto. Verifique o DDD e o número.
                                            </span>
                                        )}
                                    </div>
                                    <button
                                        onClick={handleGeneratePairingCode}
                                        disabled={loadingPairing || !isNumberValid}
                                        className="w-full h-14 bg-slate-900 text-white rounded-2xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-slate-200 hover:bg-slate-800 active:scale-[0.98] transition-all disabled:opacity-30 disabled:grayscale"
                                    >
                                        {loadingPairing ? <Loader2 size={20} className="animate-spin" /> : <Sparkles size={20} />}
                                        Gerar Código
                                    </button>
                                </div>
                            )}
                        </motion.div>
                    )}
                </AnimatePresence>

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

                    <button
                        onClick={() => {
                            setPairingCode(null);
                            setQrBase64(null);
                            setPhoneNumber('');
                            window.location.reload(); // Hard reset
                        }}
                        className="text-[10px] font-black text-red-400 hover:text-red-600 transition-all uppercase tracking-widest flex items-center gap-2 py-2 px-4 bg-red-50 rounded-full border border-red-100/50"
                    >
                        Reiniciar Instância
                    </button>

                    <div className="flex items-center gap-2 text-[13px] text-blue-600 font-bold px-5 py-2 bg-blue-50 rounded-full border border-blue-100 animate-pulse">
                        <div className="w-1.5 h-1.5 rounded-full bg-blue-600" />
                        Status: Aguardando Conexão
                    </div>
                </div>
            </div>

            {/* DEV BYPASS */}
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
