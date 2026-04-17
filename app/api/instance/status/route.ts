import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

/**
 * Enhanced Instance Status Endpoint (Resilience Revert)
 * - Fetch current connection state
 * - If not connected, fetch either QR code (base64) OR pairing code (alpha-numeric)
 * - REVERT: Using GET /instance/connect with cache-busting t= parameter.
 * - OBSERVABILITY: Explicitly logs the Evolution API response.
 */
export async function GET(request: Request) {
  let instanceName: string | null = null;
  try {
    const { searchParams } = new URL(request.url);
    instanceName = searchParams.get('instance');
    // REMOVED: phoneNumber parameter for Pairing Code

    if (!instanceName) {
      return NextResponse.json({ error: 'Missing instance name' }, { status: 400 });
    }

    // 🛡️ [ALIGNMENT] Check if instanceName matches DB for this user
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (user) {
        const { data: config } = await supabaseAdmin
            .from('business_config')
            .select('instance_name')
            .eq('owner_id', user.id)
            .maybeSingle();

        if (config?.instance_name !== instanceName) {
            console.warn(`🛡️ [API STATUS] Mismatch: Request="${instanceName}" | DB="${config?.instance_name}"`);
            return NextResponse.json({ 
                instance: instanceName,
                state: 'DISCONNECTED', 
                status: 'MISMATCH',
                qr: null 
            }, { status: 200 });
        }
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
    
    // 🛡️ Resilience Handler: If instance not found, return 200 (DISCONNECTED) with status tag
    if (stateRes.status === 404) {
      console.log(`📡 [API STATUS] Instance "${instanceName}" not found (404).`);
      return NextResponse.json({ 
        instance: instanceName,
        state: 'DISCONNECTED', 
        status: 'NOT_FOUND',
        qr: null 
      }, { status: 200 });
    }

    let currentState = 'DISCONNECTED';
    let stateData: any = {};
    
    if (stateRes.ok) {
        try {
            // INDIVIDUAL INSULATION
            stateData = await stateRes.json().catch(() => ({}));
            currentState = stateData?.instance?.state || 'DISCONNECTED';
            console.log(`📡 [API STATUS] State for ${instanceName}: ${currentState}`);
        } catch (e) {
            console.error(`❌ [API STATUS] JSON parse failed for ${instanceName}:`, e);
        }
    } else {
        const errorText = await stateRes.text().catch(() => "Unknown");
        console.warn(`⚠️ [API STATUS] Fetch non-200 (${stateRes.status}):`, errorText);
    }

    let qrCodeBase64 = null;

    // 2. If instance is not connected, attempt QR retrieval
    if (currentState !== 'open' && currentState !== 'connected') {
      const connectUrl = `${baseUrl}/instance/connect/${instanceName}?t=${Date.now()}`;
      console.log(`🔗 [API STATUS] Fetching QR: ${connectUrl}`);
      
      const connectRes = await fetch(connectUrl, { 
        method: 'GET',
        headers: { 'apikey': evoKey, 'Content-Type': 'application/json' }, 
        signal: AbortSignal.timeout(10000),
        cache: 'no-store'
      });
      
      if (connectRes.ok) {
        try {
            // INDIVIDUAL INSULATION
            const connectData = await connectRes.json().catch(() => ({}));
            qrCodeBase64 = connectData?.base64 || connectData?.qrcode || null; 
        } catch (e) {
            console.error(`❌ [API STATUS] QR parse failed:`, e);
        }
      } else {
        const errorData = await connectRes.text().catch(() => "Unknown");
        console.warn(`⚠️ [API STATUS] QR fetch failed (${connectRes.status}):`, errorData);
      }
    }

    // FINAL OUTPUT — ALWAYS VALID JSON (200 OK)
    return NextResponse.json({
      instance: instanceName,
      state: currentState,
      status: stateRes.status === 200 ? 'ready' : 'polling',
      qr: qrCodeBase64,
    }, { status: 200 });

  } catch (error: any) {
    console.error("❌ [API STATUS CRITICAL ERROR]:", error.message);
    
    // FINAL SAFETY NET: Always return a valid JSON payload with 200 OK
    return NextResponse.json({ 
      instance: instanceName || 'unknown',
      state: 'ERROR', 
      status: 'critical_failure',
      message: error.message,
      qr: null
    }, { status: 200 });
  }
}