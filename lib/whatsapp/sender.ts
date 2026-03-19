// lib/whatsapp/sender.ts

export async function sendWhatsAppMessage(phone: string, text: string) {
    const evoUrl = process.env.EVOLUTION_URL;
    const evoInstance = process.env.EVOLUTION_INSTANCE_NAME;
    const evoApiKey = process.env.EVOLUTION_API_KEY;

    if (!evoUrl || !evoInstance) {
        console.error('🚨 ERRO: URL ou Instância da Evolution API faltando no .env.local');
        return;
    }

    const url = `${evoUrl}/message/sendText/${evoInstance}`;
    
    // A Evolution aceita envio tanto com o ID formatado (ex: ...@s.whatsapp.net) 
    // ou apenas o número (ex: 5511999999999).
    const requestBody = {
        number: phone,
        text: text,
    };

    console.log(`📤 Enviando para Evolution API (${phone})...`);

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'apikey': evoApiKey || '',
            },
            body: JSON.stringify(requestBody),
        });

        const data = await response.json().catch(() => ({}));

        if (response.ok) {
            console.log(`✅ Mensagem enviada para ${phone}`);
            return data;
        } else {
            console.error(`❌ Erro na Evolution API ao enviar para ${phone}:`, data);
            return data;
        }
    } catch (error) {
        console.error('❌ Erro ao enviar mensagem via Evolution API:', error);
    }
}