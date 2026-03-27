import axios from 'axios';
import { withWhatsAppLock } from '../utils/whatsapp-lock';

// Função auxiliar para limpar a URL e evitar erros de "//"
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

        try {
            const res = await axios.post(url, payload, {
                headers: {
                    'apikey': apikey as string,
                    'Content-Type': 'application/json',
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0'
                },
                timeout: 40000, // 40 segundos de espera
                proxy: false
            });
            return res.data;
        } catch (error: any) {
            const msg = error.response?.data?.message || error.message;
            throw new Error(`❌ Erro Evolution API: ${msg}`);
        }
    });
}

export async function checkWhatsAppNumber(phone: string): Promise<boolean> {
    const instanceName = process.env.EVOLUTION_INSTANCE_NAME;
    const apikey = process.env.EVOLUTION_API_KEY;
    const url = `${getBaseUrl()}/chat/whatsappNumbers/${instanceName}`;
    const cleanPhone = phone.replace(/\D/g, '');

    try {
        const res = await axios.post(url, { numbers: [cleanPhone] }, {
            headers: { 'apikey': apikey as string },
            timeout: 15000
        });
        return res.data?.[0]?.exists === true;
    } catch (error) {
        return false;
    }
}

export async function sendWhatsAppPresence(phone: string, presence: 'composing' | 'recording_audio' | 'available') {
    const instanceName = process.env.EVOLUTION_INSTANCE_NAME;
    const apikey = process.env.EVOLUTION_API_KEY;
    const url = `${getBaseUrl()}/chat/sendPresence/${instanceName}`;

    try {
        await axios.post(url, { number: phone, presence, delay: 15000 }, {
            headers: { 'apikey': apikey as string },
            timeout: 10000
        });
    } catch (e) {
        // Ignora erro de presence para não travar o envio da mensagem principal
    }
}

export async function markWhatsAppRead(phone: string, messageId: string) {
    const instanceName = process.env.EVOLUTION_INSTANCE_NAME;
    const apikey = process.env.EVOLUTION_API_KEY;
    const url = `${getBaseUrl()}/chat/markMessageAsRead/${instanceName}`;

    try {
        await axios.post(url, {
            readMessages: [{ remoteJid: phone, fromMe: false, id: messageId }]
        }, {
            headers: { 'apikey': apikey as string },
            timeout: 10000
        });
    } catch (e) {
        console.error("⚠️ Erro ao marcar como lida");
    }
}