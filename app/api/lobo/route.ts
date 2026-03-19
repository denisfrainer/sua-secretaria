// app/api/lobo/route.ts
import { NextResponse } from 'next/server';
import { sendWhatsAppMessage } from '../../../lib/whatsapp/sender';
import { supabaseAdmin } from '../../../lib/supabase/admin';

// Helper for the anti-ban delay
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function POST(req: Request) {
    console.log('--- REQUISIÇÃO RECEBIDA NO LOBO ---');
    try {
        // 1. Security Check
        const token = req.headers.get('x-wolf-token');
        if (!token || token !== process.env.WOLF_SECRET_TOKEN) {
            console.log('⚠️ Token inválido ou ausente:', token);
            return new NextResponse('Unauthorized', { status: 401 });
        }

        // 2. Parse Payload
        let body;
        try {
            body = await req.json();
            console.log('📦 Payload recebido:', body);
        } catch (err) {
            console.error('❌ Erro ao ler JSON da requisição:', err);
            return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 });
        }

        let leadsToProcess = [];

        // Check if manual prospect test is requested
        const manualPhone = body.testPhone || body.test_number || body.number;

        if (manualPhone) {
            console.log(`🧪 TESTE MANUAL: Disparando para o número ${manualPhone}`);
            leadsToProcess = [{
                id: 'test-id',
                name: body.testName || body.name || 'Lead Teste',
                phone: manualPhone
            }];
        } else {
            // Pull leads from Supabase table 'leads_lobo'
            console.log(`📥 Buscando leads na tabela leads_lobo...`);
            const { data: leads, error } = await supabaseAdmin
                .from('leads_lobo')
                .select('*')
                .limit(50); // Get up to 50 leads

            if (error) {
                console.error('❌ Erro ao buscar leads no Supabase:', error);
                return NextResponse.json({ error: 'Database error' }, { status: 500 });
            }
            
            leadsToProcess = leads || [];
        }

        if (leadsToProcess.length === 0) {
            return NextResponse.json({ error: 'No leads found to process or empty test payload' }, { status: 400 });
        }

        // 3. Fire and Forget Processing
        // Start background processing without awaiting to return 200 OK fast
        const isManualTest = !!(body.testPhone || body.test_number || body.number);
        processLeads(leadsToProcess, !isManualTest).catch((err) => {
            console.error('❌ Erro no processamento em background do Lobo:', err);
        });

        return NextResponse.json({ status: 'processing started', leadsCount: leadsToProcess.length });
    } catch (error) {
        console.error('❌ Erro Crítico na Rota do Lobo:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

async function processLeads(leads: any[], isFromDb: boolean) {
    console.log(`🐺 LOBO INICIANDO CAÇADA: ${leads.length} leads na lista.`);
    
    for (const lead of leads) {
        if (!lead.phone || !lead.name) {
            console.log(`⚠️ Lead ignorado (dados incompletos):`, lead);
            continue;
        }

        // Delay handling (random 15000ms - 35000ms)
        let delay = Math.floor(Math.random() * 20000) + 15000;
        if (!isFromDb) {
            delay = 2000; // Small delay for testing
        }

        console.log(`⏳ Lobo aguardando ${delay / 1000}s antes de abordar ${lead.name}...`);
        await sleep(delay);

        // Construct message
        const message = `Opa ${lead.name}, tudo bem? Vi sua empresa por aqui. Vocês já tão usando IA no atendimento ou ainda é tudo na mão?`;

        // Send via Evolution API v2
        try {
            const result = await sendWhatsAppMessage(lead.phone, message);
            
            // Optional: you could mark the lead as contacted in the database here
            // if (isFromDb && lead.id && result) {
            //     await supabaseAdmin.from('leads_lobo').update({ status: 'contacted' }).eq('id', lead.id);
            // }
        } catch (err) {
            console.error(`❌ Lobo falhou ao enviar mensagem para ${lead.name}:`, err);
        }
    }
    
    console.log(`🏁 LOBO FINALIZOU A CAÇADA!`);
}
