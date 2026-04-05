import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const instanceName = searchParams.get('instance');

    if (!instanceName) {
      return NextResponse.json({ error: 'Missing instance name' }, { status: 400 });
    }

    const evoUrl = process.env.EVOLUTION_URL || process.env.NEXT_PUBLIC_EVOLUTION_URL;
    const evoKey = process.env.EVOLUTION_API_KEY;
    
    if (!evoUrl || !evoKey) {
        return NextResponse.json({ error: 'Evolution API credentials not configured.' }, { status: 500 });
    }
    
    const baseUrl = evoUrl.replace(/\/$/, '');

    const headers = {
      'apikey': evoKey,
      'Content-Type': 'application/json'
    };

    // 1. Check the current state
    const stateRes = await fetch(`${baseUrl}/instance/connectionState/${instanceName}`, { headers, signal: AbortSignal.timeout(5000) });
    
    if (stateRes.status === 404) {
      return NextResponse.json({ state: 'DISCONNECTED', status: 'not_found' });
    }
    
    const stateData = await stateRes.json();
    const currentState = stateData?.instance?.state || 'DISCONNECTED';

    let qrCodeBase64 = null;

    // 2. If not connected, fetch the QR Code base64 from the /connect endpoint
    if (currentState !== 'open') {
      const qrRes = await fetch(`${baseUrl}/instance/connect/${instanceName}`, { headers, signal: AbortSignal.timeout(5000) });
      if (qrRes.ok) {
        const qrData = await qrRes.json();
        // Evolution v2 returns the image string in the 'base64' property
        qrCodeBase64 = qrData?.base64 || null; 
      }
    }

    // Return exactly what the QRCodeDisplay component expects
    return NextResponse.json({
      instance: instanceName,
      state: currentState,
      qr: qrCodeBase64, // The frontend should use this property to render the <img src={qr} />
    });

  } catch (error: any) {
    console.error("❌ [STATUS API ERROR]:", error.message);
    return NextResponse.json({ state: 'ERROR', message: 'Failed to fetch status' }, { status: 500 });
  }
}