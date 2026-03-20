// lib/whatsapp/sender.ts

export async function sendWhatsAppMessage(phone: string, text: string) {
    const instanceName = process.env.EVOLUTION_INSTANCE_NAME;
    const apikey = process.env.EVOLUTION_API_KEY;
    const baseUrl = process.env.EVOLUTION_API_URL;

    // Calcula o tempo de digitação: 50ms por letra. Min: 2s, Max: 5s.
    const typingTime = Math.min(Math.max(text.length * 50, 2000), 5000); 

    // O Padrão Evolution V2+
    const payload = {
        number: phone,
        text: text, // 🎯 A MUDANÇA DE OURO ESTÁ AQUI (na raiz do objeto)
        options: {
            delay: typingTime,
            presence: "composing",
            linkPreview: false
        }
    };

    const url = `${baseUrl}/message/sendText/${instanceName}`;

    const res = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'apikey': apikey as string
        },
        body: JSON.stringify(payload)
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
        // We use JSON.stringify to reveal the hidden '[Object]' error details
        throw new Error(`Evolution API Error ${res.status}: ${JSON.stringify(data.message || data)}`);
    }

    return data;
}