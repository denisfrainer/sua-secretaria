import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * Enhanced Instance Status Endpoint (Pivot to v2 Pairing)
 * - Fetch current connection state
 * - If not connected, fetch either QR code (base64) OR pairing code (alpha-numeric)
 * - CRITICAL: Case-by-case protocol Selection (GET /pairingCode for Pairing)
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

    const commonHeaders = {
      'apikey': evoKey,
      'Content-Type': 'application/json'
    };

    // 1. Check the current state of the instance
    const stateRes = await fetch(`${baseUrl}/instance/connectionState/${instanceName}`, { 
        headers: commonHeaders, 
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

    // 2. If instance is not fully 'open' (Connected), fetch pairing/QR data
    if (currentState !== 'open') {
      const cleanNumber = phoneNumber ? phoneNumber.replace(/\D/g, '') : null;
      
      if (cleanNumber) {
          // OFFICIAL EVOLUTION v2 PAIRING ENDPOINT: GET /instance/pairingCode/:instance
          const pairingUrl = `${baseUrl}/instance/pairingCode/${instanceName}?number=${cleanNumber}`;
          console.log(`🔗 [PAIRING ATTEMPT] Endpoint: ${pairingUrl}`);
          
          const pairingRes = await fetch(pairingUrl, { 
              headers: commonHeaders,
              signal: AbortSignal.timeout(10000),
              cache: 'no-store'
          });
          
          if (pairingRes.ok) {
              const pairingData = await pairingRes.json();
              console.log("[PAIRING RESPONSE]", JSON.stringify(pairingData, null, 2));
              pairingCode = pairingData?.code || null;
          } else {
              const errorData = await pairingRes.text();
              console.warn(`⚠️ [PAIRING ATTEMPT] Failed:`, errorData);
          }
      }

      // If we don't have a pairing code, we always fetch/ensure QR fallback is available
      const qrUrl = `${baseUrl}/instance/connect/${instanceName}`;
      const qrRes = await fetch(qrUrl, { 
          headers: commonHeaders, 
          signal: AbortSignal.timeout(10000),
          cache: 'no-store'
      });
      
      if (qrRes.ok) {
          const qrData = await qrRes.json();
          qrCodeBase64 = qrData?.base64 || null;
          // In case the Pairing Code isn't fetched via the specialized route but appears here
          if (!pairingCode) {
              pairingCode = qrData?.code || qrData?.pairingCode || null;
              if (pairingCode && pairingCode.length > 15) pairingCode = null; // Filter hashes
          }
      }
    }

    // Return the dual-mode status payload
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