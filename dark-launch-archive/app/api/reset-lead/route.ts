import { NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../lib/supabase/admin';

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const phone = searchParams.get('phone');

    if (!phone) {
        return NextResponse.json({ error: 'Phone parameter is required' }, { status: 400 });
    }

    try {
        // 1. Deletar histórico da tabela CORRETA que a Eliza lê ('messages')
        const { error: deleteError } = await supabaseAdmin
            .from('messages')
            .delete()
            .eq('lead_phone', phone);

        if (deleteError) throw deleteError;

        // 2. Resetar TODAS as travas do lead no banco para o estado "Virgem"
        const { error: resetError } = await supabaseAdmin
            .from('leads_lobo')
            .update({
                reply_count: 0,
                status: 'organic_inbound', // Força ela a rodar o STEP 0 novamente
                ai_paused: false,
                needs_human: false,
                is_locked: false,
                main_bottleneck: null,
                lead_temperature: null
            })
            .eq('phone', phone);

        if (resetError) throw resetError;

        return NextResponse.json({
            status: 'success',
            message: `🧠 Memória do lead ${phone} apagada completamente. Pode mandar o 'Oi' para testar o STEP 0!`
        });
    } catch (error: any) {
        console.error('Error wiping lead memory:', error);
        return NextResponse.json({ error: 'Failed to reset lead' }, { status: 500 });
    }
}