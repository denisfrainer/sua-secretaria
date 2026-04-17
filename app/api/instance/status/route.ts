import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const instanceName = searchParams.get('instance');

    if (!instanceName || instanceName === 'null') {
      return NextResponse.json({ state: 'DISCONNECTED', message: 'Aguardando nome da instância...' }, { status: 200 });
    }

    const evoUrl = process.env.EVOLUTION_URL || process.env.NEXT_PUBLIC_EVOLUTION_URL || '';
    const evoKey = process.env.EVOLUTION_API_KEY || '';

    // PROTEÇÃO PRIMATA: Se a URL não existir, não deixa o replace() quebrar o servidor
    if (!evoUrl) {
      console.error("❌ Erro: Variável EVOLUTION_URL não configurada no Netlify");
      return NextResponse.json({ state: 'ERROR', message: 'Configuração ausente' }, { status: 200 });
    }

    const baseUrl = evoUrl.replace(/\/$/, '');

    const stateRes = await fetch(`${baseUrl}/instance/connectionState/${instanceName}`, {
      headers: { 'apikey': evoKey },
      next: { revalidate: 0 }
    });

    if (stateRes.status === 404) {
      return NextResponse.json({ state: 'DISCONNECTED', status: 'NOT_FOUND' }, { status: 200 });
    }

    const stateData = await stateRes.json().catch(() => ({}));
    const currentState = stateData?.instance?.state || 'DISCONNECTED';

    if (currentState === 'open') {
      return NextResponse.json({ state: 'open', instance: instanceName }, { status: 200 });
    }

    // Se não estiver aberto, tenta pegar o QR Code
    const connectRes = await fetch(`${baseUrl}/instance/connect/${instanceName}`, {
      headers: { 'apikey': evoKey },
      next: { revalidate: 0 }
    });

    const connectData = await connectRes.json().catch(() => ({}));

    return NextResponse.json({
      instance: instanceName,
      state: currentState,
      qr: connectData?.base64 || null
    }, { status: 200 });

  } catch (error: any) {
    console.error("🔥 Erro Crítico na Rota de Status:", error.message);
    // NUNCA retorna 500, retorna 200 com erro pro site não travar
    return NextResponse.json({ state: 'DISCONNECTED', error: error.message }, { status: 200 });
  }
}