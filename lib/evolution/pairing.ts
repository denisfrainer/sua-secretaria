import axios from 'axios';

const getBaseUrl = () => (process.env.EVOLUTION_API_URL || "").replace(/\/$/, "");

/**
 * NUCLEAR RESET: Ensures every pairing starts from a clean slate.
 * Logs out and deletes any existing instance with this name.
 */
async function nuclearResetInstance(instanceName: string) {
  const globalApiKey = process.env.EVOLUTION_API_KEY;
  const baseUrl = getBaseUrl();

  if (!globalApiKey || globalApiKey === "PASTE_YOUR_KEY_HERE" || globalApiKey === "SUA_CHAVE_AQUI") {
    console.error('🛑 [FATAL] EVOLUTION_API_KEY is missing or invalid in pairing.ts');
    return;
  }

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

async function createInstance(instanceName: string, phoneNumber?: string) {
  const globalApiKey = process.env.EVOLUTION_API_KEY;
  const url = `${getBaseUrl()}/instance/create`;

  if (!globalApiKey || globalApiKey === "PASTE_YOUR_KEY_HERE" || globalApiKey === "SUA_CHAVE_AQUI") {
    throw new Error("Missing or invalid EVOLUTION_API_KEY for instance creation");
  }
  const WEBHOOK_URL = `${process.env.WEBHOOK_URL}/evolution`;

  console.log(`📡 [EVOLUTION_PAIRING] Creating instance: ${instanceName} for number: ${phoneNumber || 'N/A'}`);
  
  try {
    const payload = {
      instanceName: instanceName,
      number: phoneNumber,
      token: process.env.WOLF_SECRET_TOKEN || 'wolfagent2026',
      qrcode: false,
      integration: "WHATSAPP-BAILEYS",
      webhook: {
        enabled: true,
        url: WEBHOOK_URL,
        byEvents: true,
        base64: true,
        events: [
          "CONNECTION_UPDATE",
          "MESSAGES_UPSERT",
          "MESSAGES_UPDATE",
          "SEND_MESSAGES"
        ]
      }
    };

    console.log("📤 [EVOLUTION_CREATE] Sending payload:", JSON.stringify(payload, null, 2));

    const res = await axios.post(url, payload, {
      headers: {
        'apikey': globalApiKey as string,
        'Content-Type': 'application/json'
      }
    });

    console.log(`✅ [EVOLUTION_PAIRING] Response Status:`, res.status);
    return true;
  } catch (error: any) {
    console.error(`⚠️ [EVOLUTION_PAIRING] Instance creation warning:`, error.response?.data || error.message);
    return false;
  }
}

/**
 * Normalizes phone numbers to handle the Brazilian 9th digit discrepancy.
 * SPECIFIC FIX: For DDD 48, we must REMOVE the 9th digit if present (stripping to 12 digits).
 */
function normalizePhoneNumber(phone: string): string {
    let clean = phone.replace(/\D/g, '');
    
    // Brazilian logic for Users with DDD 48
    // If it has 13 digits (55 48 9 XXXX XXXX), strip the 5th digit (the '9').
    if (clean.startsWith('5548') && clean.length === 13) {
        const prefix = clean.substring(0, 4); // 5548
        const remainder = clean.substring(5); // Everything after the '9'
        console.log(`[JID_FIX] Normalizing DDD 48: Stripping 9th digit. Result: ${prefix}${remainder}`);
        return `${prefix}${remainder}`;
    }
    
    return clean;
}

/**
 * Generates an 8-character pairing code AND QR Base64 for an instance.
 */
export async function getPairingData(phone: string) {
  // 1. Dual-Number Normalization (Critical JID Alignment)
  const cleanPhone = normalizePhoneNumber(phone);
  const prefix = process.env.EVOLUTION_INSTANCE_PREFIX || 'secretaria';
  
  // Use a base instance name linked to the normalized phone
  const instanceName = `${prefix}-${cleanPhone}`;
  const globalApiKey = process.env.EVOLUTION_API_KEY;
  
  if (!globalApiKey || globalApiKey === "PASTE_YOUR_KEY_HERE" || globalApiKey === "SUA_CHAVE_AQUI") {
    throw new Error("Missing or invalid EVOLUTION_API_KEY for pairing data");
  }

  console.log(`🚀 [HOLY_GRAIL] Target JID: ${cleanPhone}`);

  // 2. NUCLEAR RESET (Wipe existing base session for cleanup)
  await nuclearResetInstance(instanceName);

  // 3. Create Fresh UNIQUE Instance (to bypass cleanup lag)
  const timestamp = Date.now();
  const uniqueInstanceName = `${instanceName}-${timestamp}`;
  console.log(`🚀 [EVOLUTION_PAIRING] Generating unique instance: ${uniqueInstanceName}`);
  
  await createInstance(uniqueInstanceName, cleanPhone);

  // 4. Stablization Delay (Wait for session registration with Meta)
  console.log(`⏳ [EVOLUTION_PAIRING] Waiting 5 seconds for session stabilization...`);
  await new Promise(res => setTimeout(res, 5000));

  // 5. Request pairing code (Step B)
  const url = `${getBaseUrl()}/instance/connect/${uniqueInstanceName}?number=${cleanPhone}`;

  console.log(`📡 [EVOLUTION_PAIRING] Requesting code for: ${cleanPhone} (Instance: ${uniqueInstanceName})`);

  try {
    const res = await axios.get(url, {
      headers: {
        'apikey': globalApiKey as string,
        'Content-Type': 'application/json'
      }
    });

    // 6. Extract Dual Properties (Exhaustive extraction)
    const pairingCode = res.data?.pairingCode || res.data?.pairing_code || res.data?.code;
    const qrBase64 = res.data?.base64 || res.data?.qrcode || res.data?.code; 
    
    console.log(`[EVOLUTION_PAIRING] API Response Keys:`, Object.keys(res.data || {}));
    console.log(`[EVOLUTION_PAIRING] Extracted Pairing Code: ${pairingCode}`);
    console.log(`[EVOLUTION_PAIRING] QR Base64 Available: ${!!qrBase64}`);

    // If pairingCode is a long string, it might actually be the QR code
    let finalPairingCode = pairingCode;
    if (pairingCode && pairingCode.length > 20) {
        console.warn(`⚠️ [EVOLUTION_PAIRING] Detected QR string in pairingCode field. Nulling code.`);
        finalPairingCode = null;
    }

    return { 
        pairingCode: finalPairingCode || null, 
        qrBase64: qrBase64 || null,
        instanceName: uniqueInstanceName
    };
  } catch (error: any) {
    if (error.response) {
      console.error(`❌ [EVOLUTION_PAIRING] API Error (${error.response.status}):`, JSON.stringify(error.response.data));
    } else {
      console.error(`❌ [EVOLUTION_PAIRING] Request Error:`, error.message);
    }
    return { pairingCode: null, qrBase64: null, instanceName: null };
  }
}

// Keep backward compatibility
export async function getPairingCode(phone: string) {
    const data = await getPairingData(phone);
    return data.pairingCode;
}
