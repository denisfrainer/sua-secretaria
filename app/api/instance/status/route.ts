import { NextResponse } from 'next/server';

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const instanceName = searchParams.get('instance');

        if (!instanceName) {
            return NextResponse.json({ error: 'instance is required' }, { status: 400 });
        }

        const baseUrl = process.env.EVOLUTION_API_URL;
        const apiKey = process.env.EVOLUTION_API_KEY;

        if (!baseUrl || !apiKey) {
           return NextResponse.json({ error: 'Evolution API credentials not configured.' }, { status: 500 });
        }

        // 1. Check Connection State
        const stateRes = await fetch(`${baseUrl}/instance/connectionState/${instanceName}`, {
            headers: { 'apikey': apiKey }
        });

        if (!stateRes.ok) {
            return NextResponse.json({ error: 'Failed to fetch connection state' }, { status: stateRes.status });
        }

        const stateData = await stateRes.json();
        const state = stateData?.instance?.state || stateData?.state || 'unknown';

        if (state === 'open') {
            return NextResponse.json({ status: 'CONNECTED' });
        }

        // 2. If not connected, try to fetch the latest QR Code
        const qrRes = await fetch(`${baseUrl}/instance/connect/${instanceName}`, {
            headers: { 'apikey': apiKey }
        });

        const qrData = await qrRes.json();
        const base64 = qrData?.base64 || qrData?.qrcode?.base64 || null;

        return NextResponse.json({
            status: 'DISCONNECTED',
            state: state,
            base64: base64
        });

    } catch (error: any) {
        console.error('💥 [EVOLUTION] Polling Exception:', error.message);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
