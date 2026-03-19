'use client';

import { useState } from 'react';

export default function ElizaToggle({ adminKey }: { adminKey: string }) {
    const [isOnline, setIsOnline] = useState(true);
    const [isLoading, setIsLoading] = useState(false);

    const toggle = async () => {
        const newState = !isOnline;
        setIsLoading(true);

        try {
            const res = await fetch('/api/admin/toggle-eliza', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${adminKey}`,
                },
                body: JSON.stringify({ active: newState }),
            });

            if (res.ok) {
                setIsOnline(newState);
            } else {
                console.error('Falha ao alternar Eliza');
            }
        } catch (err) {
            console.error('Erro de rede:', err);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <button
            onClick={toggle}
            disabled={isLoading}
            className={`
                group relative flex items-center gap-3 px-4 py-2.5 rounded-xl border
                transition-all duration-300 cursor-pointer select-none
                ${isLoading ? 'opacity-60 pointer-events-none' : ''}
                ${
                    isOnline
                        ? 'bg-emerald-950/40 border-emerald-500/40 hover:border-emerald-400/60 shadow-lg shadow-emerald-500/5'
                        : 'bg-zinc-900/60 border-zinc-700/50 hover:border-zinc-600/70'
                }
            `}
        >
            {/* Toggle Track */}
            <div
                className={`
                    relative w-11 h-6 rounded-full transition-colors duration-300
                    ${isOnline ? 'bg-emerald-500/80' : 'bg-zinc-700'}
                `}
            >
                {/* Toggle Knob */}
                <div
                    className={`
                        absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-md
                        transition-all duration-300 ease-in-out
                        ${isOnline ? 'left-[22px]' : 'left-0.5'}
                    `}
                >
                    {/* Loading spinner inside knob */}
                    {isLoading && (
                        <div className="absolute inset-0 flex items-center justify-center">
                            <div className="w-3 h-3 border-2 border-zinc-400 border-t-transparent rounded-full animate-spin" />
                        </div>
                    )}
                </div>

                {/* Glow ring when online */}
                {isOnline && !isLoading && (
                    <div className="absolute -inset-1 rounded-full bg-emerald-400/20 animate-pulse" />
                )}
            </div>

            {/* Label */}
            <div className="flex flex-col items-start">
                <span
                    className={`
                        text-xs font-bold tracking-wider uppercase
                        ${isOnline ? 'text-emerald-400' : 'text-zinc-500'}
                    `}
                >
                    {isOnline ? 'ONLINE' : 'SLEEPING'}
                </span>
                <span className="text-[10px] text-zinc-600 font-mono">
                    Eliza {isOnline ? '☀️' : '🌙'}
                </span>
            </div>
        </button>
    );
}
