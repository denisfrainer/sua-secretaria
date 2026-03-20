'use client';

import { useState, useEffect } from 'react';

export default function ElizaToggle({ adminKey }: { adminKey: string }) {
    const [isOnline, setIsOnline] = useState(true);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        const fetchStatus = async () => {
            try {
                const res = await fetch(`/api/admin/system-config?token=${adminKey}`);
                if (res.ok) {
                    const data = await res.json();
                    setIsOnline(data.enabled);
                }
            } catch (err) {
                console.error("Erro ao buscar status da Eliza");
            }
        };
        if (adminKey) fetchStatus();
    }, [adminKey]);

    const toggle = async () => {
        const newState = !isOnline;
        setIsLoading(true);

        try {
            const res = await fetch('/api/admin/system-config', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-wolf-token': adminKey,
                },
                body: JSON.stringify({ enabled: newState }),
            });

            if (res.ok) {
                setIsOnline(newState);
            } else {
                const errorData = await res.json();
                console.error('API Error:', errorData.error);
            }
        } catch (err) {
            console.error('Network error:', err);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <button
            onClick={toggle}
            disabled={isLoading}
            className={`
                flex items-center gap-2.5 px-3 py-1.5 rounded-lg border transition-all duration-200 cursor-pointer select-none
                ${isLoading ? 'opacity-40 pointer-events-none' : ''}
                bg-white/[0.04] border-white/[0.08] hover:bg-white/[0.08] hover:border-white/[0.15]
            `}
        >
            {/* Dot indicator */}
            <div className="relative flex items-center justify-center">
                <div className={`w-2 h-2 rounded-full transition-colors duration-300 ${isOnline ? 'bg-emerald-400' : 'bg-zinc-600'}`} />
                {isOnline && !isLoading && (
                    <div className="absolute inset-0 w-2 h-2 rounded-full bg-emerald-400 animate-ping opacity-40" />
                )}
                {isLoading && (
                    <div className="absolute -inset-1 w-4 h-4 border border-white/20 border-t-transparent rounded-full animate-spin" />
                )}
            </div>

            <span className={`text-xs font-medium tracking-wide ${isOnline ? 'text-white/60' : 'text-white/30'}`}>
                {isOnline ? 'Online' : 'Offline'}
            </span>
        </button>
    );
}