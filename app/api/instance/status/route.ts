import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * Enhanced Instance Status Endpoint
 * - Fetch current connection state
 * - If not connected, fetch either QR code (base64) OR pairing code (alpha-numeric)
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const instanceName = searchParams.get('instance');
    const phoneNumber = searchParams.get('number'); // Used for Pairing Code generation

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

    // 1. Check the current state of the instance
    const stateRes = await fetch(`${baseUrl}/instance/connectionState/${instanceName}`, { headers, signal: AbortSignal.timeout(5000) });
    
    if (stateRes.status === 404) {
      return NextResponse.json({ state: 'DISCONNECTED', status: 'not_found' });
    }
    
    const stateData = await stateRes.json();
    const currentState = stateData?.instance?.state || 'DISCONNECTED';

    let qrCodeBase64 = null;
    let pairingCode = null;

    // 2. If instance is not fully 'open' (Connected), fetch pairing/QR data
    if (currentState !== 'open') {
      const connectUrl = phoneNumber 
        ? `${baseUrl}/instance/connect/${instanceName}?number=${phoneNumber.replace(/\D/g, '')}`
        : `${baseUrl}/instance/connect/${instanceName}`;

      console.log(`🔗 [API STATUS] Connecting via: ${connectUrl}`);
      const qrRes = await fetch(connectUrl, { headers, signal: AbortSignal.timeout(5000) });
      
      if (qrRes.ok) {
        const qrData = await qrRes.json();
        // Evolution v2 returns 'base64' for QR and 'code' for pairing
        qrCodeBase64 = qrData?.base64 || null; 
        pairingCode = qrData?.code || null;
      } else {
        const errorData = await qrRes.text();
        console.warn(`⚠️ [API STATUS] Evolution connect failed:`, errorData);
      }
    }

    // Return the dual-mode status payload
    return NextResponse.json({
      instance: instanceName,
      state: currentState,
      qr: qrCodeBase64,
      pairingCode: pairingCode, // Expected to be 8 characters
    });

  } catch (error: any) {
    console.error("❌ [STATUS API ERROR]:", error.message);
    return NextResponse.json({ state: 'ERROR', message: error.message }, { status: 500 });
  }
}