import axios from 'axios';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

// Load environment variables from .env.local
dotenv.config({ path: resolve(process.cwd(), '.env.local') });

async function simulatePayment() {
    const args = process.argv.slice(2);
    const targetPhone = args[0];

    if (!targetPhone) {
        console.error('❌ Error: Please provide a target phone number.');
        console.log('Usage: npx tsx scripts/test/simulate-payment.ts 55XXXXXXXXXXX');
        process.exit(1);
    }

    const webhookUrl = process.env.WEBHOOK_URL?.replace('/api/webhook', '/api/webhook/payment') || 'http://localhost:3000/api/webhook/payment';
    
    console.log(`🚀 [GOD MODE] Simulating payment for: ${targetPhone}`);
    console.log(`🔗 Targeting Webhook: ${webhookUrl}`);

    const payload = {
        type: 'order.paid',
        data: {
            customer: {
                phones: {
                    mobile_phone: {
                        number: targetPhone
                    }
                }
            }
        }
    };

    try {
        const response = await axios.post(webhookUrl, payload, {
            headers: {
                'Content-Type': 'application/json',
                'x-pagarme-signature': process.env.PAGARME_WEBHOOK_SECRET || 'mock-secret'
            }
        });

        console.log('✅ [SUCCESS] Webhook accepted:', response.status, response.data);
    } catch (err: any) {
        console.error('💥 [FAILED] Webhook rejected:', err.response?.status, err.response?.data || err.message);
    }
}

simulatePayment();
