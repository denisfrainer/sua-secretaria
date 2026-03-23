'use client';

import { useState, useEffect } from 'react';
import { MessageSquare, Zap, Loader2, CheckCircle, AlertCircle } from 'lucide-react';

interface ToggleState {
    enabled: boolean;
    loading: boolean;
    message: string | null;
    error: boolean;
}

export default function ElizaToggle({ adminKey }: { adminKey: string }) {
    const [eliza, setEliza] = useState<ToggleState>({ enabled: true, loading: false, message: null, error: false });
    const [wolf, setWolf] = useState<ToggleState>({ enabled: true, loading: false, message: null, error: false });

    useEffect(() => {
        const fetchStatus = async (key: string, setter: React.Dispatch<React.SetStateAction<ToggleState>>) => {
            try {
                const res = await fetch(`/api/admin/system-config?token=${encodeURIComponent(adminKey)}&key=${key}`);
                if (res.ok) {
                    const data = await res.json();
                    setter(prev => ({ ...prev, enabled: data.enabled }));
                }
            } catch (err) {
                console.error(`Erro ao buscar status de ${key}`);
            }
        };

        if (adminKey) {
            fetchStatus('eliza_active', setEliza);
            fetchStatus('wolf_prospect_active', setWolf);
        }
    }, [adminKey]);

    const handleToggle = async (key: string, currentState: ToggleState, setter: React.Dispatch<React.SetStateAction<ToggleState>>) => {
        const newState = !currentState.enabled;
        setter(prev => ({ ...prev, loading: true, message: null, error: false }));

        try {
            const res = await fetch('/api/admin/system-config', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-wolf-token': adminKey,
                },
                body: JSON.stringify({ key, enabled: newState }),
            });

            if (res.ok) {
                setter(prev => ({ ...prev, enabled: newState, loading: false, message: 'Saved', error: false }));
            } else {
                setter(prev => ({ ...prev, loading: false, message: 'Error', error: true }));
            }
        } catch (err) {
            setter(prev => ({ ...prev, loading: false, message: 'Network', error: true }));
        }

        setTimeout(() => setter(prev => ({ ...prev, message: null })), 2000);
    };

    const StatusChip = ({ 
        label, 
        state, 
        icon: Icon, 
        onClick 
    }: { 
        label: string; 
        state: ToggleState; 
        icon: any; 
        onClick: () => void 
    }) => (
        <button
            onClick={onClick}
            disabled={state.loading}
            className={`
                flex items-center gap-2 px-2.5 py-1.5 rounded-lg border transition-all duration-200 cursor-pointer select-none
                ${state.loading ? 'opacity-40 pointer-events-none' : ''}
                ${state.enabled 
                    ? 'bg-emerald-500/10 border-emerald-500/20 hover:border-emerald-500/40' 
                    : 'bg-white/[0.04] border-white/[0.08] hover:bg-white/[0.08] hover:border-white/[0.15]'}
            `}
        >
            <div className="relative flex items-center justify-center">
                {state.loading ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-white/40" />
                ) : (
                    <>
                        <div className={`w-1.5 h-1.5 rounded-full transition-colors duration-300 ${state.enabled ? 'bg-emerald-400' : 'bg-zinc-600'}`} />
                        {state.enabled && (
                            <div className="absolute inset-0 w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping opacity-40" />
                        )}
                    </>
                )}
            </div>

            <span className={`text-[11px] font-medium tracking-wide ${state.enabled ? 'text-emerald-400/90' : 'text-white/30'}`}>
                {label} {state.message ? `(${state.message})` : ''}
            </span>
        </button>
    );

    return (
        <div className="flex items-center gap-2">
            <StatusChip 
                label="Eliza" 
                state={eliza} 
                icon={MessageSquare} 
                onClick={() => handleToggle('eliza_active', eliza, setEliza)} 
            />
            <StatusChip 
                label="Lobo" 
                state={wolf} 
                icon={Zap} 
                onClick={() => handleToggle('wolf_prospect_active', wolf, setWolf)} 
            />
        </div>
    );
}
