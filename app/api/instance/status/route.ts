import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const instanceName = searchParams.get('instance');
    const phoneNumber = searchParams.get('number'); // Optional for pairing code

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
    let pairingCode = null;

    // 2. If not connected, fetch the connection data
    if (currentState !== 'open') {
      // If a phone number is provided, we request a pairing code instead of a QR code
      const connectUrl = phoneNumber 
        ? `${baseUrl}/instance/connect/${instanceName}?number=${phoneNumber}`
        : `${baseUrl}/instance/connect/${instanceName}`;

      const qrRes = await fetch(connectUrl, { headers, signal: AbortSignal.timeout(5000) });
      
      if (qrRes.ok) {
        const qrData = await qrRes.json();
        // Evolution v2 returns 'base64' for QR and 'code' for pairing
        qrCodeBase64 = qrData?.base64 || null; 
        pairingCode = qrData?.code || null;
      }
    }

    // Return extended status
    return NextResponse.json({
      instance: instanceName,
      state: currentState,
      qr: qrCodeBase64,
      pairingCode: pairingCode,
    });

  } catch (error: any) {
    console.error("❌ [STATUS API ERROR]:", error.message);
    return NextResponse.json({ state: 'ERROR', message: 'Failed to fetch status' }, { status: 500 });
  }
}