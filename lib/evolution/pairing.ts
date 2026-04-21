import axios from 'axios';

const getBaseUrl = () => (process.env.EVOLUTION_API_URL || process.env.EVOLUTION_URL || "").replace(/\/$/, "");

/**
 * Generates an 8-character pairing code for an instance using a phone number.
 * Pattern: instance-{phone}
 */
export async function getPairingCode(phone: string) {
  const instanceName = `instance-${phone.replace(/\D/g, '')}`;
  const apikey = process.env.EVOLUTION_API_KEY;
  const url = `${getBaseUrl()}/instance/connect/phone/${instanceName}`;

  console.log(`📡 [EVOLUTION_PAIRING] Requesting code for: ${phone} (Instance: ${instanceName})`);

  try {
    const res = await axios.post(url, {
      number: phone.replace(/\D/g, '')
    }, {
      headers: {
        'apikey': apikey as string,
        'Content-Type': 'application/json'
      }
    });

    const code = res.data?.code;
    
    if (code) {
      console.log(`✅ [EVOLUTION_PAIRING] Code received: ${code}`);
      return code;
    }

    throw new Error('No pairing code returned from Evolution API');
  } catch (error: any) {
    if (error.response) {
      console.error(`❌ [EVOLUTION_PAIRING] API Error (${error.response.status}):`, JSON.stringify(error.response.data));
    } else {
      console.error(`❌ [EVOLUTION_PAIRING] Request Error:`, error.message);
    }
    return null;
  }
}
