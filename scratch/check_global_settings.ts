import axios from 'axios';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function checkGlobalSettings() {
    const baseUrl = (process.env.EVOLUTION_API_URL || "").replace(/\/$/, "");
    const apiKey = process.env.EVOLUTION_API_KEY;

    if (!apiKey) {
        console.error("Missing EVOLUTION_API_KEY");
        return;
    }

    console.log(`\n🔍 [AUDIT] Fetching global settings from ${baseUrl}`);
    
    try {
        const res = await axios.get(`${baseUrl}/settings/find`, {
            headers: { 'apikey': apiKey }
        });
        console.log("\n🌍 GLOBAL SETTINGS:");
        console.log(JSON.stringify(res.data, null, 2));

    } catch (error: any) {
        console.error(`❌ [AUDIT ERROR]`, error.response?.data || error.message);
    }
}

checkGlobalSettings();
