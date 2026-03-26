// lib/whatsapp/sender.ts

import { withWhatsAppLock } from '../utils/whatsapp-lock';

export async function sendWhatsAppMessage(phone: string, text: string, delayMs?: number) {
    return withWhatsAppLock(async () => {
        const instanceName = process.env.EVOLUTION_INSTANCE_NAME;
        const apikey = process.env.EVOLUTION_API_KEY;
        const baseUrl = process.env.EVOLUTION_API_URL || process.env.EVOLUTION_URL;

        // Força a tipagem explícita para número inteiro. A Evolution API rejeita floats ou strings disfarçadas.
        const finalDelay = Math.round(delayMs || 2000);

        // O payload da Evolution V2+
        const payload = {
            number: phone,
            text: text,
            delay: finalDelay, // Injeção na raiz do objeto (Garante o enfileiramento nativo)
            presence: "composing", // Aciona o status "Digitando..."
            options: {
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
            throw new Error(`Evolution API Error ${res.status}: ${JSON.stringify(data.message || data)}`);
        }

        return data;
    });
}

// --- 🆕 ADICIONE ESTA FUNÇÃO AQUI EMBAIXO ---

/**
 * Verifica se um número possui conta no WhatsApp (Check Number)
 * Essencial para evitar erros de "exists:false" que queimam o chip.
 */
export async function checkWhatsAppNumber(phone: string): Promise<boolean> {
    const instanceName = process.env.EVOLUTION_INSTANCE_NAME;
    const apikey = process.env.EVOLUTION_API_KEY;
    const baseUrl = process.env.EVOLUTION_API_URL || process.env.EVOLUTION_URL;

    // Limpa o número para garantir que não vá caracteres especiais
    const cleanPhone = phone.replace(/\D/g, '');

    const url = `${baseUrl}/chat/whatsappNumbers/${instanceName}`;

    try {
        const res = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'apikey': apikey as string
            },
            body: JSON.stringify({
                numbers: [cleanPhone]
            })
        });

        const data = await res.json().catch(() => ([]));

        // A Evolution retorna um array. Verificamos o primeiro item.
        if (Array.isArray(data) && data.length > 0) {
            return data[0].exists === true;
        }

        return false;
    } catch (error) {
        console.error(`❌ Erro técnico ao checar WhatsApp de ${phone}:`, error);
        return false;
    }
}

export async function sendWhatsAppPresence(phone: string, presence: 'composing' | 'recording_audio' | 'available') {
    const instanceName = process.env.EVOLUTION_INSTANCE_NAME;
    const apikey = process.env.EVOLUTION_API_KEY;
    const baseUrl = process.env.EVOLUTION_API_URL || process.env.EVOLUTION_URL;

    const url = `${baseUrl}/chat/sendPresence/${instanceName}`;

    const payload = {
        number: phone,
        delay: 15000,
        presence: presence
    };

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
        console.error(`Evolution API Presence Error ${res.status}: ${JSON.stringify(data.message || data)}`);
    }

    return data;
}

export async function markWhatsAppRead(phone: string, messageId: string) {
    const instanceName = process.env.EVOLUTION_INSTANCE_NAME;
    const apikey = process.env.EVOLUTION_API_KEY;
    const baseUrl = process.env.EVOLUTION_API_URL || process.env.EVOLUTION_URL;

    const url = `${baseUrl}/chat/markMessageAsRead/${instanceName}`;

    const payload = {
        readMessages: [
            {
                remoteJid: phone,
                fromMe: false,
                id: messageId
            }
        ]
    };

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
        console.error(`Evolution API MarkRead Error ${res.status}: ${JSON.stringify(data.message || data)}`);
    }

    return data;
}