import axios from 'axios';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function auditInstance(instanceName: string) {
    const baseUrl = (process.env.EVOLUTION_API_URL || "").replace(/\/$/, "");
    const apiKey = process.env.EVOLUTION_API_KEY;

    if (!apiKey) {
        console.error("Missing EVOLUTION_API_KEY");
        return;
    }

    console.log(`\n🔍 [AUDIT] Fetching settings for instance: ${instanceName}`);
    
    try {
        // 1. Check Instance Settings
        console.log(`📡 [AUDIT] Checking settings...`);
        const settingsRes = await axios.get(`${baseUrl}/settings/find/${instanceName}`, {
            headers: { 'apikey': apiKey }
        });
        console.log("\n⚙️  INSTANCE SETTINGS:");
        console.log(JSON.stringify(settingsRes.data, null, 2));

        // 2. Check Webhook Settings
        console.log(`📡 [AUDIT] Checking webhooks...`);
        const webhookRes = await axios.get(`${baseUrl}/webhook/find/${instanceName}`, {
            headers: { 'apikey': apiKey }
        });
        console.log("\n🔗 WEBHOOK CONFIG:");
        console.log(JSON.stringify(webhookRes.data, null, 2));

    } catch (error: any) {
        console.error(`❌ [AUDIT ERROR]`, error.response?.data || error.message);
    }
}

const target = process.argv[2] || 'secretariaminhaempre';
auditInstance(target);
