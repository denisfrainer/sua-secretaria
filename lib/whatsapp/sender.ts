// lib/whatsapp/sender.ts

export async function sendWhatsAppMessage(phone: string, text: string) {
    const zapiUrl = process.env.ZAPI_URL;
    const clientToken = process.env.ZAPI_CLIENT_TOKEN;

    if (!zapiUrl) {
        console.error('🚨 ERRO: URL da Z-API faltando no .env.local');
        return;
    }

    try {
        const response = await fetch(`${zapiUrl}/send-text`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Client-Token': clientToken || '',
            },
            body: JSON.stringify({
                phone: phone, // A Z-API já entende o número direto
                message: text,
            }),
        });

        const data = await response.json();
        console.log(`✅ Mensagem enviada para ${phone}`);
        return data;
    } catch (error) {
        console.error('❌ Erro ao enviar mensagem via Z-API:', error);
    }
}