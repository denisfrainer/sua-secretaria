'use client';

import { useState, useEffect } from 'react';
import { MessageSquare, Zap, Loader2 } from 'lucide-react';

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
                console.log(`📡 [TOGGLE] Fetching status for: ${key}`);
                const res = await fetch(`/api/admin/system-config?token=${encodeURIComponent(adminKey)}&key=${key}`);
                if (res.ok) {
                    const data = await res.json();
                    console.log(`✅ [TOGGLE] ${key} status: ${data.enabled ? 'ON' : 'OFF'}`);
                    setter(prev => ({ ...prev, enabled: data.enabled }));
                }
            } catch (err) {
                console.error(`❌ [TOGGLE] Error fetching ${key}:`, err);
            }
        };

        if (adminKey) {
            fetchStatus('eliza_active', setEliza);
            fetchStatus('wolf_prospect_active', setWolf);
        }
    }, [adminKey]);

    const handleToggle = async (key: string, currentState: ToggleState, setter: React.Dispatch<React.SetStateAction<ToggleState>>) => {
        const newState = !currentState.enabled;
        console.log(`🔄 [TOGGLE] Switching ${key} to: ${newState ? 'ON ✅' : 'OFF ❌'}`);
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
                console.log(`✅ [TOGGLE] ${key} saved as: ${newState ? 'ON' : 'OFF'}`);
                setter(prev => ({ ...prev, enabled: newState, loading: false, message: 'Saved', error: false }));
            } else {
                console.error(`❌ [TOGGLE] ${key} save failed.`);
                setter(prev => ({ ...prev, loading: false, message: 'Error', error: true }));
            }
        } catch (err) {
            console.error(`❌ [TOGGLE] ${key} network error:`, err);
            setter(prev => ({ ...prev, loading: false, message: 'Network', error: true }));
        }

        setTimeout(() => setter(prev => ({ ...prev, message: null })), 2000);
    };

    const StatusChip = ({
        label,
        state,
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
                flex items-center gap-2 px-3 py-1.5 rounded-xl border transition-all duration-200 cursor-pointer select-none text-[13px] font-bold
                ${state.loading ? 'opacity-40 pointer-events-none' : ''}
                ${state.enabled
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-600 hover:bg-emerald-100'
                    : 'bg-gray-50 border-gray-200 text-gray-400 hover:bg-gray-100'}
            `}
        >
            <div className="relative flex items-center justify-center">
                {state.loading ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                    <>
                        <div className={`w-2 h-2 rounded-full transition-colors duration-300 ${state.enabled ? 'bg-emerald-500' : 'bg-gray-300'}`} />
                        {state.enabled && (
                            <div className="absolute inset-0 w-2 h-2 rounded-full bg-emerald-500 animate-ping opacity-30" />
                        )}
                    </>
                )}
            </div>
            {label}{state.message ? ` · ${state.message}` : ''}
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
