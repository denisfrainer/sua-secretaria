import { supabaseAdmin } from '../supabase/admin';

const sleep = (ms: number) => new Promise(res => setTimeout(res, ms));

export async function withWhatsAppLock<T>(
    callback: () => Promise<T>,
    maxRetries = 10,
    baseWaitMs = 1500
): Promise<T> {
    const lockId = 1;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
        const { data: lock, error: fetchError } = await supabaseAdmin
            .from('wolf_system_lock')
            .select('is_busy')
            .eq('id', lockId)
            .single();

        if (fetchError && fetchError.code !== 'PGRST116') {
             console.error('Error fetching WhatsApp lock:', fetchError);
        }

        if (!lock?.is_busy) {
            // Attempt to acquire lock using optimistic concurrency control
            const { data: updateData, error: updateError } = await supabaseAdmin
                .from('wolf_system_lock')
                .update({ is_busy: true, updated_at: new Date().toISOString() })
                .eq('id', lockId)
                .eq('is_busy', false)
                .select();

            if (updateError) {
                console.error('Error updating WhatsApp lock:', updateError);
            } else if (updateData && updateData.length > 0) {
                // Successfully acquired the lock
                try {
                    return await callback();
                } finally {
                    // Strictly release the lock
                    await supabaseAdmin
                        .from('wolf_system_lock')
                        .update({ is_busy: false, updated_at: new Date().toISOString() })
                        .eq('id', lockId);
                }
            }
        }

        // Lock is busy or we lost the race, wait with a random delay to prevent thundering herd
        const sleepTime = baseWaitMs + Math.random() * 1500;
        console.log(`[WhatsApp Lock] Busy, waiting ${Math.round(sleepTime)}ms... (Attempt ${attempt + 1}/${maxRetries})`);
        await sleep(sleepTime);
    }

    throw new Error('Timeout: Could not acquire the WhatsApp lock after maximum retries.');
}