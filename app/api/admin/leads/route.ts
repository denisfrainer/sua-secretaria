// app/api/admin/leads/route.ts
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../../lib/supabase/admin';

export async function GET(req: Request) {
    try {
        const url = new URL(req.url);
        const key = url.searchParams.get('key') || req.headers.get('x-admin-key') || '';

        if (!key || key !== process.env.ADMIN_SECRET_PASSWORD) {
            return new NextResponse('Unauthorized', { status: 401 });
        }

        const { data, error } = await supabaseAdmin
            .from('leads_lobo')
            .select('*')
            .order('criado_em', { ascending: false });

        if (error) {
            console.error('❌ Erro ao buscar leads:', error);
            return NextResponse.json({ error: 'Database query failed' }, { status: 500 });
        }

        return NextResponse.json({ leads: data || [] });
    } catch (error) {
        console.error('❌ Erro Crítico na rota admin/leads:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
