import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { normalizePhone } from '@/lib/utils/phone';

// JSON Schema for Onboarding Extraction
// (Move this to worker or keep here for shared use)

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const data = body.data || body;
    const key = data.key;
    if (!key) return NextResponse.json({ success: true, message: 'No key found' });

    // 1. ATOMIC IDENTITY LOCK
    const rawPhone = key.remoteJid.replace('@s.whatsapp.net', '');
    const phone = normalizePhone(rawPhone);
    const messageText = data.message?.conversation || 
                       data.message?.extendedTextMessage?.text || "";

    if (!messageText && !data.message?.imageMessage) {
      return NextResponse.json({ success: true, message: 'Empty message ignored' });
    }

    console.log(`📡 [WEBHOOK] Inbound: ${phone} | State: Locking Profile...`);

    // 2. ATOMIC UPSERT (Guarantees UUID exists)
    const { data: user, error: upsertError } = await supabaseAdmin
      .from('profiles')
      .upsert({ 
        phone,
        worker_status: 'eliza_processing',
        updated_at: new Date().toISOString()
      }, { onConflict: 'phone' })
      .select()
      .single();

    if (upsertError || !user) {
      console.error('💥 [WEBHOOK:UPSERT_ERROR]', upsertError);
      throw new Error('Failed to lock profile identity');
    }

    console.log(`✅ [WEBHOOK:IDENTITY] Profile secured: ${user.id} | Status: eliza_processing`);

    return NextResponse.json({ success: true });

  } catch (error: any) {
    console.error('❌ [WEBHOOK ERROR]:', error.message);
    return NextResponse.json({ success: false, error: error.message }, { status: 200 });
  }
}

/**
 * HANDLER: ONBOARDING
 * Goal: Extract business data using LLM and transition to SIMULATION
 */
async function handleOnboarding(phone: string, text: string, user: any) {
  console.log(`🎯 [ONBOARDING] Processing text for ${phone}`);

  const prompt = `
    You are a sales representative for an AI automation company. 
    The user is a small business owner (like a manicurist or barber).
    Your goal is to extract their business name, primary service, price, and duration.
    
    User message: "${text}"

    If the user has provided enough information to fill the schema, extract it.
    If information is missing, use reasonable defaults for a small business MVP, but try to be as accurate as possible.
  `;

  try {
    const result = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      config: {
        responseMimeType: "application/json",
        responseSchema: onboardingSchema,
      },
    });

    const responseText = result.text || "";
    const extractedData = JSON.parse(responseText);

    console.log('[AUDIT_STEP_1_2] Lead state: ONBOARDING -> SIMULATION. Extracted Data:', extractedData);

    // 1. Update Profile State
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .update({
        conversation_state: 'SIMULATION',
        simulation_count: 0
      })
      .eq('phone', phone);

    if (profileError) throw profileError;

    // 2. Persist Business Metadata strictly into business_config
    const { error: configError } = await supabaseAdmin
      .from('business_config')
      .upsert({
        owner_id: user.id,
        business_name: extractedData.businessName,
        primary_service: extractedData.primaryService,
        price: extractedData.price,
        duration_minutes: extractedData.durationMinutes,
        instance_name: `instance-${phone}`, // Convention
        updated_at: new Date().toISOString()
      }, { onConflict: 'owner_id' });

    if (configError) throw configError;

    // 3. Trigger Step 3 Mock Message
    const syncUrl = await generateGoogleAuthUrl(user.id);
    const mockMsg = `Seu negócio foi configurado! Chame o número 48998097754 para testar o bot atuando como sua secretária agora mesmo. Quando terminar o teste, clique aqui para conectar sua agenda do Google: ${syncUrl}`;
    
    await sendWhatsAppMessage(phone, mockMsg);
    console.log('[AUDIT_STEP_3] Executing Mock Sandbox for phone:', phone);

  } catch (err: any) {
    console.error(`❌ [ONBOARDING ERROR]`, err.message);
    await sendWhatsAppMessage(phone, "Oi! Eu sou a Eliza. Para começarmos, me conte qual o nome do seu negócio e qual o principal serviço que você oferece (e o preço)?");
  }
}

/**
 * HANDLER: SIMULATION
 * Goal: Act as the AI assistant, increment count, and transition to PAYWALL
 * MVP FIX: Mock Sandbox interceptor to bypass Gemini
 */
async function handleSimulation(phone: string, text: string, user: any) {
  console.log(`[AUDIT_STEP_3] Executing Mock Sandbox for phone (Retry/Ongoing):`, phone);

  // Bypassing Gemini LLM strictly as requested for MVP validation
  const syncUrl = await generateGoogleAuthUrl(user.id);
  const mockMsg = `Seu negócio foi configurado! Chame o número 48998097754 para testar o bot atuando como sua secretária agora mesmo. Quando terminar o teste, clique aqui para conectar sua agenda do Google: ${syncUrl}`;
  
  await sendWhatsAppMessage(phone, mockMsg);
}

/**
 * HANDLER: PAYWALL
 * Goal: Answer pricing/setup questions and provide checkout link
 */
async function handlePaywall(phone: string, text: string, user: any) {
  console.log(`💰 [PAYWALL] Query from ${phone}: ${text}`);

  // Trigger pairing code generation proactively if they ask about it
  const pairingCode = await getPairingCode(phone);
  const checkoutLink = "https://suasecretaria.com.br/precos";

  const prompt = `
    The user is at the paywall stage. Their Google Account is already connected.
    Answer questions strictly about:
    - Pricing (Planos a partir de R$ 97/mês)
    - Pairing code setup (via Evolution API no painel)
    - Checkout link (${checkoutLink})
    
    Pairing Code: ${pairingCode || 'Aguardando...'}
    User says: "${text}"
    
    Be professional, persuasive, and direct. Respond in Portuguese.
  `;

  const result = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: [{ role: 'user', parts: [{ text: prompt }] }]
  });
  
  const response = result.text || "Para assinar e ativar o bot, acesse: https://suasecretaria.com.br/precos";

  await sendWhatsAppMessage(phone, response);
}


