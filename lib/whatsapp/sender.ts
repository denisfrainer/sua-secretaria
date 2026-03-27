// lib/whatsapp/sender.ts
import axios from 'axios';
import { withWhatsAppLock } from '../utils/whatsapp-lock';

const getBaseUrl = () => (process.env.EVOLUTION_API_URL || process.env.EVOLUTION_URL || "").replace(/\/$/, "");

export async function sendWhatsAppMessage(phone: string, text: string, delayMs?: number) {
    return withWhatsAppLock(async () => {
        const instanceName = process.env.EVOLUTION_INSTANCE_NAME;
        const apikey = process.env.EVOLUTION_API_KEY;
        const url = `${getBaseUrl()}/message/sendText/${instanceName}`;

        const payload = {
            number: phone,
            text: text,
            delay: Math.round(delayMs || 2000),
            presence: "composing",
            options: { linkPreview: false }
        };

        // CRIANDO UM TIMEOUT DE "GUERRA" (2 minutos)
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 120000);

        try {
            console.log(`📡 [SENDER] Tentando enviar para Evolution no IP: ${url}`);

            const res = await axios.post(url, payload, {
                headers: {
                    'apikey': apikey as string,
                    'Content-Type': 'application/json'
                },
                signal: controller.signal, // Se demorar mais de 2min, aí sim cancela
                timeout: 110000,           // Timeout interno do Axios (um pouco menor que o controller)
                proxy: false               // Ignora qualquer proxy do Railway
            });

            clearTimeout(timeoutId);
            console.log(`✅ [SENDER] Resposta da Evolution:`, res.status);
            return res.data;
        } catch (error: any) {
            clearTimeout(timeoutId);
            if (error.name === 'AbortError' || error.code === 'ECONNABORTED') {
                throw new Error("❌ Timeout: A Evolution API no Google Cloud demorou demais para responder (Gargalo de Hardware).");
            }
            throw new Error(`❌ Erro Evolution API: ${error.message}`);
        }
    });
}

export async function sendWhatsAppPresence(phone: string, presence: 'composing' | 'recording_audio' | 'available') {
    const instanceName = process.env.EVOLUTION_INSTANCE_NAME;
    const apikey = process.env.EVOLUTION_API_KEY;
    const url = `${getBaseUrl()}/chat/sendPresence/${instanceName}`;

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