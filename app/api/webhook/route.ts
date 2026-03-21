// app/api/webhook/route.ts
import { NextResponse } from 'next/server';
import { sendWhatsAppMessage } from '../../../lib/whatsapp/sender';
import { GoogleGenAI, Type } from '@google/genai';
import { supabaseAdmin } from '../../../lib/supabase/admin';
import { generatePrompt } from '../../../lib/agent/prompt';
import { normalizePhone } from '../../../lib/utils/phone';
import path from 'path';
import fs from 'fs';

// ==============================================================
// 🔧 FUNCTION DECLARATIONS (Google Gen AI format)
// ==============================================================
const functionDeclarations = [
    {
        name: 'save_lead_data',
        description: 'Salva as informações capturadas do lead (nome, empresa, faturamento, dor). Chame isso sempre que o usuário fornecer qualquer um desses dados.',
        parameters: {
            type: Type.OBJECT,
            properties: {
                phone: { type: Type.STRING, description: 'O número de telefone do lead' },
                name: { type: Type.STRING, description: 'Nome do lead' },
                company: { type: Type.STRING, description: 'Nome da empresa' },
                revenue: { type: Type.STRING, description: 'Faturamento total ou tamanho da equipe' },
                pain_point: { type: Type.STRING, description: 'O principal desafio ou dor relatada pelo cliente' },
            },
            required: ['phone'],
        },
    },
    {
        name: 'notify_human',
        description: 'Aciona um humano caso o lead esteja irritado, use palavrões, peça expressamente por uma pessoa, ou apresente uma objeção insolúvel.',
        parameters: {
            type: Type.OBJECT,
            properties: {
                reason: { type: Type.STRING, description: 'O motivo pelo qual o suporte humano está sendo requisitado' },
                chat_history: { type: Type.STRING, description: 'Resumo curto da conversa até o momento' },
            },
            required: ['reason'],
        },
    },
    {
        name: 'notify_human_specialist',
        description: 'Use this tool ONLY when the lead explicitly agrees to a meeting, asks to speak with a human specialist, or demonstrates high buying intent. This alerts the human sales team to take over the WhatsApp chat or send the calendar link.',
        parameters: {
            type: Type.OBJECT,
            properties: {
                urgency_level: { type: Type.STRING, description: 'Nível de urgência: "high" ou "medium"' },
                summary: { type: Type.STRING, description: 'Um breve resumo do que o lead deseja' },
            },
            required: ['urgency_level', 'summary'],
        },
    },
    {
        name: 'qualifyLeadContext',
        description: 'Usa esta função IMEDIATAMENTE após o lead responder à pergunta de bifurcação para extrair o gargalo do cliente e salvar no banco de dados.',
        parameters: {
            type: Type.OBJECT,
            properties: {
                main_bottleneck: { type: Type.STRING, description: "Se o cliente tem poucos contatos, retorne 'LACK_OF_TRAFFIC'. Se tem muitos mas demora a responder, retorne 'LACK_OF_TIME'. Se não estiver claro, retorne 'UNKNOWN'." },
                lead_temperature: { type: Type.STRING, description: "Retorne 'HOT' se pediu preço/urgência. 'WARM' se está tirando dúvidas. 'COLD' se foi rude ou sem interesse." },
                pain_summary: { type: Type.STRING, description: "Resumo em 1 frase (em português) sobre a dor relatada. Ex: 'Recebe contatos do Insta, mas demora 2h para responder.'" },
            },
            required: ['main_bottleneck', 'lead_temperature', 'pain_summary'],
        },
    },
    {
        name: "generatePagarmePix",
        description: "Usa esta função quando o lead decidir comprar. Gera um Pedido (Order) via Pagar.me e retorna a Chave PIX Copia e Cola.",
        parameters: {
            type: Type.OBJECT,
            properties: {
                product_id: {
                    type: Type.STRING,
                    enum: ["LP_EXPRESS", "SITE_ALTA_PERFORMANCE", "AGENTE_IA"],
                    description: "O ID do produto."
                },
                lead_email: {
                    type: Type.STRING,
                    description: "O e-mail do lead (solicite se não tiver)."
                },
                lead_name: {
                    type: Type.STRING,
                    description: "O nome do lead (solicite se não tiver)."
                }
            },
            required: ["product_id", "lead_email", "lead_name"]
        }
    },
    {
        name: "verifyPagarmeOrder",
        description: "Verifica na API do Pagar.me se o pedido (Order) foi pago via PIX.",
        parameters: {
            type: Type.OBJECT,
            properties: {
                order_id: {
                    type: Type.STRING,
                    description: "O ID do pedido gerado anteriormente (começa com 'or_')."
                }
            },
            required: ["order_id"]
        }
    }
];

