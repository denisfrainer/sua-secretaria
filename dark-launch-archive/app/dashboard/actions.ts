'use server';

import { supabaseAdmin } from '@/lib/supabase/admin';

export async function updateSystemPrompt(agentId: string, prompt: string) {
    if (!agentId) throw new Error('Agent ID is required');
    
    const { error } = await supabaseAdmin
        .from('agent_configs')
        .update({ system_prompt: prompt })
        .eq('id', agentId);

    if (error) {
        throw new Error(`Failed to update prompt: ${error.message}`);
    }

    return { success: true };
}
