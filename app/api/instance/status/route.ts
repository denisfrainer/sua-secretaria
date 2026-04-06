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
    const stateRes = await fetch(`${baseUrl}/instance/connectionState/${instanceName}`, { 
        headers, 
        signal: AbortSignal.timeout(5000),
        cache: 'no-store'
    });
    
    if (stateRes.status === 404) {
      return NextResponse.json({ state: 'DISCONNECTED', status: 'not_found' });
    }
    
    const stateData = await stateRes.json();
    const currentState = stateData?.instance?.state || 'DISCONNECTED';

    let qrCodeBase64 = null;
    let pairingCode = null;

    // 2. If instance is not fully 'open' (Connected), fetch from connect endpoint
    if (currentState !== 'open') {
      // 1. Clean the number (REMOVES ALL NON-DIGITS)
      const cleanNumber = phoneNumber ? phoneNumber.replace(/\D/g, '') : null;
      
      // 2. Fetch with the number parameter (STRICT URL STRUCTURE)
      // We explicitly include the number if available to force Pairing Code mode in Evolution v2
      const connectUrl = cleanNumber 
        ? `${baseUrl}/instance/connect/${instanceName}?number=${cleanNumber}&t=${Date.now()}`
        : `${baseUrl}/instance/connect/${instanceName}?t=${Date.now()}`;

      console.log(`🔗 [API STATUS] Forcing Connection via: ${connectUrl}`);
      
      const connectRes = await fetch(connectUrl, { 
        method: 'GET',
        headers: { 'apikey': evoKey, 'Content-Type': 'application/json' }, 
        signal: AbortSignal.timeout(10000),
        cache: 'no-store'
      });
      
      if (connectRes.ok) {
        const connectData = await connectRes.json();
        
        // --- OBSERVABILITY BLOCK ---
        console.log(`[EVOLUTION CONNECT RESPONSE]`, JSON.stringify(connectData, null, 2));

        qrCodeBase64 = connectData?.base64 || null; 
        
        // 3. Extraction logic for v2 pairing code
        const code = connectData?.code || connectData?.pairingCode || null;
        
        // VALIDATION: Strict 8-character pairing code check
        if (code && code.length === 8) {
            pairingCode = code;
            console.log(`✅ [API STATUS] Valid 8-char pairing code detected: ${pairingCode}`);
        } else if (code) {
            console.warn(`⚠️ [API STATUS] Evolution returned a non-standard code (length: ${code.length}). Treating as null.`);
        }
      } else {
        const errorData = await connectRes.text();
        console.warn(`⚠️ [API STATUS] Evolution connect failed:`, errorData);
      }
    }

    // Return the payload
    return NextResponse.json({
      instance: instanceName,
      state: currentState,
      qr: qrCodeBase64,
      pairingCode: pairingCode, 
    });

  } catch (error: any) {
    console.error("❌ [STATUS API ERROR]:", error.message);
    return NextResponse.json({ state: 'ERROR', message: error.message }, { status: 500 });
  }
}