// ==============================================================
// 🛠️ TOOL EXECUTION (Supabase writes)
// ==============================================================
async function executeToolCall(name: string, args: Record<string, any>, clientPhone: string): Promise<Record<string, any>> {
    if (name === 'save_lead_data') {
        console.log(`💾 [LEAD DATA CAPTURED]:`, args);
        const updateData: Record<string, any> = {};
        if (args.name) updateData.name = args.name;
        if (args.company) updateData.niche = args.company; // 'empresa' maps to 'niche' on the English schema conventionally 
        if (args.pain_point) updateData.main_pain = args.pain_point;
        if (args.revenue) updateData.revenue = args.revenue;
        updateData.status = 'talking'; // mapped 'em_conversacao' to 'talking' based on English schemas!

        const { error } = await supabaseAdmin
            .from('leads_lobo')
            .update(updateData)
            .eq('phone', args.phone);

        if (error) {
            console.error('❌ Erro ao atualizar lead no Supabase:', error);
            return { status: 'error', message: 'Falha ao salvar dados no banco.' };
        }
        return { status: 'success', message: 'Dados do lead salvos com sucesso.' };
    }

    if (name === 'notify_human') {
        console.log(`🚨 [HUMAN ESCALATION]: ${args.reason}`);
        return { status: 'escalated', message: 'Um especialista foi alertado.' };
    }

    if (name === 'notify_human_specialist') {
        console.log(`🔥 [HOT LEAD ALERT - Urgency: ${args.urgency_level}]: ${args.summary} | Phone: ${clientPhone}`);

        const { error } = await supabaseAdmin
            .from('leads_lobo')
            .update({ status: 'hot_lead' })
            .eq('phone', clientPhone);

        if (error) {
            console.error('❌ Erro ao atualizar status para hot_lead:', error);
            return { status: 'error', message: 'Falha ao notificar o especialista.' };
        }
        return { status: 'success', message: 'O especialista (Denis) foi notificado e assumirá o controle do chat em instantes.' };
    }

    if (name === 'qualifyLeadContext') {
        console.log(`🐺 [ELIZA] Extraindo inteligência:`, args);

        const { error } = await supabaseAdmin
            .from('leads_lobo')
            .update({
                main_bottleneck: args.main_bottleneck,
                lead_temperature: args.lead_temperature,
                pain_summary: args.pain_summary
            })
            .eq('phone', clientPhone);

        if (error) {
            console.error('❌ Erro ao salvar inteligência no Supabase:', error);
            return { status: 'error', message: 'Falha ao salvar inteligência do lead.' };
        }
        
        return { status: 'success', message: 'Database updated. Now reply to the user naturally based on this new context.' };
    }

    if (name === 'generatePagarmePix') {
        console.log(`🤑 [PAGAR.ME] Gerando Pedido PIX para: ${args.lead_name} (${args.product_id})`);
        
        let amountCents = 100000;
        if (args.product_id === 'LP_EXPRESS') amountCents = 99700;
        else if (args.product_id === 'SITE_ALTA_PERFORMANCE') amountCents = 250000;
        else if (args.product_id === 'AGENTE_IA') amountCents = 150000;

        const secretKey = process.env.PAGARME_SECRET_KEY;
        if (!secretKey) return { status: 'error', message: 'Chave Pagar.me não configurada no servidor.' };

        const auth = Buffer.from(`${secretKey}:`).toString('base64');

        const payload = {
            customer: { name: args.lead_name, email: args.lead_email, type: "individual" },
            items: [{ amount: amountCents, description: args.product_id, quantity: 1 }],
            payments: [{ payment_method: "pix", pix: { expires_in: 3600 } }]
        };

        try {
            const res = await fetch('https://api.pagar.me/core/v5/orders', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Basic ${auth}`
                },
                body: JSON.stringify(payload)
            });

            const pagarmeData = await res.json();
            if (!res.ok) {
                console.error("❌ Pagar.me Erro Order:", pagarmeData);
                return { status: 'error', message: 'Desculpe, o gateway de pagamento recusou a geração. Tente novamente mais tarde.' };
            }

            const orderId = pagarmeData.id;
            const qrCode = pagarmeData.charges?.[0]?.last_transaction?.qr_code;
            const pixKey = pagarmeData.charges?.[0]?.last_transaction?.qr_code_url;

            await supabaseAdmin.from('leads_lobo').update({ pagarme_order_id: orderId }).eq('phone', clientPhone);

            return { 
                status: 'success', 
                order_id: orderId, 
                qr_code: qrCode, 
                pix_key: pixKey,
                message: "Apresente a Chave Copia e Cola (qr_code) ao cliente para que ele efetue o pagamento. O pedido expira em 1 hora."
            };
        } catch (e: any) {
            console.error("❌ Pagar.me Exception:", e);
            return { status: 'error', message: 'Falha interna na comunicação com gateway financeiro.' };
        }
    }

    if (name === 'verifyPagarmeOrder') {
        console.log(`🔍 [PAGAR.ME] Verificando pedido: ${args.order_id}`);
        const secretKey = process.env.PAGARME_SECRET_KEY;
        if (!secretKey) return { status: 'error', message: 'Chave Pagar.me não configurada.' };
        const auth = Buffer.from(`${secretKey}:`).toString('base64');

        try {
            const res = await fetch(`https://api.pagar.me/core/v5/orders/${args.order_id}`, {
                headers: { 'Authorization': `Basic ${auth}` }
            });
            const pagarmeData = await res.json();

            if (pagarmeData.status === 'paid') {
                await supabaseAdmin.from('leads_lobo').update({ status: 'paid' }).eq('phone', clientPhone);
                return { 
                    status: 'PAID', 
                    message: "BINGO! O pagamento foi confirmado! Agradeça o lead por fechar com a Wolf Agent e acione a tool 'notify_human_specialist' para transferir o projeto." 
                };
            } else {
                return { 
                    status: 'PENDING', 
                    message: `O status na API consta como '${pagarmeData.status}'. Avise o lead que ainda não compensou na conta e peça pra confirmar ou esperar mais um minuto.` 
                };
            }
        } catch (e: any) {
            return { status: 'error', message: 'Não consegui checar o status devido a uma instabilidade no Pagar.me.' };
        }
    }

    return { status: 'error', message: `Ferramenta desconhecida: ${name}` };
}

