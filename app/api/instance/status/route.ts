import { NextResponse } from 'next/server';

// Força o Next.js a nunca fazer cache desta rota (CRÍTICO para polling)
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const instanceName = searchParams.get('instance');

        if (!instanceName) {
            return NextResponse.json({ error: 'Nome da instância não fornecido.' }, { status: 400 });
        }

        const evoUrl = process.env.EVOLUTION_URL || process.env.NEXT_PUBLIC_EVOLUTION_URL;
        const evoKey = process.env.EVOLUTION_API_KEY;

        if (!evoUrl || !evoKey) {
            console.error("❌ [STATUS API] Credenciais da Evolution API ausentes no .env");
            return NextResponse.json({ error: 'Erro de configuração do servidor.' }, { status: 500 });
        }

        // Remove barra sobrando no final da URL para evitar erro de rota (ex: .com//instance)
        const baseUrl = evoUrl.replace(/\/$/, '');

        // Faz a requisição para a Evolution
        const response = await fetch(`${baseUrl}/instance/connectionState/${instanceName}`, {
            method: 'GET',
            headers: {
                'apikey': evoKey,
                'Content-Type': 'application/json'
            },
            // Timeout de 5s para não travar o servidor se a Evolution cair
            signal: AbortSignal.timeout(5000)
        });

        if (!response.ok) {
            // Se a instância não existe, a Evolution retorna 404. 
            // Tratamos isso de forma amigável para não dar erro 500 no front.
            if (response.status === 404) {
                console.log(`⚠️ [STATUS API] Instância "${instanceName}" ainda não existe na Evolution.`);
                return NextResponse.json({ instance: instanceName, state: 'DISCONNECTED', status: 'not_found' });
            }
            throw new Error(`Evolution API falhou com status: ${response.status}`);
        }

        const data = await response.json();

        return NextResponse.json({
            instance: data?.instance?.instanceName || instanceName,
            state: data?.instance?.state || 'DISCONNECTED',
        });

    } catch (error: any) {
        // Agora sim o Netlify vai nos mostrar exatamente qual foi o erro no log!
        console.error("❌ [STATUS API ERROR]:", error.message);

        return NextResponse.json(
            { state: 'ERROR', message: 'Falha ao comunicar com o servidor do WhatsApp.' },
            { status: 500 }
        );
    }
}