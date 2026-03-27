// scripts/agents/eliza-worker.ts
import { GoogleGenAI } from '@google/genai';
import { supabaseAdmin } from '../../lib/supabase/admin';
import { sendWhatsAppMessage, sendWhatsAppPresence } from '../../lib/whatsapp/sender';
import fs from 'fs';
import path from 'path';
import http from 'http';

process.env.TZ = 'America/Sao_Paulo';

const functionDeclarations: any[] = [
    {
        name: 'save_lead_data',
        description: 'Salva nome, empresa e dor do lead.',
        parameters: {
            type: 'OBJECT',
            properties: {
                phone: { type: 'STRING' },
                name: { type: 'STRING' },
                company: { type: 'STRING' },
                pain_point: { type: 'STRING' },
            },
            required: ['phone'],
        },
    }
];

async function executeToolCall(name: string, args: any, clientPhone: string) {
    if (name === 'save_lead_data') {
        await supabaseAdmin.from('leads_lobo').update({
            name: args.name,
            niche: args.company,
            main_pain: args.pain_point
        }).eq('phone', clientPhone);
        return { status: 'success' };
    }
    return { status: 'unknown' };
}

async function processLead(lead: any) {
    const clientNumber = lead.phone;
    try {
        await supabaseAdmin.from('leads_lobo').update({ status: 'eliza_analyzing' }).eq('id', lead.id);

        const { data: history } = await supabaseAdmin
            .from('messages')
            .select('role, content')
            .eq('lead_phone', clientNumber)
            .order('created_at', { ascending: true })
            .limit(20);

        const genAI = new GoogleGenAI({ apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY || '' });
        const model = (genAI as any).getGenerativeModel({
            model: "gemini-2.5-flash",
            tools: [{ functionDeclarations }]
        });

        const chat = model.startChat({
            history: (history || []).map((msg: any) => ({
                role: msg.role === 'assistant' ? 'model' : 'user',
                parts: [{ text: msg.content }],
            }))
        });

        const lastMsg = history && history.length > 0 ? history[history.length - 1].content : "Olá";
        const result = await chat.sendMessage(lastMsg);
        let response = result.response;

        let loopCount = 0;
        while (response.functionCalls()?.length && loopCount < 3) {
            loopCount++;
            const toolResults = [];
            for (const call of response.functionCalls()!) {
                const output = await executeToolCall(call.name, call.args, clientNumber);
                toolResults.push({ functionResponse: { name: call.name, response: output } });
            }
            const next = await chat.sendMessage(toolResults as any);
            response = next.response;
        }

        const finalText = response.text();

        // CORREÇÃO DO "C" MALDITO: Tipagem explícita no filter também
        const chunks = finalText.split('||')
            .map((c: string) => c.trim())
            .filter((c: string) => c !== '');

        await sendWhatsAppPresence(clientNumber, 'composing');

        let accumulatedDelay = 0;
        for (const chunk of chunks) {
            accumulatedDelay += 2000;
            await sendWhatsAppMessage(clientNumber, chunk, accumulatedDelay);
        }

        await supabaseAdmin.from('messages').insert({ lead_phone: clientNumber, role: 'assistant', content: finalText });
        await supabaseAdmin.from('leads_lobo').update({ status: 'waiting_reply' }).eq('id', lead.id);

    } catch (error) {
        console.error("❌ Erro Eliza:", error);
        await supabaseAdmin.from('leads_lobo').update({ status: 'waiting_reply' }).eq('id', lead.id);
    }
}

async function startPolling() {
    console.log('🔄 [WORKER] Escutando eliza_processing...');
    while (true) {
        try {
            const { data } = await supabaseAdmin.from('leads_lobo').select('*').eq('status', 'eliza_processing').limit(1);
            if (data && data.length > 0) await processLead(data[0]);
        } catch (e) { console.error(e); }
        await new Promise(r => setTimeout(r, 5000));
    }
}

// Servidor de Healthcheck para o Railway
const PORT = process.env.PORT || 8080;
http.createServer((req, res) => {
    res.writeHead(200);
    res.end('Online');
}).listen(PORT);

startPolling();