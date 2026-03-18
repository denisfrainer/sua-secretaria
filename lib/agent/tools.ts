import { z } from 'zod';

export const tools = {
    // ==========================================
    // 🛠️ TOOL 1: Analisador de URL
    // ==========================================
    analyze_url: {
        description: 'Analisa o site atual do cliente para encontrar falhas de conversão (CRO) e mobile.',
        parameters: z.object({
            url: z.string().describe('A URL do site ou Instagram do cliente que precisa ser analisada'),
        }),
        execute: async (args: { url: string }) => {
            console.log(`Analisando URL: ${args.url}`);
            return {
                status: 'success',
                has_mobile_optimization: false,
                message: 'O site atual é lento no celular e não possui botões de chamada para ação claros.',
            };
        },
    },

    // ==========================================
    // 💸 TOOL 2: Gerador de PIX (Fechamento)
    // ==========================================
    gerar_pix: {
        description: 'Gera a cobrança via PIX quando o cliente concorda em comprar a Landing Page Express.',
        parameters: z.object({
            customer_name: z.string().describe('O nome do cliente para registrar a cobrança'),
        }),
        execute: async (args: { customer_name: string }) => {
            console.log(`Gerando PIX de R$ 600 para: ${args.customer_name}`);
            return {
                status: 'success',
                amount: 600,
                pix_code: '00020126580014br.gov.bcb.pix0136chave-aleatoria-pix-denis-600',
            };
        },
    },

    // ==========================================
    // 🚨 TOOL 3: Acionar o Humano (Escalonamento)
    // ==========================================
    transferir_humano: {
        description: 'Transfere o atendimento para o Denis (humano) se o cliente pedir desconto, fizer perguntas complexas ou ficar irritado.',
        parameters: z.object({
            reason: z.string().describe('O motivo exato pelo qual o humano foi chamado'),
        }),
        execute: async (args: { reason: string }) => {
            console.log(`🚨 ALERTA HUMANO ACIONADO. Motivo: ${args.reason}`);
            return {
                status: 'escalated',
                message: 'Alertei o Engenheiro Chefe. Ele já vai assumir o atendimento.',
            };
        },
    },
};