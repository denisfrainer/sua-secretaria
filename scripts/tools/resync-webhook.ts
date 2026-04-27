/**
 * WEBHOOK RE-SYNC SCRIPT
 * =======================
 * Forces the Evolution API to re-register MESSAGES_UPSERT events
 * for a specific instance. Run this if the instance was created
 * without the correct webhook events configured.
 *
 * Usage:
 *   npx tsx scripts/tools/resync-webhook.ts <INSTANCE_NAME>
 *
 * Example:
 *   npx tsx scripts/tools/resync-webhook.ts belezap44426afb
 */

const INSTANCE_NAME = process.argv[2];
const EVOLUTION_API_URL = (process.env.EVOLUTION_API_URL || '').replace(/\/$/, '');
const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY || '';
const WEBHOOK_TARGET = (process.env.NEXT_PUBLIC_APP_URL || '').replace(/\/$/, '');

if (!INSTANCE_NAME) {
    console.error('❌ Usage: npx tsx scripts/tools/resync-webhook.ts <INSTANCE_NAME>');
    process.exit(1);
}

if (!EVOLUTION_API_URL || !EVOLUTION_API_KEY || !WEBHOOK_TARGET) {
    console.error('❌ Missing environment variables: EVOLUTION_API_URL, EVOLUTION_API_KEY, NEXT_PUBLIC_APP_URL');
    process.exit(1);
}

async function main() {
    const webhookUrl = `${WEBHOOK_TARGET}/api/webhook/evolution`;

    console.log(`\n🔧 [RESYNC] Instance: ${INSTANCE_NAME}`);
    console.log(`🔧 [RESYNC] Evolution API: ${EVOLUTION_API_URL}`);
    console.log(`🔧 [RESYNC] Webhook Target: ${webhookUrl}`);

    // Step 1: Check current webhook config
    console.log(`\n📡 [STEP 1] Fetching current webhook config...`);
    try {
        const currentRes = await fetch(`${EVOLUTION_API_URL}/webhook/find/${INSTANCE_NAME}`, {
            method: 'GET',
            headers: { 'apikey': EVOLUTION_API_KEY }
        });
        if (currentRes.ok) {
            const currentData = await currentRes.json();
            console.log(`📋 Current Config:`, JSON.stringify(currentData, null, 2));
        } else {
            console.warn(`⚠️ Could not fetch current config: ${currentRes.status}`);
        }
    } catch (e: any) {
        console.warn(`⚠️ Fetch error: ${e.message}`);
    }

    // Step 2: Force-set webhook with MESSAGES_UPSERT
    console.log(`\n📡 [STEP 2] Force-setting webhook events...`);
    const setPayload = {
        webhook: {
            url: webhookUrl,
            enabled: true,
            webhookByEvents: false,
            events: [
                "MESSAGES_UPSERT",
                "CONNECTION_UPDATE"
            ]
        }
    };

    console.log(`📤 Payload:`, JSON.stringify(setPayload, null, 2));

    const setRes = await fetch(`${EVOLUTION_API_URL}/webhook/set/${INSTANCE_NAME}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'apikey': EVOLUTION_API_KEY
        },
        body: JSON.stringify(setPayload)
    });

    const setData = await setRes.json();
    console.log(`📡 Response [${setRes.status}]:`, JSON.stringify(setData, null, 2));

    if (setRes.ok) {
        console.log(`\n✅ [RESYNC] Webhook re-synced successfully for "${INSTANCE_NAME}".`);
    } else {
        console.error(`\n❌ [RESYNC] Failed to re-sync webhook.`);
    }

    // Step 3: Verify
    console.log(`\n📡 [STEP 3] Verifying final config...`);
    try {
        const verifyRes = await fetch(`${EVOLUTION_API_URL}/webhook/find/${INSTANCE_NAME}`, {
            method: 'GET',
            headers: { 'apikey': EVOLUTION_API_KEY }
        });
        if (verifyRes.ok) {
            const verifyData = await verifyRes.json();
            console.log(`✅ Final Config:`, JSON.stringify(verifyData, null, 2));
        }
    } catch (e: any) {
        console.warn(`⚠️ Verify error: ${e.message}`);
    }

    // Step 4: Check connection state
    console.log(`\n📡 [STEP 4] Checking connection state...`);
    try {
        const stateRes = await fetch(`${EVOLUTION_API_URL}/instance/connectionState/${INSTANCE_NAME}`, {
            method: 'GET',
            headers: { 'apikey': EVOLUTION_API_KEY }
        });
        if (stateRes.ok) {
            const stateData = await stateRes.json();
            console.log(`📊 Connection State:`, JSON.stringify(stateData, null, 2));
        }
    } catch (e: any) {
        console.warn(`⚠️ State error: ${e.message}`);
    }
}

main().catch(err => {
    console.error('💥 Fatal:', err);
    process.exit(1);
});
