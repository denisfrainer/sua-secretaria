import { google } from '@ai-sdk/google'; // Ou 'anthropic' se preferir o Claude
import { generateText, stepCountIs } from 'ai';
import { supabaseAdmin } from '../../../lib/supabase/admin'; // Use sua lib do supabase
import { generatePrompt } from '../../../lib/agent/prompt';
import { tools } from '../../../lib/agent/tools'; // Importa as ferramentas

export async function POST(req: Request) {
    const { message, whatsappNumber } = await req.json();

    // 1. Busca a configuração do agente no banco pelo número do WhatsApp
    const { data: config, error } = await supabaseAdmin
        .from('agent_configs')
        .select('*, organizations(name)')
        .eq('whatsapp_number', whatsappNumber)
        .single();

    if (error || !config) return new Response('Agent not found', { status: 404 });

    // 2. Monta o Prompt Dinâmico
    const systemPrompt = generatePrompt(config.organizations.name, config.system_prompt);

    // 3. Executa a IA (Aqui a mágica acontece)
    const { text } = await generateText({
        model: google('gemini-1.5-pro-latest'), // O modelo de 2026!
        system: systemPrompt,
        prompt: message,
        tools: tools, // Adiciona as ferramentas
        stopWhen: stepCountIs(5), // Executa até 5 passos de ferramentas
    });

    return Response.json({ response: text });
}