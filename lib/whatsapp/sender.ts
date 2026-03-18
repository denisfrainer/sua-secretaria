// lib/whatsapp/sender.ts

export async function sendWhatsAppMessage(phone: string, text: string) {
    const zapiUrl = process.env.ZAPI_URL;
    const clientToken = process.env.ZAPI_CLIENT_TOKEN;

    if (!zapiUrl) {
        console.error('🚨 ERRO: URL da Z-API faltando no .env.local');
        return;
    }

    const formattedPhone = phone.includes('@') ? phone : `${phone}@c.us`;
    const url = `${zapiUrl}/send-text`;
    const requestBody = {
        phone: formattedPhone,
        message: text,
    };

    console.log('📤 Enviando para Z-API...');

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Client-Token': clientToken || '',
            },
            body: JSON.stringify(requestBody),
        });

        const data = await response.json();

        if (response.ok) {
            console.log(`✅ Mensagem enviada para ${formattedPhone}`);
            return data;
        } else {
            console.error(`❌ Erro no Z-API ao enviar para ${formattedPhone}`);
            return data;
        }
    } catch (error) {
        console.error('❌ Erro ao enviar mensagem via Z-API:', error);
    }
}