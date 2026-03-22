import { NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../lib/supabase/admin';

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const phone = searchParams.get('phone');

    if (!phone) {
        return NextResponse.json({ error: 'Phone parameter is required' }, { status: 400 });
    }

    try {
        // Delete chat history
        const { error: deleteError } = await supabaseAdmin
            .from('chat_history')
            .delete()
            .eq('whatsapp_number', phone);

        if (deleteError) throw deleteError;

        // Reset lead reply count
        const { error: resetError } = await supabaseAdmin
            .from('leads_lobo')
            .update({ reply_count: 0 })
            .eq('phone', phone);

        if (resetError) throw resetError;

        return NextResponse.json({ status: 'success', message: `Lead ${phone} memory wiped and reply count reset.` });
    } catch (error: any) {
        console.error('Error wiping lead memory:', error);
        return NextResponse.json({ error: 'Failed to reset lead' }, { status: 500 });
    }
}
