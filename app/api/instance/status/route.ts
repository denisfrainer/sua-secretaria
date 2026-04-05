import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * Enhanced Instance Status Endpoint
 * - Fetch current connection state
 * - If not connected, fetch either QR code (base64) OR pairing code (alpha-numeric)
 * - CRITICAL: Case-by-case protocol Selection (GET for QR, POST for Pairing)
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
      
      // EVOLUTION v2 PROTOCOL: POST with body for pairing code, GET for QR code
      const fetchParams: RequestInit = {
          headers: commonHeaders,
          signal: AbortSignal.timeout(10000),
          cache: 'no-store'
      };

      if (cleanNumber) {
          fetchParams.method = 'POST';
          fetchParams.body = JSON.stringify({ number: cleanNumber });
      } else {
          fetchParams.method = 'GET';
      }

      const connectUrl = `${baseUrl}/instance/connect/${instanceName}`;
      console.log(`🔗 [API STATUS] Mode: ${cleanNumber ? 'PAIRING (POST)' : 'QR (GET)'} | Endpoint: ${connectUrl}`);
      
      const qrRes = await fetch(connectUrl, fetchParams);
      
      if (qrRes.ok) {
        const qrData = await qrRes.json();
        
        // --- OBSERVABILITY BLOCK ---
        console.log(`[EVOLUTION ${fetchParams.method} RESPONSE]`, JSON.stringify(qrData, null, 2));

        qrCodeBase64 = qrData?.base64 || null; 
        const rawCode = qrData?.code || qrData?.pairingCode || null;

        // VALIDATION: Reject raw hashes
        if (rawCode && rawCode.length < 15) {
            pairingCode = rawCode;
        }
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
      pairingCode: pairingCode, 
    });

  } catch (error: any) {
    console.error("❌ [STATUS API ERROR]:", error.message);
    return NextResponse.json({ state: 'ERROR', message: error.message }, { status: 500 });
  }
}