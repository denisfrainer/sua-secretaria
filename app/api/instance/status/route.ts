import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * Enhanced Instance Status Endpoint (Resilience Revert)
 * - Fetch current connection state
 * - If not connected, fetch either QR code (base64) OR pairing code (alpha-numeric)
 * - REVERT: Using GET /instance/connect with cache-busting t= parameter.
 * - OBSERVABILITY: Explicitly logs the Evolution API response.
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const instanceName = searchParams.get('instance');
    // REMOVED: phoneNumber parameter for Pairing Code

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
    const stateRes = await fetch(`${baseUrl}/instance/connectionState/${instanceName}`, { 
        headers, 
        signal: AbortSignal.timeout(5000),
        cache: 'no-store'
    });
    
    let currentState = 'DISCONNECTED';
    if (stateRes.ok) {
        try {
            const stateData = await stateRes.json();
            currentState = stateData?.instance?.state || 'DISCONNECTED';
            console.log(`📡 [API STATUS] State for ${instanceName}: ${currentState}`);
        } catch (e) {
            console.error(`❌ [API STATUS] Error parsing state JSON for ${instanceName}:`, e);
        }
    } else if (stateRes.status === 404) {
        currentState = 'DISCONNECTED';
    } else {
        const errorText = await stateRes.text();
        console.warn(`⚠️ [API STATUS] State fetch failed (${stateRes.status}):`, errorText);
    }

    let qrCodeBase64 = null;

    // 2. If instance is not fully 'open' (Connected), fetch from connect endpoint (QR ONLY)
    if (currentState !== 'open') {
      const connectUrl = `${baseUrl}/instance/connect/${instanceName}?t=${Date.now()}`;

      console.log(`🔗 [API STATUS] Fetching QR via: ${connectUrl}`);
      
      const connectRes = await fetch(connectUrl, { 
        method: 'GET',
        headers: { 'apikey': evoKey, 'Content-Type': 'application/json' }, 
        signal: AbortSignal.timeout(10000),
        cache: 'no-store'
      });
      
      if (connectRes.ok) {
        try {
            const connectData = await connectRes.json();
            qrCodeBase64 = connectData?.base64 || null; 
        } catch (e) {
            console.error(`❌ [API STATUS] Error parsing connect JSON for ${instanceName}:`, e);
        }
      } else {
        const errorData = await connectRes.text();
        console.warn(`⚠️ [API STATUS] Evolution connect failed (${connectRes.status}):`, errorData);
      }
    }

    // Return the payload
    return NextResponse.json({
      instance: instanceName,
      state: currentState,
      qr: qrCodeBase64,
    });

  } catch (error: any) {
    console.error("❌ [STATUS API ERROR]:", error.message);
    return NextResponse.json({ state: 'ERROR', message: error.message }, { status: 500 });
  }
}