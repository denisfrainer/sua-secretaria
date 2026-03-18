import { google } from '@ai-sdk/google';
import { generateText } from 'ai';
import { supabaseAdmin } from '../../../lib/supabase/admin';
import { generatePrompt } from '../../../lib/agent/prompt';
import { tools } from '../../../lib/agent/tools';

export async function POST(req: Request) {
    const { message, whatsappNumber } = await req.json();

    // 1. Busca a configuração
    const { data: config, error } = await supabaseAdmin
        .from('agent_configs')
        .select('*, organizations(name)')
        .eq('whatsapp_number', whatsappNumber)
        .single();

    if (error || !config) return new Response('Agent not found', { status: 404 });

    // 2. Monta o Prompt
    const systemPrompt = generatePrompt(config.organizations.name, config.system_prompt);

    // 3. Executa a IA (Com a Marreta do Diretor)
    const { text } = await generateText({
        model: google('gemini-1.5-pro-latest'),
        system: systemPrompt,
        prompt: message,
        tools: tools as any, // 👈 Calando a boca do TypeScript nas ferramentas
        // @ts-ignore
        maxSteps: 5,         // 👈 Calando a boca do TypeScript no loop
    });

    return Response.json({ response: text });
}