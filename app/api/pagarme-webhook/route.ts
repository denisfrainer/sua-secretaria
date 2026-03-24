// app/api/pagarme-webhook/route.ts
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../lib/supabase/admin';
import { sendWhatsAppMessage } from '../../../lib/whatsapp/sender';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
    console.log('\n--- 🤑 INICIANDO WEBHOOK PAGAR.ME ---');
    try {
        const body = await req.json();

        // 1. Filtro de Evento: Só nos importamos se o pedido foi PAGO
        // O Pagar.me v5 dispara 'order.paid' quando o PIX é confirmado
        if (body.type !== 'order.paid') {
            console.log(`[PAGAR.ME] Evento ignorado: ${body.type}`);
            return NextResponse.json({ status: 'ignored_event' }, { status: 200 });
        }

        const order = body.data;
        const orderId = order.id; // Ex: or_XXXXXXXXXXXXXXXX
        console.log(`💰 [PIX RECEBIDO] Processando pedido: ${orderId} | Valor: R$ ${(order.amount / 100).toFixed(2)}`);

        // 2. Encontrar o lead atrelado a este pedido no Supabase
        const { data: lead, error: fetchError } = await supabaseAdmin
            .from('leads_lobo')
            .select('*')
            .eq('pagarme_order_id', orderId)
            .single();

        if (fetchError || !lead) {
            console.error(`❌ ERRO: Nenhum lead encontrado para o order_id: ${orderId}`);
            return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
        }

        // 3. Idempotência: Se o lead já estiver marcado como 'paid', encerra para não mandar msg duplicada
        if (lead.status === 'paid') {
            console.log(`[IDEMPOTÊNCIA] Lead ${lead.phone} já processado como PAGO.`);
            return NextResponse.json({ status: 'already_processed' }, { status: 200 });
        }

        // 4. Atualizar status no Supabase e pausar a IA (handoff pro Denis)
        const { error: updateError } = await supabaseAdmin
            .from('leads_lobo')
            .update({
                status: 'paid',
                ai_paused: true // Desliga a Eliza permanentemente para este lead
            })
            .eq('pagarme_order_id', orderId);

        if (updateError) {
            console.error('❌ Erro ao atualizar status no banco:', updateError);
            return NextResponse.json({ error: 'Database update failed' }, { status: 500 });
        }

        // 5. Notificar o Cliente via WhatsApp
        const firstName = lead.name ? lead.name.split(' ')[0] : 'Cliente';
        const clientMessage = `🎉 *Pagamento Confirmado!* \n\nRecebemos o seu PIX, ${firstName}! Muito obrigado pela confiança na Wolf Agent.\n\nO Denis já foi notificado, nossa IA foi pausada neste chat, e ele vai assumir o atendimento em instantes para darmos o pontapé inicial no projeto. 🐺🚀`;

        await sendWhatsAppMessage(lead.phone, clientMessage);
        console.log(`✅ Mensagem de sucesso enviada para o cliente: ${lead.phone}`);

        // 6. Notificar você (Admin) via WhatsApp para assumir o controle
        // Certifique-se de que a variável ADMIN_PHONE está no seu .env no formato internacional (ex: 554899999999)
        const adminPhone = process.env.ADMIN_PHONE;
        if (adminPhone) {
            const adminMessage = `🚨 *VENDA FECHADA - PIX RECEBIDO!* 💰\n\n*Lead:* ${lead.name}\n*Telefone:* ${lead.phone}\n*Nicho:* ${lead.niche || 'Não preenchido'}\n*Valor:* R$ ${(order.amount / 100).toFixed(2)}\n\nA Eliza já pausou a automação para este número e avisou o cliente. *Assuma o chat agora!*`;
            await sendWhatsAppMessage(adminPhone, adminMessage);
            console.log(`📲 Alerta de venda enviado para o Admin.`);
        } else {
            console.log(`⚠️ ADMIN_PHONE não configurado no .env. Alerta interno ignorado.`);
        }

        return NextResponse.json({ success: true }, { status: 200 });

    } catch (error) {
        console.error('❌ Erro Crítico no Webhook do Pagar.me:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}