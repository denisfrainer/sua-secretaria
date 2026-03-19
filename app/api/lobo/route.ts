// app/api/lobo/route.ts
import { NextResponse } from 'next/server';
import { sendWhatsAppMessage } from '../../../lib/whatsapp/sender';

// Helper for the anti-ban delay
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function POST(req: Request) {
    try {
        // 1. Security Check
        const token = req.headers.get('x-wolf-token');
        if (!token || token !== process.env.WOLF_SECRET_TOKEN) {
            return new NextResponse('Unauthorized', { status: 401 });
        }

        // 2. Parse Payload
        const body = await req.json();
        const leads = body.leads;

        if (!Array.isArray(leads) || leads.length === 0) {
            return NextResponse.json({ error: 'Invalid or empty leads array' }, { status: 400 });
        }

        // 3. Fire and Forget Processing
        // Start background processing without awaiting to return 200 OK fast
        processLeads(leads).catch((err) => {
            console.error('❌ Erro no processamento em background do Lobo:', err);
        });

        return NextResponse.json({ status: 'processing started', leadsCount: leads.length });
    } catch (error) {
        console.error('❌ Erro Crítico na Rota do Lobo:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

async function processLeads(leads: any[]) {
    console.log(`🐺 LOBO INICIANDO CAÇADA: ${leads.length} leads na lista.`);
    
    for (const lead of leads) {
        if (!lead.phone || !lead.name) {
            console.log(`⚠️ Lead ignorado (dados incompletos):`, lead);
            continue;
        }

        // Delay handling (random 15000ms - 35000ms)
        const delay = Math.floor(Math.random() * 20000) + 15000;
        console.log(`⏳ Lobo aguardando ${delay / 1000}s antes de abordar ${lead.name}...`);
        
        await sleep(delay);

        // Construct message
        const message = `Opa ${lead.name}, tudo bem? Vi sua empresa por aqui. Vocês já tão usando IA no atendimento ou ainda é tudo na mão?`;

        // Send via Z-API (sendWhatsAppMessage adds @c.us if needed)
        try {
            await sendWhatsAppMessage(lead.phone, message);
        } catch (err) {
            console.error(`❌ Lobo falhou ao enviar mensagem para ${lead.name}:`, err);
        }
    }
    
    console.log(`🏁 LOBO FINALIZOU A CAÇADA!`);
}
