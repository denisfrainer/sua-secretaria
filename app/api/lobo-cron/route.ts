// app/api/lobo-cron/route.ts
// 🐺 Lobo Prospectador — Cron Job
// Triggered every minute by Netlify Scheduled Functions.
// Fetches ONE pending lead, sends the bait via Z-API, updates status.

import { NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../lib/supabase/admin';

export async function GET(req: Request) {
    const tag = '🐺 [LOBO CRON]:';

    try {
        // ──────────────────────────────────────────────
        // 1. AUTH GUARD
        // ──────────────────────────────────────────────
        const authHeader = req.headers.get('authorization') || '';
        const token = authHeader.replace('Bearer ', '');

        if (!token || token !== process.env.CRON_SECRET) {
            console.log(`${tag} ❌ Acesso negado — token inválido.`);
            return new NextResponse('Unauthorized', { status: 401 });
        }

        // ──────────────────────────────────────────────
        // 2. FETCH ONE PENDING LEAD
        // ──────────────────────────────────────────────
        const { data: lead, error: fetchError } = await supabaseAdmin
            .from('leads_lobo')
            .select('id, nome, telefone')
            .eq('status', 'pendente')
            .order('criado_em', { ascending: true })
            .limit(1)
            .single();

        if (fetchError || !lead) {
            console.log(`${tag} 😴 Nenhum lead pendente. Descansando...`);
            return NextResponse.json({ message: 'Nenhum lead pendente' }, { status: 200 });
        }

        console.log(`${tag} 🎯 Lead encontrado: ${lead.nome} (${lead.telefone})`);

        // ──────────────────────────────────────────────
        // 3. SEND WHATSAPP MESSAGE VIA Z-API
        // ──────────────────────────────────────────────
        const zapiUrl = process.env.ZAPI_URL;
        const clientToken = process.env.ZAPI_CLIENT_TOKEN;

        if (!zapiUrl) {
            console.error(`${tag} 🚨 ZAPI_URL não configurada!`);
            return NextResponse.json({ error: 'Z-API URL missing' }, { status: 500 });
        }

        const phoneFormatted = lead.telefone.includes('@')
            ? lead.telefone
            : `${lead.telefone}@c.us`;

        const message = `Opa ${lead.nome}, tudo bem? Vi a sua empresa por aqui. Vocês já tão usando IA no atendimento ou ainda é tudo manual?`;

        console.log(`${tag} 📤 Disparando isca para ${lead.nome}...`);

        const zapiResponse = await fetch(zapiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Client-Token': clientToken || '',
            },
            body: JSON.stringify({
                phone: phoneFormatted,
                message,
            }),
        });

        if (!zapiResponse.ok) {
            const errorBody = await zapiResponse.text();
            console.error(`${tag} ❌ Z-API retornou erro ${zapiResponse.status}: ${errorBody}`);
            return NextResponse.json(
                { error: 'Z-API send failed', status: zapiResponse.status },
                { status: 502 }
            );
        }

        console.log(`${tag} ✅ Mensagem enviada com sucesso para ${lead.nome}!`);

        // ──────────────────────────────────────────────
        // 4. UPDATE LEAD STATUS → isca_enviada
        // ──────────────────────────────────────────────
        const { error: updateError } = await supabaseAdmin
            .from('leads_lobo')
            .update({ status: 'isca_enviada' })
            .eq('id', lead.id);

        if (updateError) {
            console.error(`${tag} ⚠️ Mensagem enviada, mas falha ao atualizar status:`, updateError);
            return NextResponse.json(
                { warning: 'Message sent but status update failed', leadId: lead.id },
                { status: 207 }
            );
        }

        console.log(`${tag} 🔄 Status atualizado para 'isca_enviada' — Lead ID: ${lead.id}`);

        // ──────────────────────────────────────────────
        // 5. SUCCESS
        // ──────────────────────────────────────────────
        return NextResponse.json({
            success: true,
            lead: { id: lead.id, nome: lead.nome },
            message: 'Isca enviada e status atualizado',
        });
    } catch (error) {
        console.error(`${tag} 💀 Erro crítico inesperado:`, error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
