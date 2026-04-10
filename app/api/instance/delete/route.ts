import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

export async function POST(request: Request) {
    const tag = '🗑️ [INSTANCE_DELETE]';
    
    try {
        // 1. Auth
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // 2. Get the instance name from the request OR from the database
        const url = new URL(request.url);
        let instanceName = url.searchParams.get('instance');

        if (!instanceName) {
            const { data: config } = await supabaseAdmin
                .from('business_config')
                .select('instance_name')
                .eq('owner_id', user.id)
                .maybeSingle();
            instanceName = config?.instance_name;
        }

        if (!instanceName) {
            return NextResponse.json({ error: 'No instance found to delete' }, { status: 404 });
        }

        console.log(`${tag} User ${user.id} requesting deletion of instance: ${instanceName}`);

        const baseUrl = process.env.EVOLUTION_API_URL;
        const apiKey = process.env.EVOLUTION_API_KEY;

        // 3. Attempt to delete from Evolution API (best-effort)
        if (baseUrl && apiKey) {
            try {
                // Try logout first (graceful disconnect)
                const logoutRes = await fetch(`${baseUrl}/instance/logout/${instanceName}`, {
                    method: 'DELETE',
                    headers: { 'apikey': apiKey },
                });
                console.log(`${tag} Logout response: ${logoutRes.status}`);
            } catch (e: any) {
                console.warn(`${tag} Logout failed (non-critical): ${e.message}`);
            }

            try {
                // Then delete the instance entirely
                const deleteRes = await fetch(`${baseUrl}/instance/delete/${instanceName}`, {
                    method: 'DELETE',
                    headers: { 'apikey': apiKey },
                });
                console.log(`${tag} Delete response: ${deleteRes.status}`);
            } catch (e: any) {
                console.warn(`${tag} Delete failed (non-critical): ${e.message}`);
            }
        }

        // 4. ALWAYS clear the local database record regardless of Evolution API result
        const { data: existingConfig } = await supabaseAdmin
            .from('business_config')
            .select('context_json')
            .eq('owner_id', user.id)
            .maybeSingle();

        if (existingConfig) {
            const cleanedContext = {
                ...(existingConfig.context_json as object),
                connection_status: 'DISCONNECTED'
            };

            const { error: updateError } = await supabaseAdmin
                .from('business_config')
                .update({
                    instance_name: null,
                    context_json: cleanedContext,
                    updated_at: new Date().toISOString()
                })
                .eq('owner_id', user.id);

            if (updateError) {
                console.error(`${tag} DB update failed:`, updateError);
                return NextResponse.json({ error: 'Failed to clear database record' }, { status: 500 });
            }
        }

        console.log(`${tag} ✅ Instance ${instanceName} fully deleted for user ${user.id}`);
        return NextResponse.json({ 
            success: true, 
            message: 'Instância excluída com sucesso.' 
        });

    } catch (error: any) {
        console.error(`${tag} 💥 Exception:`, error);
        return NextResponse.json({ error: 'Internal Server Error', message: error.message }, { status: 500 });
    }
}
