// app/api/webhook/route.ts
import { NextResponse } from 'next/server';
import { sendWhatsAppMessage } from '../../../lib/whatsapp/sender';

export async function POST(req: Request) {
    try {
        const body = await req.json();

        // A Z-API manda as mensagens recebidas neste formato de evento:
        if (body.isGroup === false && body.text && body.text.message) {
            const senderNumber = body.phone;
            const textMessage = body.text.message;

            // Ignora mensagens que nós mesmos enviamos
            if (body.fromMe) {
                return NextResponse.json({ status: 'ignored', reason: 'from_me' });
            }

            console.log(`📥 NOVA MENSAGEM de ${senderNumber}: "${textMessage}"`);

            // ========================================================
            // O TESTE DO PAPAGAIO (Antes de plugar a IA)
            // ========================================================
            const respostaTeste = `Z-API conectada, Diretor! Você disse: "${textMessage}"`;
            await sendWhatsAppMessage(senderNumber, respostaTeste);

            return NextResponse.json({ status: 'success' });
        }

        return NextResponse.json({ status: 'ignored_event' });
    } catch (error) {
        console.error('❌ Erro no Webhook da Z-API:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}