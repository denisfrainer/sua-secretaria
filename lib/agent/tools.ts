import { z } from 'zod';

export const tools = {
    // ==========================================
    // 💾 TOOL: Salvar Dados do Lead
    // ==========================================
    save_lead_data: {
        description: 'Salva as informações capturadas do lead (nome, empresa, faturamento, dor). Chame isso sempre que o usuário fornecer qualquer um desses dados.',
        parameters: z.object({
            phone: z.string().describe('O número de telefone do lead (para identificação na base de dados)'),
            name: z.string().optional().describe('Nome do lead'),
            company: z.string().optional().describe('Nome da empresa'),
            revenue: z.union([z.string(), z.number()]).optional().describe('Faturamento total ou tamanho da equipe'),
            pain_point: z.string().optional().describe('O principal desafio ou dor relatada pelo cliente'),
        }),
        execute: async (args: any) => {
            console.log(`💾 [LEAD DATA CAPTURED]:`, args);
            
            try {
                const { supabaseAdmin } = await import('../supabase/admin');
                
                const updateData: any = {};
                if (args.name) updateData.nome = args.name;
                if (args.company) updateData.empresa = args.company;
                if (args.pain_point) updateData.dor_principal = args.pain_point;
                if (args.revenue) updateData.faturamento = args.revenue;
                // For structure safety, let's keep status 'em_conversacao'
                updateData.status = 'em_conversacao';

                const { error } = await supabaseAdmin
                    .from('leads_lobo')
                    .update(updateData)
                    .eq('telefone', args.phone);

                if (error) {
                    console.error('❌ Erro ao atualizar lead no Supabase:', error);
                    return { status: 'error', message: 'Falha ao salvar dados no banco.' };
                }

                return {
                    status: 'success',
                    message: 'Dados do lead registrados com sucesso no banco de dados. Obrigado.',
                };
            } catch (err) {
                 console.error('❌ Erro inesperado ao atualizar lead:', err);
                 return { status: 'error', message: 'Erro ao processar atualização' };
            }
        },
    },

    // ==========================================
    // 🚨 TOOL: Notificar Humano (Escalonamento)
    // ==========================================
    notify_human: {
        description: 'Aciona um humano caso o lead esteja irritado, use palavrões, peça expressamente por uma pessoa, ou apresente uma objeção insolúvel.',
        parameters: z.object({
            reason: z.string().describe('O motivo exacto pelo qual o suporte humano está sendo requisitado'),
            chat_history: z.string().optional().describe('Resumo curto da conversa até o momento'),
        }),
        execute: async (args: { reason: string; chat_history?: string }) => {
            console.log(`🚨 [HUMAN ESCALATION]: ${args.reason}`);
            return {
                status: 'escalated',
                message: 'Um especialista foi alertado e assumirá a conversa.',
            };
        },
    },
};