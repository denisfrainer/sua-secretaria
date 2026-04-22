import axios from 'axios';

const getBaseUrl = () => (process.env.EVOLUTION_API_URL || process.env.EVOLUTION_URL || "").replace(/\/$/, "");

/**
 * NUCLEAR RESET: Ensures every pairing starts from a clean slate.
 * Logs out and deletes any existing instance with this name.
 */
async function nuclearResetInstance(instanceName: string) {
  const apikey = process.env.EVOLUTION_API_KEY;
  const baseUrl = getBaseUrl();

  console.log(`🗑️ [NUCLEAR RESET] Wiping instance: ${instanceName}`);

  // 1. Logout
  try {
    await axios.delete(`${baseUrl}/instance/logout/${instanceName}`, {
      headers: { 'apikey': apikey as string }
    });
    console.log(`📡 [NUCLEAR RESET] Logout sent for ${instanceName}`);
  } catch (err: any) {
    // Ignore error if instance doesn't exist
  }

  // 2. Delete
  try {
    await axios.delete(`${baseUrl}/instance/delete/${instanceName}`, {
      headers: { 'apikey': apikey as string }
    });
    console.log(`📡 [NUCLEAR RESET] Delete sent for ${instanceName}`);
  } catch (err: any) {
    // Ignore error if instance doesn't exist
  }
}

/**
 * Creates an instance in Evolution API.
 */
async function createInstance(instanceName: string) {
  const apikey = process.env.EVOLUTION_API_KEY;
  const url = `${getBaseUrl()}/instance/create`;

  console.log(`📡 [EVOLUTION_PAIRING] Creating instance: ${instanceName}`);

  try {
    const res = await axios.post(url, {
      instanceName: instanceName,
      token: process.env.WOLF_SECRET_TOKEN || 'wolfagent2026',
      qrcode: false,
      integration: "WHATSAPP-BAILEYS"
    }, {
      headers: {
        'apikey': apikey as string,
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
 * Generates an 8-character pairing code for an instance using a phone number.
 */
export async function getPairingCode(phone: string) {
  // 1. Normalize Phone (Strictly numeric)
  const cleanPhone = phone.replace(/\D/g, '');
  const prefix = process.env.EVOLUTION_INSTANCE_PREFIX || 'secretaria';
  const instanceName = `${prefix}-${cleanPhone}`;
  const apikey = process.env.EVOLUTION_API_KEY;
  
  // 2. NUCLEAR RESET (Wipe existing session)
  await nuclearResetInstance(instanceName);

  // 3. Create Fresh Instance
  await createInstance(instanceName);

  // 4. Stablization Delay (Wait for session registration with Meta)
  console.log(`⏳ [EVOLUTION_PAIRING] Waiting 2 seconds for session stabilization...`);
  await new Promise(res => setTimeout(res, 2000));

  // 5. Request pairing code (Step B)
  const url = `${getBaseUrl()}/instance/connect/${instanceName}?number=${cleanPhone}`;

  console.log(`📡 [EVOLUTION_PAIRING] Requesting code for: ${phone} (Instance: ${instanceName})`);

  try {
    const res = await axios.get(url, {
      headers: {
        'apikey': apikey as string,
        'Content-Type': 'application/json'
      }
    });

    // 6. Extract Correct Property (Force pairingCode logic)
    const finalCode = res.data?.pairingCode || res.data?.pairing_code;
    
    console.log(`[EVOLUTION_PAIRING] Extracted Pairing Code: ${finalCode}`);

    if (!finalCode || typeof finalCode !== 'string' || finalCode.length > 20) {
       console.error(`❌ [EVOLUTION_PAIRING] Invalid Pairing Code extracted. Got: ${String(finalCode).substring(0,20)}...`);
       throw new Error('Invalid Pairing Code format received from Evolution API');
    }

    return finalCode;
  } catch (error: any) {
    if (error.response) {
      console.error(`❌ [EVOLUTION_PAIRING] API Error (${error.response.status}):`, JSON.stringify(error.response.data));
    } else {
      console.error(`❌ [EVOLUTION_PAIRING] Request Error:`, error.message);
    }
    return null;
  }
}
