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
                const res = await fetch(`/api/admin/system-config?token=${adminKey}&key=${key}`);
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
                setter(prev => ({ ...prev, enabled: newState, loading: false, message: 'Updated!', error: false }));
            } else {
                setter(prev => ({ ...prev, loading: false, message: 'Failed!', error: true }));
            }
        } catch (err) {
            setter(prev => ({ ...prev, loading: false, message: 'Network error!', error: true }));
        }

        // Clear toast message after 3 seconds
        setTimeout(() => {
            setter(prev => ({ ...prev, message: null }));
        }, 3000);
    };

    const ToggleButton = ({ 
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
        <div className="flex flex-col gap-1 w-full sm:w-auto">
            <button
                onClick={onClick}
                disabled={state.loading}
                className={`
                    flex items-center gap-3 px-4 py-2 rounded-xl border transition-all duration-300 cursor-pointer select-none group
                    ${state.loading ? 'opacity-50 pointer-events-none' : ''}
                    ${state.enabled 
                        ? 'bg-emerald-500/10 border-emerald-500/30 hover:border-emerald-500/50 hover:bg-emerald-500/20 shadow-[0_0_15px_-3px_rgba(16,185,129,0.1)]' 
                        : 'bg-zinc-900/40 border-zinc-800 hover:border-zinc-700 hover:bg-zinc-900/60'}
                `}
            >
                <div className={`
                    p-2 rounded-lg transition-colors duration-300
                    ${state.enabled ? 'text-emerald-400 bg-emerald-400/10' : 'text-zinc-500 bg-zinc-800'}
                `}>
                    {state.loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Icon className="w-4 h-4" />}
                </div>

                <div className="flex flex-col items-start pr-2">
                    <span className="text-[10px] uppercase tracking-wider font-bold text-white/40 group-hover:text-white/60 transition-colors">
                        {label}
                    </span>
                    <span className={`text-sm font-semibold tracking-tight ${state.enabled ? 'text-emerald-400' : 'text-zinc-400'}`}>
                        {state.enabled ? 'ENABLED' : 'DISABLED'}
                    </span>
                </div>

                {/* Status Dot */}
                <div className="relative ml-auto pl-4">
                    <div className={`w-2 h-2 rounded-full transition-colors duration-300 ${state.enabled ? 'bg-emerald-400' : 'bg-zinc-600'}`} />
                    {state.enabled && !state.loading && (
                        <div className="absolute inset-0 w-2 h-2 rounded-full bg-emerald-400 animate-ping opacity-30" />
                    )}
                </div>
            </button>

            {/* Toast inline */}
            <div className={`
                flex items-center gap-1 text-[10px] font-medium px-2 h-4 transition-all duration-300
                ${state.message ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-1 pointer-events-none'}
                ${state.error ? 'text-rose-400' : 'text-emerald-400'}
            `}>
                {state.error ? <AlertCircle className="w-3 h-3" /> : <CheckCircle className="w-3 h-3" />}
                {state.message}
            </div>
        </div>
    );

    return (
        <div className="flex flex-wrap items-center gap-4 py-2">
            <ToggleButton 
                label="Eliza Auto-Response" 
                state={eliza} 
                icon={MessageSquare} 
                onClick={() => handleToggle('eliza_active', eliza, setEliza)} 
            />
            <ToggleButton 
                label="Wolf Outbound Prospector" 
                state={wolf} 
                icon={Zap} 
                onClick={() => handleToggle('wolf_prospect_active', wolf, setWolf)} 
            />
        </div>
    );
}
