import { NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../../lib/supabase/admin';

export async function GET(req: Request) {
    try {
        const url = new URL(req.url);
        const token = url.searchParams.get('token');
        const validToken = process.env.WOLF_ADMIN_TOKEN || process.env.WOLF_SECRET_TOKEN;

        if (!token || token !== validToken) {
            return new NextResponse('Unauthorized', { status: 401 });
        }

        // Fetch all locked / bot-war leads
        const { data, error } = await supabaseAdmin
            .from('leads_lobo')
            .select('id, name, phone, status, reply_count, is_locked, updated_at')
            .or('is_locked.eq.true,reply_count.gt.10,status.eq.needs_human')
            .order('reply_count', { ascending: false });

        if (error) {
            console.error('❌ Quarantine query error:', error);
            return NextResponse.json({ error: 'Database error' }, { status: 500 });
        }

        return NextResponse.json({ leads: data || [] });
    } catch (error) {
        console.error('❌ Quarantine GET error:', error);
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
        const { action, leadId } = body;

        if (action === 'reset_single' && leadId) {
            // Reset a single lead
            const { error } = await supabaseAdmin
                .from('leads_lobo')
                .update({
                    is_locked: false,
                    reply_count: 0,
                    ai_paused: false,
                    status: 'contacted',
                })
                .eq('id', leadId);

            if (error) {
                return NextResponse.json({ error: 'Failed to reset lead' }, { status: 500 });
            }
            console.log(`🔓 [QUARANTINE] Lead ${leadId} desbloqueado e resetado.`);
            return NextResponse.json({ status: 'success', action: 'reset_single' });
        }

        if (action === 'master_reset') {
            // Master reset: Clear ALL locked leads
            const { error } = await supabaseAdmin
                .from('leads_lobo')
                .update({
                    is_locked: false,
                    reply_count: 0,
                    ai_paused: false,
                })
                .or('is_locked.eq.true,reply_count.gt.0');

            if (error) {
                return NextResponse.json({ error: 'Master reset failed' }, { status: 500 });
            }
            console.log(`🔓 [QUARANTINE] MASTER RESET executado. Todos os leads desbloqueados.`);
            return NextResponse.json({ status: 'success', action: 'master_reset' });
        }

        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    } catch (error) {
        console.error('❌ Quarantine POST error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
