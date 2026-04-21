// app/api/webhook-audio-background/route.ts
// SQL Command to add the column:
// ALTER TABLE leads_lobo ADD COLUMN needs_human BOOLEAN DEFAULT FALSE;

import { NextResponse } from 'next/server';
import { sendWhatsAppMessage } from '../../../lib/whatsapp/sender';
import { GoogleGenAI } from '@google/genai';
import { normalizePhone } from '../../../lib/utils/phone';
import { supabaseAdmin } from '../../../lib/supabase/admin';
import { hasAccess } from '../../../lib/auth/access-control';
import { PlanTier } from '../../../lib/supabase/types';
import path from 'path';
import fs from 'fs';

export const maxDuration = 60; // Extend Netlify timeout for heavy multimodal inference

function bufferToBase64(buffer: ArrayBuffer) {
    return Buffer.from(buffer).toString('base64');
}

export async function POST(req: Request) {
    try {
        const body = await req.json();

        // 1. Extração de Mensagem (Evolution API v2)
        let dataObj = body.data;
        if (Array.isArray(body.data)) {
            dataObj = body.data[0];
        }

        if (!dataObj?.key) {
            return NextResponse.json({ status: 'ignored', reason: 'invalid_format' });
        }

        const rawJid = (dataObj.key.remoteJidAlt && String(dataObj.key.remoteJidAlt).includes('@s.whatsapp.net'))
            ? String(dataObj.key.remoteJidAlt)
            : String(dataObj.key.remoteJid);

        const clientNumber = normalizePhone(rawJid);

        // 🛡️ SILICON TWEAK DOUBLE LOCK: Check if AI is paused or needs human before processing audio
        const { data: profile } = await supabaseAdmin
            .from('profiles')
            .select('id, ai_paused, needs_human')
            .eq('phone', clientNumber)
            .maybeSingle();

        if (profile && (profile.ai_paused === true || profile.needs_human === true)) {
            console.log(`🛑 [SILICON TWEAK] Eliza silenciada para áudio em background de ${clientNumber} (AI Pausada ou Needs Human).`);
            return NextResponse.json({ status: 'ignored', reason: 'ai_paused_or_needs_human' }, { status: 200 });
        }

        const instanceName = body.instance || (process.env.NEXT_PUBLIC_INSTANCE_NAME || 'secretaria');

        // --- 🛡️ TIER ACCESS CONTROL (L2 GATE) ---
        const { data: config } = await supabaseAdmin
            .from('business_config')
            .select('plan_tier')
            .eq('instance_name', instanceName)
            .single();

        const currentTier = (config?.plan_tier as PlanTier) || 'STARTER';
        if (!hasAccess(currentTier, 'AI_CONFIGURATION')) {
            console.warn(`[AUTH_ABORT] Access denied for ${instanceName}. Plan ${currentTier} fails AI check.`);
            return new NextResponse('Access required PRO tier', { status: 403 });
        }

        const audioMsg = dataObj.message?.audioMessage;

        if (!audioMsg) {
            return NextResponse.json({ error: "No audio message found" });
        }

        console.log(`🎙️ [BACKGROUND AUDIO] Processando áudio de ${clientNumber}...`);

        let audioBase64 = "";
        let audioUrl = audioMsg.url || dataObj.base64;

        if (audioUrl) {
            if (audioUrl.startsWith('http')) {
                // Evolução API proveu uma S3/Minio URL
                const audioResponse = await fetch(audioUrl);
                const audioBuffer = await audioResponse.arrayBuffer();
                audioBase64 = bufferToBase64(audioBuffer);
            } else {
                // Já é base64
                audioBase64 = audioUrl.includes('base64,') ? audioUrl.split('base64,')[1] : audioUrl;
            }
        } else if (dataObj.message?.base64) {
            audioBase64 = dataObj.message.base64;
            if (audioBase64.includes('base64,')) audioBase64 = audioBase64.split('base64,')[1];
        }

        if (!audioBase64 || audioBase64 === "") {
            console.error("❌ [BACKGROUND AUDIO] Áudio indisponível ou configurado sem base64 na Evolution.");
            return NextResponse.json({ error: "No audio data" });
        }

        // 1. Carregando o Cérebro da Sua SecretarIA
        const contextPath = path.join(process.cwd(), 'business_context.json');
        const businessContext = fs.readFileSync(contextPath, 'utf8');

        // 2. Definindo o System Prompt
        const elizaSystemPrompt = `
# 1. IDENTITY & CORE MISSION
You are Eliza, Senior Strategy Consultant and Executive Assistant to Denis, founder of Sua SecretarIA (a company that builds automated sales machines, high-performance websites, and AI Agents).
Your PRIMARY OBJECTIVE is NOT to simply answer questions. Your goal is to QUALIFY the lead, diagnose their main bottleneck (lack of traffic vs. lack of time), and set the stage for Denis to close the deal.
Your ULTIMATE GOAL is to guide the lead through qualification, close the sale via PIX, verify payment, and handle the transition to Denis.

# 2. STRICT RULES & GUARDRAILS
- CONSTRAINT 1: NEVER hallucinate or invent services, prices, or deadlines. ALWAYS base your answers STRICTLY on the "BUSINESS CONTEXT" section below.
- CONSTRAINT 2: NEVER send a menu or list of services. You must diagnose the client's pain point first.
- CONSTRAINT 3: NEVER use gerunds in Portuguese (e.g., do not say "vou estar verificando", say "vou verificar").
- CONSTRAINT 4: NEVER act like a generic telemarketing bot. Keep responses EXTREMELY BRIEF (maximum of 2 short paragraphs).
- CONSTRAINT 5: If the user asks if you are an AI, proudly admit it using the exact phrase provided in the Playbook.

# 3. TOM DE VOZ E PERSONALIDADE (Tone of Voice)
- Seu tom é de uma especialista do Vale do Silício, mas com a pegada "parceira", direta e ágil do Brasil.
- Você é simpática, mas vai direto ao ponto. Não enrola o cliente.
- Use linguagem natural de WhatsApp. Pode usar um leve "rs" ou um emoji (😉, 🚀, 🐺) de vez em quando, mas sem poluir o texto.

# 4. O PLAYBOOK DE VENDAS (The Sales Framework)
STEP 1 - A PERGUNTA DE BIFURCAÇÃO (MANDATORY):
Em toda primeira interação, após saudar o lead, você DEVE fazer a seguinte pergunta para diagnosticar a dor da empresa:
"Pra eu te direcionar pra solução exata, me tira uma dúvida rápida: hoje o maior gargalo de vocês é que pouca gente chama no WhatsApp, ou até chama bastante gente, mas falta braço/tempo pra responder todo mundo rápido?"
-> Se faltar tráfego/pessoas: O foco é vender o Site/LP Express.
-> Se faltar tempo/muitas mensagens: O foco é vender Agentes de IA.

STEP 1.5 - A DESCOBERTA DA ORIGEM (MANDATORY FOR ORGANIC LEADS):
Se o lead iniciou a conversa do zero e a origem é desconhecida, encaixe uma pergunta natural no meio do bate-papo para descobrir de onde ele veio. 
Exemplo: "Ah, e por curiosidade, como você conheceu a Sua SecretarIA? Foi indicação de alguém, achou no Instagram ou pelo Google?"

STEP 2 - O FECHAMENTO (THE HANDSHAKE):
NUNCA termine a conversa passivamente dizendo "Fico à disposição". Se o lead já entendeu a solução, chame o Denis para fechar:
"Posso pedir pro Denis assumir aqui pra te passar os valores e como implementaríamos isso pra vocês essa semana?"

STEP 3 - A COBRANÇA (THE ASK):
If the lead agrees to buy, ask for their full name and email (if unknown). Then call \`generatePagarmePix\`. Once you get the QR code, say: 'Perfeito! Gerei aqui. É só escanear o QR Code ou usar a Chave Copia e Cola abaixo. Assim que você pagar, o sistema já verifica e a gente começa o briefing!😉 \n\n[INJECT_QR_CODE_TEXT_HERE]'

STEP 4 - O BAT-SINAL (HANDOFF):
If you call \`verifyPagarmeOrder\` and it returns 'PAID', stop all automation for this number. Say something like: 'Pagamento confirmado!🙌 Maravilha, [Nome], já estamos oficialmente no projeto. O Denis já foi notificado e vai assumir aqui pra te passar os próximos passos. Enquanto isso, já preenche esse forms pra gente adiantar o briefing: [INSIRA_LINK_DO_FORMS]'

STEP 5 - LIDANDO COM A PERGUNTA "VOCÊ É UM ROBÔ?":
Se perguntarem, responda exatamente nesta linha:
"Haha sou a Eliza, a IA assistente do Denis! Ele montou meu cérebro pra adiantar os atendimentos da Wolf, mas consigo resolver 90% por aqui. Como posso te ajudar hoje?"

# 5. EXEMPLOS DE DIÁLOGO (FEW-SHOT PROMPTING)
User: "Qual o valor do site?"
Eliza: "Antes de falarmos de investimento, preciso entender seu cenário! Hoje o maior desafio de vocês é que pouca gente chama, ou chama bastante mas falta tempo pra responder rápido?"

User: "Cara, a gente não tem tempo de responder ninguém, é uma loucura."
Eliza: "Imaginei! É uma dor clássica. Nesse caso, um site novo não resolve, o que vocês precisam é de um Agente Autônomo de WhatsApp (uma IA inteligente) pra atender e filtrar essa galera 24h por dia, igual eu tô fazendo com você agora rs. Posso pedir pro Denis assumir o chat pra te mostrar como ele instala isso pra vocês?"

User: "Achei meio caro"
Eliza: "Entendo perfeitamente que o fluxo de caixa é importante. Mas me diz uma coisa: quanto custa pra sua empresa hoje continuar perdendo clientes que procuram vocês no Google e não acham nada? É uma taxa única justamente pra tapar esse ralo financeiro de vez."

# 6. BUSINESS CONTEXT (Base de Conhecimento Oficial)
Use STRICTLY the following information to answer business-related questions:
\${businessContext}
`;

        const ai = new GoogleGenAI({ apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY });

        const contents: any[] = [
            {
                role: 'user',
                parts: [
                    { inlineData: { data: audioBase64, mimeType: 'audio/ogg' } },
                    { text: "Analise o áudio acima. O lead está falando português do Brasil. Transcreva e depois responda naturalmente seguindo seu System Prompt da Eliza." }
                ]
            }
        ];

        console.log(`🧠 [BACKGROUND AUDIO] Analisando áudio de \${clientNumber} via Gemini 1.5 Pro...`);

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents,
            config: {
                systemInstruction: elizaSystemPrompt
            }
        });

        const finalText = response.text || "Desculpe, meu sistema falhou em processar a mídia. Pode repetir em texto?";

        console.log(`🗣️ [BACKGROUND AUDIO] IA respondeu ao áudio: "\${finalText}"`);

        // Simulando delay de resposta e enviando (entre 8s e 14s como configurado na arquitetura serverless)
        const minDelay = 8000;
        const maxDelay = 14000;
        const humanDelayMs = Math.floor(Math.random() * (maxDelay - minDelay + 1)) + minDelay;

        await sendWhatsAppMessage(clientNumber, finalText, humanDelayMs);

        return NextResponse.json({ status: "success" });
    } catch (error: any) {
        console.error("❌ ERRO CRÍTICO NO BACKGROUND DE ÁUDIO:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
