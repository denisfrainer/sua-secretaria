// app/api/webhook/route.ts
import { NextResponse } from 'next/server';
import { sendWhatsAppMessage } from '../../../lib/whatsapp/sender';
import { google } from '@ai-sdk/google';
import { generateText } from 'ai';
import { supabaseAdmin } from '../../../lib/supabase/admin';
import { generatePrompt } from '../../../lib/agent/prompt';
import { tools } from '../../../lib/agent/tools';

export async function POST(req: Request) {
    try {
        const body = await req.json();

        // 1. Filtro de Segurança: Só ouve mensagens diretas de texto (ignora grupos e o próprio bot)
        if (body.isGroup === false && body.text && body.text.message && !body.fromMe) {
            const clientNumber = body.phone; // O número do cliente que mandou a mensagem
            const clientMessage = body.text.message; // O texto que ele digitou

            console.log(`📥 NOVA MENSAGEM de ${clientNumber}: "${clientMessage}"`);

            // 2. Busca o cérebro do Agente no Banco de Dados
            // Como estamos no MVP, vamos puxar o primeiro agente configurado no seu Supabase
            const { data: config, error } = await supabaseAdmin
                .from('agent_configs')
                .select('*, organizations(name)')
                .limit(1)
                .single();

            if (error || !config) {
                console.log('🚨 ERRO: Agente não encontrado no banco de dados.');
                return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
            }

            // 3. Prepara a mente do robô (O Prompt)
            const systemPrompt = generatePrompt(config.organizations.name, config.system_prompt);

            // 4. Aciona a IA com a Marreta do Diretor (Pensa, usa ferramentas e responde)
            console.log('🧠 IA Pensando...');
            const { text } = await generateText({
                model: google('gemini-1.5-pro-latest'),
                system: systemPrompt,
                prompt: clientMessage,
                tools: tools as any,
                // @ts-ignore
                maxSteps: 5,
            });

            console.log(`🗣️ IA RESPONDEU: "${text}"`);

            // 5. Envia a mensagem de volta para o cliente no WhatsApp
            await sendWhatsAppMessage(clientNumber, text);

            return NextResponse.json({ status: 'success' });
        }

        return NextResponse.json({ status: 'ignored_event' });
    } catch (error) {
        console.error('❌ Erro Crítico no Webhook:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}