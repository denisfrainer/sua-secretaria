import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return new NextResponse('Unauthorized', { status: 401 });
        }

        const { data, error } = await supabaseAdmin
            .from('system_settings')
            .select('value')
            .eq('key', 'eliza_active')
            .single();

        if (error && error.code !== 'PGRST116') {
            console.error('❌ Erro ao buscar eliza_active:', error);
            return NextResponse.json({ error: 'Database error' }, { status: 500 });
        }

        const enabled = data ? (data.value as any).enabled : true;
        return NextResponse.json({ enabled });
    } catch (error) {
        console.error('❌ Erro Crítico GET system-toggle:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return new NextResponse('Unauthorized', { status: 401 });
        }

        const { enabled } = await req.json();
        
        if (typeof enabled !== 'boolean') {
            return NextResponse.json({ error: 'Campo "enabled" é obrigatório' }, { status: 400 });
        }

        const { error } = await supabaseAdmin
            .from('system_settings')
            .upsert({
                key: 'eliza_active',
                value: { enabled: enabled },
                updated_at: new Date().toISOString()
            }, {
                onConflict: 'key'
            });

        if (error) {
            console.error('❌ Erro ao atualizar eliza_active:', error.message);
            return NextResponse.json({ error: 'Failed' }, { status: 500 });
        }

        return NextResponse.json({ status: 'success', enabled });
    } catch (error) {
        console.error('❌ Erro Crítico POST system-toggle:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
