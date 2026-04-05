// lib/whatsapp/sender.ts
import axios from 'axios';
import { withWhatsAppLock } from '../utils/whatsapp-lock';

const getBaseUrl = () => (process.env.EVOLUTION_API_URL || process.env.EVOLUTION_URL || "").replace(/\/$/, "");

export async function sendWhatsAppMessage(phone: string, text: string, delayMs?: number, instanceName?: string) {
    return withWhatsAppLock(async () => {
        const targetInstance = instanceName || process.env.EVOLUTION_INSTANCE_NAME || 'agente-lobo';
        const apikey = process.env.EVOLUTION_API_KEY;
        const url = `${getBaseUrl()}/message/sendText/${targetInstance}`;

        // Ensure number is strictly digits for Evolution v2
        const cleanNumber = phone.replace(/\D/g, '');

        const payload = {
            number: cleanNumber,
            text: text,
            delay: Math.round(delayMs || 1200),
            linkPreview: false
        };

        // CRIANDO UM TIMEOUT DE "GUERRA" (2 minutos)
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 120000);

        try {
            console.log(`📤 [SENDER] Payload para ${targetInstance}:`, JSON.stringify(payload));

            const res = await axios.post(url, payload, {
                headers: {
                    'apikey': apikey as string,
                    'Content-Type': 'application/json'
                },
                signal: controller.signal,
                timeout: 110000,
                proxy: false
            });

            clearTimeout(timeoutId);
            console.log(`✅ [SENDER] Resposta da Evolution @ ${targetInstance}:`, res.status);
            return res.data;
        } catch (error: any) {
            clearTimeout(timeoutId);
            if (error.response) {
                console.error(`❌ [SENDER ERROR] Detalhes da API (${error.response.status}):`, JSON.stringify(error.response.data));
            } else if (error.name === 'AbortError' || error.code === 'ECONNABORTED') {
                console.error("❌ [SENDER ERROR] Timeout na Evolution API.");
            } else {
                console.error(`❌ [SENDER ERROR] Falha na requisição: ${error.message}`);
            }
            throw error;
        }
    });
}

export async function sendWhatsAppPresence(phone: string, presence: 'composing' | 'recording_audio' | 'available', instanceName?: string) {
    const targetInstance = instanceName || process.env.EVOLUTION_INSTANCE_NAME || 'agente-lobo';
    const apikey = process.env.EVOLUTION_API_KEY;
    const url = `${getBaseUrl()}/chat/sendPresence/${targetInstance}`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    try {
        await axios.post(url, { number: phone, presence, delay: 15000 }, {
            headers: { 'apikey': apikey as string },
            signal: controller.signal
        });
        clearTimeout(timeoutId);
    } catch (e) {
        clearTimeout(timeoutId);
    }
}

export async function checkWhatsAppNumber(phone: string): Promise<boolean> {
    const instanceName = process.env.EVOLUTION_INSTANCE_NAME;
    const apikey = process.env.EVOLUTION_API_KEY;
    const url = `${getBaseUrl()}/chat/whatsappNumbers/${instanceName}`;

    try {
        const res = await axios.post(url, { numbers: [phone] }, {
            headers: {
                'apikey': apikey as string,
                'Content-Type': 'application/json'
            },
            timeout: 30000,
            proxy: false
        });

        if (res.data && res.data.length > 0) {
            // Retorna true se o número existir no WhatsApp
            return res.data[0].exists || false;
        }

        return false;
    } catch (error: any) {
        console.error(`❌ Erro ao checar número na Evolution: ${error.message}`);
        // Em caso de erro na API, retorna false para evitar falsos positivos
        return false;
    }
}