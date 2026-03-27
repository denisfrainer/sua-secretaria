// scripts/agents/eliza-worker.ts
import { sendWhatsAppMessage, sendWhatsAppPresence } from '../../lib/whatsapp/sender';
import { supabaseAdmin } from '../../lib/supabase/admin';
import { GoogleGenAI, Type } from '@google/genai';
import path from 'path';
import fs from 'fs';

// ==============================================================
// 🔧 DECLARAÇÕES DE FERRAMENTAS (Tipagem Blindada)
// ==============================================================
const functionDeclarations: any[] = [
    {
        name: 'save_lead_data',
        description: 'Salva as informações capturadas do lead.',
        parameters: {
            type: Type.OBJECT,
            properties: {
                phone: { type: Type.STRING, description: 'Telefone do lead' },
                name: { type: Type.STRING, description: 'Nome do lead' },
                company: { type: Type.STRING, description: 'Nome da empresa' },
                revenue: { type: Type.STRING, description: 'Faturamento' },
                pain_point: { type: Type.STRING, description: 'Dor do cliente' },
            },
            required: ['phone'],
        },
    },
    {
        name: 'notify_human_specialist',
        description: 'Aciona Denis para leads com alta intenção de compra.',
        parameters: {
            type: Type.OBJECT,
            properties: {
                urgency_level: { type: Type.STRING, description: 'high ou medium' },
                summary: { type: Type.STRING, description: 'Resumo do desejo do lead' },
            },
            required: ['urgency_level', 'summary'],
        },
    },
    {
        name: 'qualifyLeadContext',
        description: 'Extrai o gargalo do cliente após a bifurcação.',
        parameters: {
            type: Type.OBJECT,
            properties: {
                main_bottleneck: { type: Type.STRING, description: 'LACK_OF_TRAFFIC ou LACK_OF_TIME' },
                lead_temperature: { type: Type.STRING, description: 'HOT, WARM ou COLD' },
                pain_summary: { type: Type.STRING, description: 'Resumo da dor' },
                lead_source: { type: Type.STRING, description: 'Origem do lead' }
            },
            required: ['main_bottleneck', 'lead_temperature', 'pain_summary', 'lead_source'],
        },
    }
];

// ==============================================================
// 🛠️ EXECUÇÃO DE TOOLS
// ==============================================================
async function executeToolCall(name: string, args: Record<string, any>, clientPhone: string) {
    console.log(`🔧 [TOOL] ${name} para ${clientPhone}`);

    if (name === 'save_lead_data') {
        await supabaseAdmin.from('leads_lobo').update({
            name: args.name,
            niche: args.company,
            main_pain: args.pain_point,
            revenue: args.revenue,
            status: 'talking'
        }).eq('phone', clientPhone);
        return { status: 'success' };
    }

    if (name === 'notify_human_specialist') {
        await supabaseAdmin.from('leads_lobo').update({ status: 'hot_lead' }).eq('phone', clientPhone);
        return { status: 'success' };
    }

    if (name === 'qualifyLeadContext') {
        await supabaseAdmin.from('leads_lobo').update({
            main_bottleneck: args.main_bottleneck,
            lead_temperature: args.lead_temperature,
            pain_summary: args.pain_summary,
            lead_source: args.lead_source
        }).eq('phone', clientPhone);
        return { status: 'success' };
    }

    return { status: 'error', message: 'Tool desconhecida' };
}

// ==============================================================
// 🤖 LÓGICA DO SDR (Conversão de Rota para Worker)
// ==============================================================
async function processLeadMessage(lead: any) {
    const clientNumber = lead.phone;

    // 1. Busca Histórico
    const { data: history } = await supabaseAdmin
        .from('messages')
        .select('role, content')
        .eq('lead_phone', clientNumber)
        .order('created_at', { ascending: true })
        .limit(20);

    const chatHistory = history || [];

    // 2. Contexto de Negócio (Lendo o JSON local)
    const contextPath = path.join(process.cwd(), 'business_context.json');
    const businessContext = fs.readFileSync(contextPath, 'utf8');

    const ai = new GoogleGenAI({ apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY });

    // Prepara o prompt igual ao seu route.ts original
    const systemPrompt = `Você é a Eliza SDR da meatende.ai... [Prompt Completo] ... Contexto: ${businessContext}`;

    const contents: any[] = chatHistory.map(msg => ({
        role: msg.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: msg.content }],
    }));

    if (contents.length === 0) contents.push({ role: 'user', parts: [{ text: 'Olá' }] });

    try {
        let response = await ai.models.generateContent({
            model: 'gemini-2.5-flash', // Use a versão estável que você prefere
            contents,
            config: {
                tools: [{ functionDeclarations }],
                systemInstruction: systemPrompt,
            },
        });

        let finalText = response.text || '';
        let loopCount = 0;

        // Loop de Function Calling (Lógica Silicon)
        while (response.functionCalls && response.functionCalls.length > 0 && loopCount < 3) {
            loopCount++;
            const fc = response.functionCalls[0];
            const toolResult = await executeToolCall(fc.name!, fc.args as any, clientNumber);

            contents.push(response.candidates![0].content);
            contents.push({
                role: 'user',
                parts: [{ functionResponse: { name: fc.name!, response: toolResult, id: fc.id } }],
            });

            response = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents,
                config: { tools: [{ functionDeclarations }], systemInstruction: systemPrompt },
            });

            if (response.text) finalText += " || " + response.text;
        }

        // 3. Disparo via Evolution API
        const chunks = finalText.split('||').map(c => c.trim()).filter(c => c !== '');
        let delay = 0;
        for (const chunk of chunks) {
            delay += Math.max(2000, chunk.length * 60);
            await sendWhatsAppMessage(clientNumber, chunk, delay);
        }

        // 4. Salva e Atualiza
        await supabaseAdmin.from('messages').insert({ lead_phone: clientNumber, role: 'assistant', content: finalText });
        await supabaseAdmin.from('leads_lobo').update({ status: 'waiting_reply' }).eq('id', lead.id);

    } catch (error) {
        console.error(`❌ Erro Eliza (${clientNumber}):`, error);
        await supabaseAdmin.from('leads_lobo').update({ status: 'waiting_reply' }).eq('id', lead.id);
    }
}

async function main() {
    console.log("🐺 [ELIZA] Cérebro iniciado via @google/genai.");
    while (true) {
        try {
            const { data: leads } = await supabaseAdmin
                .from('leads_lobo')
                .select('*')
                .in('status', ['qualified', 'eliza_processing'])
                .limit(3);

            if (leads && leads.length > 0) {
                for (const lead of leads) {
                    await processLeadMessage(lead);
                }
            }
        } catch (err) {
            console.error("⚠️ Erro no loop:", err);
        }
        await new Promise(r => setTimeout(r, 10000));
    }
}

main();