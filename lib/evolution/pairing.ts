import axios from 'axios';

const getBaseUrl = () => (process.env.EVOLUTION_API_URL || process.env.EVOLUTION_URL || "").replace(/\/$/, "");

/**
 * NUCLEAR RESET: Ensures every pairing starts from a clean slate.
 * Logs out and deletes any existing instance with this name.
 */
async function nuclearResetInstance(instanceName: string) {
  const globalApiKey = process.env.EVOLUTION_GLOBAL_API_KEY || process.env.EVOLUTION_API_KEY;
  const baseUrl = getBaseUrl();

  console.log(`\n🗑️ [NUCLEAR RESET] Wiping instance: ${instanceName}`);
  console.log(`🔑 [DEBUG] Reset Key prefix: ${globalApiKey?.substring(0, 5)}...`);

  // 1. Logout
  try {
    await axios.delete(`${baseUrl}/instance/logout/${instanceName}`, {
      headers: { 'apikey': globalApiKey as string }
    });
    console.log(`📡 [NUCLEAR RESET] Logout sent for ${instanceName}`);
  } catch (err: any) {
    // Ignore error if instance doesn't exist
  }

  // 2. Delete
  try {
    await axios.delete(`${baseUrl}/instance/delete/${instanceName}`, {
      headers: { 'apikey': globalApiKey as string }
    });
    console.log(`📡 [NUCLEAR RESET] Delete sent for ${instanceName}`);
  } catch (err: any) {
    // Ignore error if instance doesn't exist
  }
}

/**
 * Creates an instance in Evolution API.
 */
async function createInstance(instanceName: string, phoneNumber?: string) {
  const globalApiKey = process.env.EVOLUTION_GLOBAL_API_KEY || process.env.EVOLUTION_API_KEY;
  const url = `${getBaseUrl()}/instance/create`;

  console.log(`📡 [EVOLUTION_PAIRING] Creating instance: ${instanceName} for number: ${phoneNumber || 'N/A'}`);
  console.log(`🔑 [DEBUG] Create Key prefix: ${globalApiKey?.substring(0, 5)}...`);

  try {
    const res = await axios.post(url, {
      instanceName: instanceName,
      number: phoneNumber ? phoneNumber.replace(/\D/g, '') : undefined,
      token: process.env.WOLF_SECRET_TOKEN || 'wolfagent2026',
      qrcode: false,
      integration: "WHATSAPP-BAILEYS"
    }, {
      headers: {
        'apikey': globalApiKey as string,
        'Content-Type': 'application/json'
      }
    });
    console.log(`✅ [EVOLUTION_PAIRING] Instance creation effort finished:`, res.data?.status || 'Sent');
    return true;
  } catch (error: any) {
    console.error(`⚠️ [EVOLUTION_PAIRING] Instance creation warning:`, error.response?.data || error.message);
    return false;
  }
}

/**
 * Generates an 8-character pairing code AND QR Base64 for an instance.
 */
export async function getPairingData(phone: string) {
  // 1. Normalize Phone (Strictly numeric)
  const cleanPhone = phone.replace(/\D/g, '');
  const prefix = process.env.EVOLUTION_INSTANCE_PREFIX || 'secretaria';
  const instanceName = `${prefix}-${cleanPhone}`;
  const globalApiKey = process.env.EVOLUTION_GLOBAL_API_KEY || process.env.EVOLUTION_API_KEY;
  
  // 2. NUCLEAR RESET (Wipe existing base session for cleanup)
  await nuclearResetInstance(instanceName);

  // 3. Create Fresh UNIQUE Instance (to bypass cleanup lag)
  const timestamp = Date.now();
  const uniqueInstanceName = `${instanceName}-${timestamp}`;
  console.log(`🚀 [EVOLUTION_PAIRING] Generating unique instance: ${uniqueInstanceName}`);
  
  await createInstance(uniqueInstanceName, cleanPhone);

  // 4. Stablization Delay (Wait for session registration with Meta)
  console.log(`⏳ [EVOLUTION_PAIRING] Waiting 2 seconds for session stabilization...`);
  await new Promise(res => setTimeout(res, 2000));

  // 5. Request pairing code (Step B)
  const url = `${getBaseUrl()}/instance/connect/${uniqueInstanceName}?number=${cleanPhone}`;

  console.log(`📡 [EVOLUTION_PAIRING] Requesting code for: ${phone} (Instance: ${uniqueInstanceName})`);
  console.log(`🔗 [DEBUG:URL] ${url}`);

  try {
    const res = await axios.get(url, {
      headers: {
        'apikey': globalApiKey as string,
        'Content-Type': 'application/json'
      }
    });

    // 6. Extract Dual Properties
    const pairingCode = res.data?.pairingCode || res.data?.pairing_code;
    const qrBase64 = res.data?.base64 || res.data?.qrcode; // Adjust based on exact response schema
    
    console.log(`[EVOLUTION_PAIRING] Extracted Pairing Code: ${pairingCode}`);
    console.log(`[EVOLUTION_PAIRING] QR Base64 Available: ${!!qrBase64}`);

    if (!pairingCode || typeof pairingCode !== 'string' || pairingCode.length > 20) {
       console.error(`❌ [EVOLUTION_PAIRING] Invalid Pairing Code extracted. Got: ${String(pairingCode).substring(0,20)}...`);
       return { pairingCode: null, qrBase64: qrBase64 || null };
    }

    return { pairingCode, qrBase64: qrBase64 || null };
  } catch (error: any) {
    if (error.response) {
      console.error(`❌ [EVOLUTION_PAIRING] API Error (${error.response.status}):`, JSON.stringify(error.response.data));
    } else {
      console.error(`❌ [EVOLUTION_PAIRING] Request Error:`, error.message);
    }
    return { pairingCode: null, qrBase64: null };
  }
}

// Keep backward compatibility for now if needed, but we should update callers
export async function getPairingCode(phone: string) {
    const data = await getPairingData(phone);
    return data.pairingCode;
}
