import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { GoogleGenAI } from '@google/genai';
import { sendWhatsAppMessage } from '@/lib/whatsapp/sender';
import { generatePrompt } from '@/lib/agent/prompt';

export const maxDuration = 60;

const ai = new GoogleGenAI({ 
  apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY || '' 
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const data = body.data || body;
    const key = data.key;

    const remoteJid = key.remoteJid || "";

    // 🛡️ GATEKEEPER: Drop non-standard JIDs (Groups, Broadcasts, Newsletters)
    if (!remoteJid.endsWith('@s.whatsapp.net')) {
      console.log(`🛡️ [AGENT_WEBHOOK] Dropping non-standard JID: ${remoteJid}`);
      return NextResponse.json({ success: true, message: 'Filtered: Non-standard JID' });
    }

    const phone = remoteJid.replace('@s.whatsapp.net', '');
    const fromMe = key.fromMe || false;
    const tenantId = new URL(req.url).searchParams.get('tenantId');

    console.log(`🤖 [AGENT_WEBHOOK] Message from ${phone} | fromMe: ${fromMe} | Tenant: ${tenantId}`);

    if (!tenantId) {
      console.warn('⚠️ [AGENT_WEBHOOK] No tenantId found in webhook URL');
      return NextResponse.json({ success: true });
    }

    // 1. CIRCUIT BREAKER: Human Handoff (Panic Button)
    if (fromMe) {
      console.log(`🛡️ [PANIC_BUTTON] Owner intervention detected for ${phone}. Pausing AI for 1 hour.`);
      
      const pausedUntil = new Date(Date.now() + 3600 * 1000).toISOString();
      
      await supabaseAdmin
        .from('chat_sessions')
        .upsert({
          profile_id: tenantId,
          lead_phone: phone,
          paused_until: pausedUntil
        }, { onConflict: 'profile_id,lead_phone' });

      return NextResponse.json({ success: true, message: 'AI Paused' });
    }

    // 2. CHECK PAUSE STATE
    const { data: session } = await supabaseAdmin
      .from('chat_sessions')
      .select('paused_until')
      .eq('profile_id', tenantId)
      .eq('lead_phone', phone)
      .maybeSingle();

    if (session?.paused_until && new Date() < new Date(session.paused_until)) {
      const remainingMin = Math.ceil((new Date(session.paused_until).getTime() - Date.now()) / 60000);
      console.log(`😴 [AGENT_WEBHOOK] AI is currently paused for ${phone}. Resuming in ~${remainingMin} min.`);
      return NextResponse.json({ success: true, message: 'AI Stays Quiet' });
    }

    // 3. GET BUSINESS CONTEXT
    const { data: config } = await supabaseAdmin
      .from('business_config')
      .select('*')
      .eq('owner_id', tenantId)
      .single();

    if (!config) {
      console.error('❌ [AGENT_WEBHOOK] Business config not found for tenant:', tenantId);
      return NextResponse.json({ success: true });
    }

    // 4. GENERATE AI RESPONSE
    const messageText = data.message?.conversation || 
                       data.message?.extendedTextMessage?.text || "";

    if (!messageText) return NextResponse.json({ success: true });

    const prompt = generatePrompt(
      config.business_name || "Sua Empresa",
      config.custom_rules || "Seja educada e prestativa.",
      config.context_json?.services || [],
      tenantId
    );

    const result = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [{ role: 'user', parts: [{ text: `${prompt}\n\nClient: "${messageText}"` }] }]
    });

    const response = result.text || "Pode me contar mais sobre o que você precisa?";

    // 5. DISPATCH
    await sendWhatsAppMessage(phone, response);

    return NextResponse.json({ success: true });

  } catch (error: any) {
    console.error('❌ [AGENT_WEBHOOK ERROR]:', error.message);
    return NextResponse.json({ success: false, error: error.message }, { status: 200 }); // Always 200 for Evolution
  }
}
