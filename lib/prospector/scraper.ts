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
function cleanPhone(phoneRaw: string): string {
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

    // The Run URL using Apify's run-sync-get-dataset-items feature to wait for job completion
    // The user explicitly requested 'apify/google-maps-scraper'.
    const actorId = 'apify~google-maps-scraper';
    const runUrl = `https://api.apify.com/v2/acts/${actorId}/run-sync-get-dataset-items?token=${apifyToken}`;

    try {
        // Trigger the Apify job and await its complete dataset extraction
        // Max execution timeout is automatically bound by Apify's sync limits.
        const apifyRes = await fetch(runUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                searchStringsArray: [command.query],
                maxCrawlPages: 1,
                maxCrawledPlacesPerSearch: maxResults,
                language: 'pt',
                countryCode: 'br'
            })
        });

        if (!apifyRes.ok) {
            const errBody = await apifyRes.text();
            console.error(`❌ Falha no Apify (Status ${apifyRes.status}):`, errBody);
            // Hint for the user in case the actor id needed a fallback
            if (apifyRes.status === 404) {
                console.error('DICA: Verifique se o Actor "apify/google-maps-scraper" existe. Experimente "compass~crawler-google-places" ou "apify~google-maps-extractor".');
            }
            return;
        }

        const items = await apifyRes.json();
        console.log(`✅ Apify retornou ${items.length || 0} locais.`);
        
        if (!Array.isArray(items) || items.length === 0) {
            console.log('Nenhum resultado processável recebido do Apify.');
            return;
        }

        let insertedCount = 0;
        
        for (const item of items) {
            // Some actors use 'phoneNumber', others use 'phone'
            const rawPhone = item.phone || item.phoneNumber || item.phoneUnformatted;
            
            if (!rawPhone) {
                console.log(`⚠️ Ignorando lead sem telefone (${item.title || 'Desconhecido'})`);
                continue;
            }
            
            const phone = cleanPhone(rawPhone);
            // Skip invalidly sized phones after cleaning
            if (phone.length < 12) continue;

            const name = item.title || 'Lead Desconhecido';
            const niche = item.categoryName || item.category || 'Desconhecido';
            const city = item.city || item.address?.split(',')?.pop()?.trim() || '';

            // Upsert into Supabase leads_lobo with the unique phone constraint
            const { error } = await supabaseAdmin.from('leads_lobo').upsert(
                {
                    phone,
                    name,
                    niche,
                    city,
                    status: 'pending' // Default setup strictly requested
                },
                { onConflict: 'phone' } // Uses the unique 'phone' database key
            );

            if (error) {
                console.error(`❌ Erro no upsert do BD (${name} - ${phone}):`, error.message);
            } else {
                insertedCount++;
            }
        }

        console.log(`🏁 🐺 CAÇADA FINALIZADA: ${insertedCount} leads únicos gravados com sucesso!`);

    } catch (error) {
        console.error('❌ Erro durante a execução da integração Apify Scraper:', error);
    }
}
