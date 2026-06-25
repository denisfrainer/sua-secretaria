// app/api/admin/update-status/route.ts
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../../lib/supabase/admin';

export async function POST(req: Request) {
    try {
        const secret = req.headers.get('x-wolf-token');
        if (!secret || secret !== process.env.WOLF_SECRET_TOKEN) {
            return new NextResponse('Unauthorized', { status: 401 });
        }

        const { leadId, newStatus } = await req.json();

        if (!leadId || !newStatus) {
            return NextResponse.json({ error: 'Missing leadId or newStatus' }, { status: 400 });
        }

        const validStatuses = [
            'pending',
            'contacted',
            'talking',
            'hot_lead',
            'closed',
            'invalid_phone',
            'organic_inbound',
            'lixo',
        ];

        if (!validStatuses.includes(newStatus)) {
            return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
        }

        const { error } = await supabaseAdmin
            .from('leads_lobo')
            .update({ status: newStatus })
            .eq('id', leadId);

        if (error) {
            console.error('❌ Erro ao atualizar status do lead:', error);
            return NextResponse.json({ error: 'Database update failed' }, { status: 500 });
        }

        return NextResponse.json({ status: 'updated' });
    } catch (error) {
        console.error('❌ Erro Crítico na rota admin/update-status:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
