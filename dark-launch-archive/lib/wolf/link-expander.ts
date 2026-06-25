export async function expandLinkContext(url: string): Promise<string> {
    try {
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                // Fingindo ser o bot do próprio Facebook/Meta para liberar o metadado og:url
                'User-Agent': 'facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                'Accept-Language': 'pt-BR,pt;q=0.9',
            },
            redirect: 'follow',
        });

        const html = await response.text();

        // Estratégia 1: Procurar no metadado og:url (Onde o hash vira número)
        const ogMatch = html.match(/property="og:url" content="[^"]*phone=([0-9]+)/) ||
            html.match(/&phone=([0-9]+)/) ||
            html.match(/phone=([0-9]+)&/);

        // Estratégia 2: Procurar dentro de scripts JSON (phoneNumber:"55...")
        const jsonMatch = html.match(/"phoneNumber":"(\d+)"/) ||
            html.match(/"whatsapp:\/\/send\?phone=(\d+)"/);

        // Estratégia 3: Capturar qualquer sequência de 12-13 dígitos que comece com 55
        const bruteMatch = html.match(/55[0-9]{10,11}/);

        const found = ogMatch?.[1] || jsonMatch?.[1] || bruteMatch?.[0] || "";

        console.log(`🔎 [EXPANDER] Capturado para ${url}: ${found || "Vazio"}`);

        return `DETECTED_PHONE: ${found} | FINAL_URL: ${response.url}`;
    } catch (error) {
        return "ERROR_FETCHING";
    }
}