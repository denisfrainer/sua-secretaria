'use client';

import React, { useState } from 'react';
import { Power } from 'lucide-react';
import { updateSystemPrompt } from '@/app/[locale]/dashboard/actions';

export function AgentSettings({ agentId, initialPrompt }: { agentId: string, initialPrompt: string }) {
    const [promptText, setPromptText] = useState(initialPrompt);
    const [isLoading, setIsLoading] = useState(false);
    const [isSaved, setIsSaved] = useState(false);

    const handleSave = async () => {
        if (!agentId) return;
        setIsLoading(true);
        setIsSaved(false);
        try {
            await updateSystemPrompt(agentId, promptText);
            setIsSaved(true);
            setTimeout(() => setIsSaved(false), 3000); // Feedback visual temporário
        } catch (error) {
            console.error('Erro ao salvar prompt:', error);
            alert('Erro ao salvar prompt.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="bg-[#1E1E1E] border border-[#2C2C2C] rounded-none p-6 shadow-none">
            <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-semibold flex items-center gap-2 font-heading text-white">
                    Configuração do Agente
                </h3>
                <button 
                    onClick={handleSave}
                    disabled={isLoading}
                    className="bg-white hover:bg-gray-200 text-black font-bold px-4 py-2 rounded-none text-sm transition shadow-none disabled:bg-gray-400 font-body"
                >
                    {isLoading ? 'Salvando...' : isSaved ? 'Salvo!' : 'Salvar Alterações'}
                </button>
            </div>

            <div className="space-y-4">
                <p className="text-xs text-[#888888] font-body">Personalize o comportamento e as regras de atendimento da sua IA.</p>
                <textarea
                    value={promptText}
                    onChange={(e) => setPromptText(e.target.value)}
                    className="bg-[#1E1E1E] border border-[#2C2C2C] text-white p-4 rounded-none w-full h-64 outline-none focus:border-white resize-none font-body text-sm"
                    placeholder="Ex: Seu nome é Nexus, um atendente educado..."
                />
            </div>
        </div>
    );
}