// ==============================================================
// 📡 WEBHOOK HANDLER
// ==============================================================
export async function POST(req: Request) {
    let processingPhone = null; // Para cleanup no finally

    try {
        const body = await req.json();
        console.log("FULL EVOLUTION BODY:", JSON.stringify(body, null, 2));

        // 1. Filtro e Extração de Mensagem (Evolution API v2 e fallback antigo)
        let clientNumber = null;
        let clientMessage = null;
        let incomingMessageId = null;
        let isValidMessage = false;

        const isEvolution = body.event === 'MESSAGES_UPSERT' || body.event === 'messages.upsert';

        if (isEvolution) {
            let dataObj = body.data;
            // Evolution API v2 sometimes sends data as an array.
            if (Array.isArray(body.data)) {
                dataObj = body.data[0];
            }

            const remoteJid = dataObj?.key?.remoteJid || '';
            if (remoteJid.endsWith('@g.us')) {
                console.log('🔇 [WEBHOOK] Grupo ignorado:', remoteJid);
                return new NextResponse('Ignore Group', { status: 200 });
            }

            if (dataObj?.key) {
                const isFromMe = dataObj.key.fromMe === true;

                // Ensure clientNumber is extracted from the correct field prioritizing the real phone number (remoteJidAlt vs LID)
                const rawJid = (dataObj.key.remoteJidAlt && String(dataObj.key.remoteJidAlt).includes('@s.whatsapp.net'))
                    ? String(dataObj.key.remoteJidAlt)
                    : String(dataObj.key.remoteJid);

                clientNumber = normalizePhone(rawJid);
                incomingMessageId = dataObj.key.id;

                const messageObj = dataObj.message;
                if (messageObj) {
                    if (messageObj.audioMessage) {
                        console.log("🎙️ [WEBHOOK] Audio detectado. Acionando Background Function.");
                        
                        // Fire and forget background trigger
                        const reqUrl = new URL(req.url);
                        const backgroundUrl = `${reqUrl.origin}/api/webhook-audio-background`;
                        
                        fetch(backgroundUrl, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify(body)
                        }).catch(err => console.error("❌ Erro ao invocar Background Function de Áudio:", err));

                        return NextResponse.json({ status: "audio_processing_async" });
                    }

                    if (!messageObj.conversation && !messageObj.extendedTextMessage) {
                        console.log('🔇 [WEBHOOK] Mídia/Áudio ignorado.');
                        return NextResponse.json({ status: 'ignored', reason: 'media_not_supported' }, { status: 200 });
                    }
                    clientMessage = messageObj.conversation || messageObj.extendedTextMessage?.text || '';
                }

                if (clientMessage && clientMessage.trim().length > 0) {
                    if (isFromMe) {
                        const cmd = clientMessage.trim();
                        if (cmd === '/pausar') {
                            await supabaseAdmin.from('leads_lobo').update({ ai_paused: true }).eq('phone', clientNumber);
                            await sendWhatsAppMessage(clientNumber, "🛑 *[SISTEMA]* IA Pausada pelo Admin.");
                            return NextResponse.json({ status: 'admin_command', command: 'pausar' }, { status: 200 });
                        } else if (cmd === '/retomar') {
                            await supabaseAdmin.from('leads_lobo').update({ ai_paused: false }).eq('phone', clientNumber);
                            await sendWhatsAppMessage(clientNumber, "▶️ *[SISTEMA]* IA Reativada.");
                            return NextResponse.json({ status: 'admin_command', command: 'retomar' }, { status: 200 });
                        }
                        
                        // Ignore other fromMe messages early
                        return NextResponse.json({ status: 'ignored', reason: 'fromMe_not_command' }, { status: 200 });
                    }

                    isValidMessage = true;
                }
            }
        } else if (body.isGroup === false && body.text && body.text.message) {
            const isFromMe = body.fromMe === true;
            clientNumber = normalizePhone(body.phone || '');
            incomingMessageId = body.id || `msg_${Date.now()}`;
            clientMessage = body.text.message;
            if (clientMessage && clientMessage.trim().length > 0) {
                if (isFromMe) {
                    const cmd = clientMessage.trim();
                    if (cmd === '/pausar') {
                        await supabaseAdmin.from('leads_lobo').update({ ai_paused: true }).eq('phone', clientNumber);
                        await sendWhatsAppMessage(clientNumber, "🛑 *[SISTEMA]* IA Pausada pelo Admin.");
                        return NextResponse.json({ status: 'admin_command', command: 'pausar' }, { status: 200 });
                    } else if (cmd === '/retomar') {
                        await supabaseAdmin.from('leads_lobo').update({ ai_paused: false }).eq('phone', clientNumber);
                        await sendWhatsAppMessage(clientNumber, "▶️ *[SISTEMA]* IA Reativada.");
                        return NextResponse.json({ status: 'admin_command', command: 'retomar' }, { status: 200 });
                    }
                    
                    return NextResponse.json({ status: 'ignored', reason: 'fromMe_not_command' }, { status: 200 });
                }

                isValidMessage = true;
            }
        }

        if (isValidMessage && clientNumber && clientMessage) {
            console.log(`📥 NOVA MENSAGEM de ${clientNumber}: "${clientMessage}"`);

            // 🛡️ [SHIELD] Step 2: Keyword Blacklist (common Brazilian auto-reply phrases)
            const autoReplyKeywords = [
                'bem-vindo', 'bem vindo', 'horário de atendimento', 'neste momento não',
                'digite 1', 'menu principal', 'mensagem automática', 'em breve retornaremos',
                'agradece o contato', 'assistente virtual', 'escolha uma opção',
                'opção inválida', 'digite o número', 'selecione uma'
            ];
            const msgLower = clientMessage.toLowerCase();
            if (autoReplyKeywords.some(kw => msgLower.includes(kw))) {
                console.log(`🛡️ [SHIELD] Auto-reply detected (Keywords) from ${clientNumber}: "${clientMessage}". Ignoring.`);
                return NextResponse.json({ status: 'ignored', reason: 'auto_reply_keyword' }, { status: 200 });
            }

            // 🔴 GLOBAL KILL SWITCH: Check if Eliza is turned OFF in system_settings
            const { data: killSwitchData } = await supabaseAdmin
                .from('system_settings')
                .select('value')
                .eq('key', 'global_kill_switch')
                .single();

            if (killSwitchData && killSwitchData.value?.enabled === false) {
                console.log(`🔴 [GLOBAL KILL SWITCH] Eliza está DESLIGADA. Ignorando mensagem de ${clientNumber}.`);
                return NextResponse.json({ status: 'ignored', reason: 'eliza_globally_off' }, { status: 200 });
            }

            // --- DEBOUNCER / BATCHING LOGIC START ---

            // 2. Fetch Lead
            let { data: lead, error: leadError } = await supabaseAdmin
                .from('leads_lobo')
                .select('*')
                .eq('phone', clientNumber)
                .maybeSingle();

            if (leadError) {
                console.error('❌ Erro ao buscar lead no Supabase:', leadError);
            }

            // 🛡️ FRIENDLY FIRE PROTECTION: Mark as replied so Ghost Hunter ignores them
            if (lead) {
                await supabaseAdmin
                    .from('leads_lobo')
                    .update({ replied: true })
                    .eq('phone', clientNumber);
                console.log(`✅ [WEBHOOK] Lead ${clientNumber} respondeu. Marcado para ignorar no Ghost Hunter.`);
            }

            // 🛡️ [SHIELD] Step 1: Speed Trap (reply arrived too fast = auto-reply)
            if (lead?.updated_at) {
                const timeSinceContact = Date.now() - new Date(lead.updated_at).getTime();
                if (timeSinceContact < 15000) {
                    console.log(`🛡️ [SHIELD] Auto-reply detected (Too fast: ${Math.round(timeSinceContact)}ms < 15s) from ${clientNumber}. Ignoring.`);
                    return NextResponse.json({ status: 'ignored', reason: 'auto_reply_speed_trap', delta_ms: timeSinceContact }, { status: 200 });
                }
            }

            // 🚨 CIRCUIT BREAKER: Lock if reply_count >= 10 (AI Loop War Prevention)
            if (lead && (lead.reply_count || 0) >= 10) {
                console.log(`🚨 [CIRCUIT BREAKER] Bot Loop detectado para lead ${clientNumber}. Travando conversa.`);
                await supabaseAdmin
                    .from('leads_lobo')
                    .update({ is_locked: true, status: 'needs_human', ai_paused: true })
                    .eq('phone', clientNumber);
                return NextResponse.json({ status: 'locked', reason: 'circuit_breaker_reply_limit' }, { status: 200 });
            }

            // ⏱️ COOLDOWN: 5+ messages in under 2 minutes = auto-lock (Anti-Spam)
            if (lead) {
                const twoMinAgo = new Date(Date.now() - 2 * 60 * 1000).toISOString();
                const { count } = await supabaseAdmin
                    .from('chat_history')
                    .select('*', { count: 'exact', head: true })
                    .eq('whatsapp_number', clientNumber)
                    .eq('role', 'user')
                    .gte('created_at', twoMinAgo);

                if ((count || 0) >= 5) {
                    console.log(`🚨 [CIRCUIT BREAKER] Spam detectado de ${clientNumber}: ${count} msgs em 2min. Travando.`);
                    await supabaseAdmin
                        .from('leads_lobo')
                        .update({ is_locked: true, status: 'needs_human', ai_paused: true })
                        .eq('phone', clientNumber);
                    return NextResponse.json({ status: 'locked', reason: 'cooldown_spam_detected' }, { status: 200 });
                }
            }

            // 🔒 LOCKED CHECK: If already locked, stop immediately
            if (lead && lead.is_locked === true) {
                console.log(`🔒 [CIRCUIT BREAKER] Lead ${clientNumber} está travado. Ignorando.`);
                return NextResponse.json({ status: 'ignored', reason: 'lead_locked' }, { status: 200 });
            }

            // Kill Switch: Human Takeover
            if (lead && (lead as any).ai_paused === true) {
                console.log(`🛑 [KILL SWITCH ATIVO] Humano no controle para o número: ${clientNumber}`);
                return NextResponse.json({ status: 'ignored', reason: 'human_takeover' }, { status: 200 });
            }

            // 3. Create lead if new
            if (!lead) {
                console.log(`🌱 Lead novo. Criando registro como organico_inbound...`);
                const { data: newLead } = await supabaseAdmin.from('leads_lobo').insert({
                    phone: clientNumber,
                    status: 'organico_inbound',
                    name: 'Lead inbound',
                    message_buffer: '',
                    is_processing: false,
                }).select().single();

                lead = newLead;
            }

            // --- SERVERLESS DEBOUNCE LOGIC ---
            
            // 4. Save Message to Database IMMEDIATELY
            await supabaseAdmin.from('chat_history').insert({
                whatsapp_number: clientNumber,
                role: 'user',
                content: clientMessage,
                message_id: incomingMessageId
            });

            // 5. The 3-Second Holding Pattern
            console.log(`🕒 [DEBOUNCE] Aguardando 3s por possíveis mensagens seguidas de ${clientNumber}...`);
            await new Promise(resolve => setTimeout(resolve, 3000));

            // 6. The "Survival" Check
            const { data: latestMsg } = await supabaseAdmin
                .from('chat_history')
                .select('message_id')
                .eq('whatsapp_number', clientNumber)
                .order('created_at', { ascending: false })
                .limit(1)
                .single();

            // Compare local incomingMessageId with latest message_id in DB
            if (latestMsg && latestMsg.message_id !== incomingMessageId) {
                console.log(`🛡️ [DEBOUNCE] Newer message detected. Aborting execution for msg: ${incomingMessageId}`);
                return NextResponse.json({ status: "ignored_replaced_by_newer" });
            }

            console.log(`🚀 [DEBOUNCE] Sobrevivente: ${incomingMessageId}. Processando resposta conjunta...`);

            // --- GODSPEED UNIFICATION (Pre-Flight Context) ---
            let leadContext = '';

            if (lead) {
                if (lead.status === 'contacted') {
                    leadContext = `\n\n[CONTEXTO DO LEAD]:
Atenção: Você está falando com ${lead.name || 'o cliente'}. Nosso sistema automatizado acabou de enviar uma isca perguntando se eles usam IA no atendimento. Continue a conversa a partir dessa premissa, qualificando a dor deles de forma natural.
Empresa/Nicho: ${lead.niche || 'Não informada'}.
Dor Principal: ${lead.main_pain || 'Não informada'}.`;

                    await supabaseAdmin
                        .from('leads_lobo')
                        .update({ status: 'talking' })
                        .eq('phone', clientNumber);
                    console.log(`🔄 Status do lead atualizado para 'talking'`);
                } else {
                    leadContext = `\n\n[CONTEXTO DO LEAD]:
Você está falando com ${lead.name || 'o cliente'}.
O status atual dele na base é: ${lead.status}.
Empresa/Nicho: ${lead.niche || 'Não informada'}.
Dor Principal: ${lead.main_pain || 'Não informada'}.
${lead.status === 'pending' ? 'Este lead veio de uma prospecção ativa via Lobo. Use isso a seu favor.' : ''}`;
                }
            }

            if (lead?.status === 'organico_inbound') {
                leadContext = `\n\n[CONTEXTO DO LEAD]: Este é um lead orgânico inbound novo. Ele acabou de mandar mensagem. Colete o Nome, Empresa e Dor para salvar usando a tool.`;
            }

            // 7. Busca o cérebro do Agente no Banco de Dados
            const { data: config, error: configError } = await supabaseAdmin
                .from('agent_configs')
                .select('*, organizations(name)')
                .limit(1)
                .single();

            if (configError || !config) {
                console.log('🚨 ERRO: Agente não encontrado no banco de dados.');
                return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
            }

            // 8. RECUPERAR AS ÚLTIMAS 10 MENSAGENS (Memória de Curto Prazo)
            const { data: history } = await supabaseAdmin
                .from('chat_history')
                .select('role, content')
                .eq('whatsapp_number', clientNumber)
                .order('created_at', { ascending: false })
                .limit(10);

            const chatHistory = (history || []).reverse();

            // 11. Prepara o System Prompt
            // 1. Carregando o Cérebro da Wolf Agent
            const contextPath = path.join(process.cwd(), 'business_context.json');
            const businessContext = fs.readFileSync(contextPath, 'utf8');

            // 2. Definindo o System Prompt Híbrido (Lógica em Inglês, Casca em Português)
            const elizaSystemPrompt = `
# 1. IDENTITY & CORE MISSION
You are Eliza, Senior Strategy Consultant and Executive Assistant to Denis, founder of Wolf Agent (a company that builds automated sales machines, high-performance websites, and AI Agents).
Your PRIMARY OBJECTIVE is NOT to simply answer questions. Your goal is to QUALIFY the lead, diagnose their main bottleneck (lack of traffic vs. lack of time), and set the stage for Denis to close the deal.
NEVER provide full pricing before the 'Gold Bifurcation Question'. Your ULTIMATE GOAL is to guide the lead through qualification, close the sale via PIX, verify payment, and handle the transition to Denis.

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
${businessContext}
`;

            let systemPrompt = elizaSystemPrompt;
            systemPrompt += leadContext;
            systemPrompt += `\n\n[IMPORTANTE - CAPTURA DE DADOS]: Sempre que usar a ferramenta 'save_lead_data', você OBRIGATORIAMENTE deve passar o número de telefone do usuário: '${clientNumber}' no parâmetro 'phone'.`;
            systemPrompt += `\n\n[IMPORTANTE - REGRAS DE AGENDAMENTO/HANDOFF]:
1. É estritamente PROIBIDO sugerir ligações telefônicas tradicionais.
2. Prefira continuar o fechamento via WhatsApp de forma assíncrona ou sugerir uma rápida chamada de vídeo (Meet/Zoom).
3. Quando o lead concordar com uma reunião, pedir para falar com um humano, ou demonstrar alta intenção de compra, você DEVE acionar a ferramenta 'notify_human_specialist' imediatamente.`;

            // 12. BUILD CONTENTS ARRAY (Google Gen AI format)
            const contents: any[] = chatHistory.map((msg: any) => ({
                role: msg.role === 'assistant' ? 'model' : 'user',
                parts: [{ text: msg.content }],
            }));

            // 13. CALL GEMINI VIA @google/genai
            console.log('🧠 IA Pensando com base no histórico e contexto do lead...');
            const ai = new GoogleGenAI({ apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY });

            const genConfig: any = {
                tools: [{ functionDeclarations }],
                systemInstruction: systemPrompt,
            };

            let response = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents,
                config: genConfig,
            });

            // 14. FUNCTION CALLING LOOP (max 3 rounds)
            let finalText = response.text || '';
            let loopCount = 0;

            while (response.functionCalls && response.functionCalls.length > 0 && loopCount < 3) {
                loopCount++;
                const fc = response.functionCalls[0];
                console.log(`🔧 [TURN ${loopCount}] Tool chamada: ${fc.name}(${JSON.stringify(fc.args)})`);

                const toolResult = await executeToolCall(fc.name!, fc.args as Record<string, any>, clientNumber);
                console.log(`✅ [TURN ${loopCount}] Resultado da tool:`, toolResult);

                const functionResponsePart = {
                    name: fc.name!,
                    response: toolResult,
                    id: fc.id,
                };

                contents.push(response.candidates![0].content);
                contents.push({
                    role: 'user',
                    parts: [{ functionResponse: functionResponsePart }],
                });

                response = await ai.models.generateContent({
                    model: 'gemini-2.5-flash',
                    contents,
                    config: genConfig,
                });

                finalText = response.text || '';
                console.log(`🗣️ [TURN ${loopCount}] IA respondeu: "${finalText}"`);
            }

            // 15. FALLBACK
            if (!finalText || finalText.trim() === '') {
                console.log('⚠️ IA retornou string vazia. Usando fallback.');
                finalText = 'Entendi! E como funciona o processo hoje?';
            }

            console.log(`🗣️ RESPOSTA FINAL: "${finalText}"`);

            // 16. SALVAR A RESPOSTA DA IA NA MEMÓRIA
            await supabaseAdmin.from('chat_history').insert({
                whatsapp_number: clientNumber,
                role: 'assistant',
                content: finalText,
            });

            // 🤖 ANTI-ROBOT: Simular tempo de digitação usando Evolution API
            const minDelay = 8000;
            const maxDelay = 14000;
            const humanDelayMs = Math.floor(Math.random() * (maxDelay - minDelay + 1)) + minDelay;
            console.log(`⏳ Simulando digitação de ${humanDelayMs}ms via Evolution API...`);

            // 17. Envia a mensagem de volta para o cliente no WhatsApp (retorno imediato para Netlify)
            await sendWhatsAppMessage(clientNumber, finalText, humanDelayMs);

            // 📊 CIRCUIT BREAKER: Increment reply_count after Eliza responds
            try {
                await supabaseAdmin.rpc('increment_reply_count', { lead_phone: clientNumber });
                console.log(`📊 [CIRCUIT BREAKER] reply_count incrementado para ${clientNumber}`);
            } catch {
                // Fallback if RPC doesn't exist: manual increment
                const { data: currentLead } = await supabaseAdmin
                    .from('leads_lobo')
                    .select('reply_count')
                    .eq('phone', clientNumber)
                    .single();
                await supabaseAdmin
                    .from('leads_lobo')
                    .update({ reply_count: ((currentLead?.reply_count || 0) + 1) })
                    .eq('phone', clientNumber);
                console.log(`📊 [CIRCUIT BREAKER] reply_count incrementado via fallback para ${clientNumber}`);
            }

            return NextResponse.json({ status: 'success' });
        }

        return NextResponse.json({ status: 'ignored_event' });
    } catch (error) {
        console.error('❌ Erro Crítico no Webhook:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    } finally {
        // --- CLEANUP ---
        // Debounce doesn't use locks anymore, so no cleanup is needed here immediately.
    }
}