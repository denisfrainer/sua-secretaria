import axios from 'axios';

const getBaseUrl = () => (process.env.EVOLUTION_API_URL || process.env.EVOLUTION_URL || "").replace(/\/$/, "");

/**
 * Creates an instance in Evolution API if it doesn't exist.
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
    // If instance already exists, it might return 403 or specific error message.
    // We log and continue, as we want to get the pairing code regardless.
    if (error.response?.status === 403 || error.response?.data?.message?.includes('already exists')) {
      console.log(`ℹ️ [EVOLUTION_PAIRING] Instance ${instanceName} already exists. Continuing.`);
      return true;
    }
    console.error(`⚠️ [EVOLUTION_PAIRING] Instance creation warning:`, error.response?.data || error.message);
    return false;
  }
}

/**
 * Generates an 8-character pairing code for an instance using a phone number.
 */
export async function getPairingCode(phone: string) {
  const cleanPhone = phone.replace(/\D/g, '');
  const prefix = process.env.EVOLUTION_INSTANCE_PREFIX || 'secretaria';
  const instanceName = `${prefix}-${cleanPhone}`;
  const apikey = process.env.EVOLUTION_API_KEY;
  
  // 1. Ensure instance exists
  await createInstance(instanceName);

  // 2. Request pairing code (Step B)
  const url = `${getBaseUrl()}/instance/connect/${instanceName}?number=${cleanPhone}`;

  console.log(`📡 [EVOLUTION_PAIRING] Requesting code for: ${phone} (Instance: ${instanceName})`);

  try {
    const res = await axios.get(url, {
      headers: {
        'apikey': apikey as string,
        'Content-Type': 'application/json'
      }
    });

    // 3. Extract Correct Property (Force pairingCode logic)
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
