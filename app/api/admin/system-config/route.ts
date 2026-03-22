import { NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../../lib/supabase/admin';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
    try {
        const url = new URL(req.url);
        const token = url.searchParams.get('token');
        
        // Fallback to WOLF_SECRET_TOKEN if WOLF_ADMIN_TOKEN is missing
        const validToken = process.env.WOLF_ADMIN_TOKEN || process.env.WOLF_SECRET_TOKEN;

        if (!token || token !== validToken) {
            return new NextResponse('Unauthorized', { status: 401 });
        }

        const { data, error } = await supabaseAdmin
            .from('system_settings')
            .select('value')
            .eq('key', 'global_kill_switch')
            .single();

        if (error && error.code !== 'PGRST116') { // PGRST116 is "Row not found"
            console.error('❌ Erro ao buscar configuração do sistema:', error);
            return NextResponse.json({ error: 'Database error' }, { status: 500 });
        }

        // Return default status if not found
        const responseData = data ? data.value : { enabled: true };
        
        return NextResponse.json(responseData);
    } catch (error) {
        console.error('❌ Erro Crítico na rota GET system-config:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const token = req.headers.get('x-wolf-token');
        const validToken = process.env.WOLF_ADMIN_TOKEN || process.env.WOLF_SECRET_TOKEN;

        if (!token || token !== validToken) {
            return new NextResponse('Unauthorized', { status: 401 });
        }

        const body = await req.json();
        
        if (typeof body.enabled !== 'boolean') {
            return NextResponse.json({ error: 'Campo "enabled" boolean é obrigatório' }, { status: 400 });
        }

        const { error } = await supabaseAdmin
            .from('system_settings')
            .upsert({
                key: 'global_kill_switch',
                value: { enabled: body.enabled },
                updated_at: new Date().toISOString()
            }, {
                onConflict: 'key'
            });

        if (error) {
            console.error('❌ Erro Supabase ao atualizar system_settings:', error.message);
            return NextResponse.json({ error: 'Failed to update system settings' }, { status: 500 });
        }

        console.log(`🔄 System Config Updated: Eliza is now ${body.enabled ? 'ON' : 'OFF'}`);
        return NextResponse.json({ status: 'success', enabled: body.enabled });
        
    } catch (error) {
        console.error('❌ Erro Crítico na rota POST system-config:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
