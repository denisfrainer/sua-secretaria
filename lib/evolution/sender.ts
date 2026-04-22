// lib/evolution/sender.ts

export async function sendWhatsAppMessage(remoteJid: string, text: string, instanceName?: string) {
    const baseUrl = process.env.EVOLUTION_API_URL;
    const apiKey = process.env.EVOLUTION_API_KEY;
    const targetInstance = instanceName;

    if (!baseUrl || !apiKey || !targetInstance) {
        console.error('🚨 ERRO: Credenciais ou Instance Name da Evolution API faltando.');
        return;
    }

    try {
        const response = await fetch(`${baseUrl}/message/sendText/${targetInstance}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'apikey': apiKey,
            },
            body: JSON.stringify({
                number: remoteJid, // O número do cliente
                text: text,        // A mensagem que o Gemini escreveu
            }),
        });

        const data = await response.json();
        console.log(`✅ Mensagem enviada para ${remoteJid}`);
        return data;
    } catch (error) {
        console.error('❌ Erro ao enviar mensagem via Evolution API:', error);
    }
}