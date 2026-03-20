import { supabaseAdmin } from '../supabase/admin';

export interface HuntCommand {
    query: string;
    limit?: number;
}

/**
 * Função responsável por limpar números de telefone no padrão BR.
 * Exemplo de entradas e saídas esperadas:
 * - "(48) 99809-7754" => "5548998097754"
 * - "+55 48 99809-7754" => "5548998097754"
 * - "048998097754" => "5548998097754"
 */
export function cleanPhone(phoneRaw: string): string {
    if (!phoneRaw) return '';

    // 1. Remove qualquer caractere não numérico
    let digits = phoneRaw.replace(/\D/g, '');

    // 2. Remove possível zero de DDD se não houver código de país ainda
    if (digits.startsWith('0') && (digits.length === 11 || digits.length === 12)) {
        digits = digits.substring(1);
    }

    // 3. Adiciona código de país (55) se o tamanho for razoável (10 a 11 números, padrão BR)
    if (!digits.startsWith('55') && digits.length >= 10 && digits.length <= 11) {
        digits = '55' + digits;
    }

    return digits;
}

export async function processHunt(command: HuntCommand) {
    const apifyToken = process.env.APIFY_API_TOKEN;
    if (!apifyToken) {
        console.error('❌ ERRO: APIFY_API_TOKEN não definido no ambiente.');
        return;
    }

    const maxResults = command.limit || 30;
    console.log(`🐺 INICIANDO CAÇADA (Scraper): Buscando "${command.query}" (Max: ${maxResults})`);

    const actorId = 'compass~crawler-google-places';
    // Utiliza o endpoint de 'runs' para disparo assíncrono ao invés de 'run-sync-get-dataset-items'
    const runUrl = `https://api.apify.com/v2/acts/${actorId}/runs?token=${apifyToken}`;

    // Configuração do Webhook callback URL
    const webhookUrl = `${process.env.NEXT_PUBLIC_SITE_URL}/api/apify-webhook?token=${process.env.WOLF_SECRET_TOKEN}`;

    try {
        const payload = {
            searchStringsArray: [command.query],
            maxCrawlPages: 1,
            maxCrawledPlacesPerSearch: maxResults,
            language: 'pt-BR',
            countryCode: 'br',
        };

        // Trigger the Apify job
        const apifyRes = await fetch(runUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                ...payload,
                webhooks: [
                    {
                        eventTypes: ["ACTOR.RUN.SUCCEEDED"],
                        requestUrl: webhookUrl
                    }
                ]
            })
        });

        if (!apifyRes.ok) {
            const errBody = await apifyRes.text();
            console.error(`❌ Falha ao iniciar Apify (Status ${apifyRes.status}):`, errBody);
            if (apifyRes.status === 404) {
                console.error('DICA: Verifique se o Actor "apify/google-maps-scraper" existe.');
            }
            return;
        }

        const runData = await apifyRes.json();
        console.log(`✅ Apify Job Iniciado Assincronamente! Run ID: ${runData?.data?.id}`);

    } catch (error) {
        console.error('❌ Erro ao iniciar a integração Apify Scraper:', error);
    }
}
