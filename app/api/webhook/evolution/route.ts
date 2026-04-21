import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { GoogleGenAI, Type } from '@google/genai';
import { sendWhatsAppMessage } from '@/lib/whatsapp/sender';
import { generateGoogleAuthUrl } from '@/lib/google/auth';
import { getPairingCode } from '@/lib/evolution/pairing';

// Configuration
export const maxDuration = 60; // Timeout handling for LLM

const ai = new GoogleGenAI({ 
  apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY || '' 
});

// JSON Schema for Onboarding Extraction
const onboardingSchema: any = {
  type: Type.OBJECT,
  properties: {
    businessName: {
      type: Type.STRING,
      description: "The name of the business or the professional's name.",
    },
    primaryService: {
      type: Type.STRING,
      description: "The main service offered (e.g., 'Pé e Mão', 'Corte de Cabelo').",
    },
    price: {
      type: Type.NUMBER,
      description: "The price of the primary service as a numeric value.",
    },
    durationMinutes: {
      type: Type.INTEGER,
      description: "The estimated duration of the service in minutes.",
    }
  },
  required: ["businessName", "primaryService", "price", "durationMinutes"],
};

export async function POST(req: Request) {
  try {
    const body = await req.json();
    console.log('📦 [WEBHOOK] Received payload:', JSON.stringify(body).substring(0, 200));

    // Handle Evolution API structure (sometimes message is in data)
    const data = body.data || body;
    const key = data.key;
    if (!key) return NextResponse.json({ success: true, message: 'No key found' });

    const phone = key.remoteJid.replace('@s.whatsapp.net', '');
    const messageText = data.message?.conversation || 
                       data.message?.extendedTextMessage?.text || 
                       data.message?.imageMessage?.caption || "";

    if (!messageText && !data.message?.imageMessage) {
      return NextResponse.json({ success: true, message: 'Empty message ignored' });
    }

    // 1. Fetch or Create User State
    let { data: user, error: fetchError } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('phone', phone)
      .maybeSingle();

    if (!user) {
      console.log(`🆕 [STATE] Creating new profile for ${phone}`);
      const { data: newUser, error: createError } = await supabaseAdmin
        .from('profiles')
        .insert({ 
          phone, 
          conversation_state: 'ONBOARDING', 
          simulation_count: 0,
          full_name: 'New WhatsApp User',
          email: `${phone}@whatsapp.com` // Placeholder
        })
        .select()
        .single();
      
      if (createError) throw createError;
      user = newUser;
    }

    // 2. State Machine Routing
    console.log(`🤖 [STATE] User ${phone} is in state: ${user.conversation_state}`);
    
    switch (user.conversation_state) {
      case 'ONBOARDING':
        await handleOnboarding(phone, messageText, user);
        break;
      case 'SIMULATION':
        await handleSimulation(phone, messageText, user);
        break;
      case 'PAYWALL':
        await handlePaywall(phone, messageText, user);
        break;
      default:
        console.warn(`⚠️ [STATE] Unknown state: ${user.conversation_state}`);
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('❌ [WEBHOOK ERROR]:', error.message);
    return NextResponse.json({ success: false, error: error.message }, { status: 200 }); // Always 200 for Evolution
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

    console.log(`✅ [ONBOARDING] Extracted data:`, extractedData);

    // Update Supabase with extracted data and switch state
    const { error: updateError } = await supabaseAdmin
      .from('profiles')
      .update({
        business_name: extractedData.businessName,
        primary_service: extractedData.primaryService,
        price: extractedData.price,
        duration_minutes: extractedData.durationMinutes,
        conversation_state: 'SIMULATION',
        simulation_count: 0
      })
      .eq('phone', phone);

    if (updateError) throw updateError;

    const transitionMsg = `✅ Perfeito! Perfil criado para a *${extractedData.businessName}*.\n\nEspecialidade: ${extractedData.primaryService}\nPreço: R$ ${extractedData.price}\nAvaliação: ${extractedData.durationMinutes} min\n\nAgora vamos testar? Me mande uma mensagem fingindo ser um cliente tentando marcar um horário para ver como eu respondo! 🚀`;
    await sendWhatsAppMessage(phone, transitionMsg);

  } catch (err: any) {
    console.error(`❌ [ONBOARDING ERROR]`, err.message);
    await sendWhatsAppMessage(phone, "Oi! Eu sou a Eliza. Para começarmos, me conte qual o nome do seu negócio e qual o principal serviço que você oferece (e o preço)?");
  }
}

/**
 * HANDLER: SIMULATION
 * Goal: Act as the AI assistant, increment count, and transition to PAYWALL
 */
async function handleSimulation(phone: string, text: string, user: any) {
  const newCount = (user.simulation_count || 0) + 1;
  console.log(`🧪 [SIMULATION] Count: ${newCount} for ${phone}`);

  // Base LLM logic (Conceptual)
  const prompt = `
    You are the AI assistant for "${user.business_name}".
    You offer "${user.primary_service}" for R$ ${user.price} (${user.duration_minutes} min).
    A potential client (the user) is testing you.
    
    Client says: "${text}"
    
    Respond naturally as a helpful receptionist. Keep it short and in Portuguese.
  `;

  const result = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: [{ role: 'user', parts: [{ text: prompt }] }]
  });
  
  const response = result.text || "Entendido! Como posso ajudar mais?";

  // Update count
  await supabaseAdmin
    .from('profiles')
    .update({ simulation_count: newCount })
    .eq('phone', phone)

  if (newCount >= 3) {
    const syncUrl = await generateGoogleAuthUrl(user.id);
    const paywallMsg = `${response}\n\n--- \n🏁 *Simulação concluída!* Você viu como sou rápida e eficiente?\n\nO próximo passo agora é conectar sua agenda para que eu possa marcar horários de verdade.\n\n*Clique aqui para sincronizar:* ${syncUrl}`;
    
    // We don't transition to PAYWALL yet, we wait for the Google Sync callback
    // But we update count so we don't repeat this
    // (Actually the user said SIMULATION -> PAYWALL trigger after sync link click or sync success)
    // The directive says: "The callback route updates the Supabase state to PAYWALL"
  } else {
    await sendWhatsAppMessage(phone, response);
  }
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


