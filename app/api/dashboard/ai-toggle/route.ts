import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { enabled } = await request.json();

    if (typeof enabled !== 'boolean') {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
    }

    // 1. Fetch current config
    const { data: config, error: fetchError } = await supabaseAdmin
      .from('business_config')
      .select('context_json')
      .eq('owner_id', user.id)
      .single();

    if (fetchError || !config) {
      return NextResponse.json({ error: 'Business configuration not found' }, { status: 404 });
    }

    // 2. Update context_json
    const updatedContext = {
      ...(config.context_json as object),
      is_ai_enabled: enabled,
      updated_at: new Date().toISOString()
    };

    const { error: updateError } = await supabaseAdmin
      .from('business_config')
      .update({ context_json: updatedContext })
      .eq('owner_id', user.id);

    if (updateError) {
      console.error('❌ [AI_TOGGLE] Failed to update config:', updateError);
      return NextResponse.json({ error: 'Failed to update configuration' }, { status: 500 });
    }

    console.log(`✅ [AI_TOGGLE] User ${user.id} toggled AI to ${enabled ? 'ON' : 'OFF'}`);
    return NextResponse.json({ success: true, enabled });

  } catch (error: any) {
    console.error('💥 [AI_TOGGLE] Exception:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: config, error } = await supabaseAdmin
      .from('business_config')
      .select('context_json')
      .eq('owner_id', user.id)
      .single();

    if (error || !config) {
        return NextResponse.json({ enabled: true }); // Default fallback
    }

    const enabled = (config.context_json as any)?.is_ai_enabled ?? true;
    return NextResponse.json({ enabled });

  } catch (error) {
    return NextResponse.json({ enabled: true });
  }
}
