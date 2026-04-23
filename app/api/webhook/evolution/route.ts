import { NextResponse, NextRequest } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { normalizePhone } from '@/lib/utils/phone';

export async function POST(req: NextRequest) {
  console.log(`📡 [WEB HEARTBEAT] Hit: ${req.nextUrl.pathname}${req.nextUrl.search}`);
  try {
    const body = await req.json();
    console.log(`[WEBHOOK INBOUND] Clean URL: ${req.nextUrl.search} | Event: ${body.event || body.type}`);
    const event = body.event || body.type; // Evolution v2 uses 'event'
    
    // 1. Safe extraction of Instance and State (handles nesting and direct properties)
    const dataObj = (Array.isArray(body.data) ? body.data[0] : body.data) || body;
    const instanceName = body.instance || dataObj.instanceName || body.instanceName || dataObj.instance;
    const state = dataObj.state || body.state || dataObj.status || body.status;
    let rawTenantId = req.nextUrl.searchParams.get("tenantId");
    let tenantId = rawTenantId ? rawTenantId.split('/')[0] : null;

    // 3. Graceful Error Handling for UUIDs
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (tenantId && !uuidRegex.test(tenantId)) {
      console.error(`🚨 [SECURITY_WARNING] Invalid tenantId format received: ${tenantId}`);
      tenantId = null;
    }

    // 🛡️ THE MASTER KEY (Resilient Resolution)
    if (!tenantId) {
      if (instanceName) {
        const { data: bConfig } = await supabaseAdmin
          .from('business_config')
          .select('owner_id')
          .eq('instance_name', instanceName)
          .maybeSingle();
        
        if (bConfig?.owner_id) {
          tenantId = bConfig.owner_id;
          console.log(`[IDENTITY_SYNC] Resolved tenantId from instanceName: ${instanceName} -> ${tenantId}`);
        }
      }

      if (!tenantId) {
        console.error(`🚨 [SECURITY_WARNING] Missing tenantId for instance: ${instanceName}. Dropping request.`);
        return new Response('Unauthorized: Missing tenantId', { status: 401 });
      }
    }

    console.log(`📡 [EVOLUTION_WEBHOOK] Event: ${event} | Instance: ${instanceName}`);
    
    // 2. Safety Check: Verify if instance exists in our DB
    if (instanceName) {
      const { data: exists } = await supabaseAdmin
        .from('business_config')
        .select('id')
        .eq('instance_name', instanceName)
        .maybeSingle();

      if (!exists) {
        console.warn(`🚨 [SECURITY_WARNING] Webhook received for UNKNOWN instance: ${instanceName}. Dropping request.`);
        return NextResponse.json({ error: "Unknown instance" }, { status: 200 });
      }
    }

    // --- CASE A: CONNECTION UPDATE (Handshake Lifecycle) ---
    if (event === "connection.update" || event === "CONNECTION_UPDATE") {
      // 2. Fallback observability
      if (!instanceName) {
          console.error("❌ [WEBHOOK_ERROR] Instance name missing. Raw body:", JSON.stringify(body, null, 2));
          return NextResponse.json({ error: "Missing instance name" }, { status: 200 });
      }

      console.log(`📡 [CONNECTION_UPDATE] Instance: ${instanceName} | State: ${state}`);

      if (state === "open") {
        try {
          console.log(`🔓 [HANDSHAKE] Confirmed for ${instanceName}. Syncing to Supabase...`);
          
          const { error } = await supabaseAdmin
            .from('business_config')
            .update({ 
              status: 'CONNECTED',
              updated_at: new Date().toISOString()
            })
            .eq('instance_name', instanceName);

          if (error) {
            console.error("❌ [DB_SYNC_ERROR] Failed to promote instance:", error);
          } else {
            console.log(`✅ [DB_SYNC_SUCCESS] ${instanceName} is now CONNECTED.`);
          }
        } catch (innerErr: any) {
          console.error("❌ [HANDSHAKE_ERROR] Failed during promotion logic:", innerErr.message);
        }
      }
      return NextResponse.json({ success: true });
    }

    // --- CASE B: MESSAGES UPSERT (Standard Inbound) ---
    if (event === "messages.upsert" || event === "MESSAGES_UPSERT") {
      // 1. A "Gambiarra" Oficial: Procura o número real na gaveta alternativa se o principal for um @lid
      let remoteJid = dataObj?.key?.remoteJid || dataObj?.remoteJid || "";
      if (dataObj?.key?.remoteJidAlt && String(dataObj.key.remoteJidAlt).includes('@s.whatsapp.net')) {
          remoteJid = String(dataObj.key.remoteJidAlt);
      }

      const rawNumber = remoteJid.split('@')[0];

      // 2. O Gatekeeper (Sempre priorizando liberação em vez de bloqueio preventivo)
      if (!remoteJid.endsWith('@s.whatsapp.net')) {
          console.log("🛑 [GATEKEEPER] Non-individual JID (Group or Broadcast) Rejected:", remoteJid);
          return new Response(JSON.stringify({ status: 'ignored' }), { status: 200 });
      }

      const key = dataObj.key;
      if (!key) return NextResponse.json({ success: true, message: 'No key found' });

      // 1. ATOMIC IDENTITY LOCK
      const rawPhone = rawNumber;
      const phone = normalizePhone(rawPhone);
      const isFromMe = key.fromMe === true;

      // Detect message types
      const messageObj = dataObj.message || {};
      const text = messageObj.conversation || messageObj.extendedTextMessage?.text || "";
      const isAudio = !!messageObj.audioMessage;
      const isImage = !!messageObj.imageMessage;


      if (!text && !isAudio && !isImage) {
        return NextResponse.json({ success: true, message: 'No processable content' });
      }

      console.log(`📡 [WEBHOOK] Inbound: ${phone} | Audio: ${isAudio} | Text: ${!!text}`);

      // 2. IDENTITY LOCK (Multi-Tenant)
      // Resolve Business Owner (Tenant) context
      let ownerId = tenantId;
      
      let query = supabaseAdmin.from('business_config').select('*');
      if (ownerId && instanceName) {
          query = query.or(`owner_id.eq.${ownerId},instance_name.eq.${instanceName}`);
      } else if (ownerId) {
          query = query.eq('owner_id', ownerId);
      } else if (instanceName) {
          query = query.eq('instance_name', instanceName);
      }

      const { data: bConfig } = await query.maybeSingle();
      
      ownerId = bConfig?.owner_id || ownerId;

      if (!ownerId) {
        console.warn(`⚠️ [WEBHOOK:IDENTITY_WARNING] Could not resolve ownerId for instance ${instanceName}. Proceeding with lead creation but worker might fail.`);
      }

      // Determine if sender is the owner to avoid putting customers in ONBOARDING
      let isOwner = false;
      if (ownerId) {
          const { data: oProfile } = await supabaseAdmin
            .from('profiles')
            .select('phone')
            .eq('id', ownerId)
            .maybeSingle();
          isOwner = phone === oProfile?.phone;
      }

      // Explicitly separate B2B (Owner) and B2C (Lead) lifecycles
      const profileType = isOwner ? 'OWNER' : 'LEAD';
      const initialState = isOwner ? 'ONBOARDING' : 'LEAD_ACTIVE';

      // Resolve Customer (Lead) Profile
      let { data: customerProfile } = await supabaseAdmin
        .from('profiles')
        .select('*')
        .eq('phone', phone)
        .maybeSingle();

      if (!customerProfile) {
        console.log(`🆕 [IDENTITY] Creating new ${profileType} profile for ${phone}. Default state: ${initialState}`);
        const { data: newProfile, error: createError } = await supabaseAdmin
          .from('profiles')
          .insert({ 
            phone,
            profile_type: profileType,
            conversation_state: initialState,
            ai_paused: false,
            needs_human: false,
            updated_at: new Date().toISOString()
          })
          .select()
          .single();
        
        if (createError || !newProfile) {
          console.error('💥 [WEBHOOK:CREATE_ERROR]', createError);
          return NextResponse.json({ success: false, error: 'Identity creation failed' }, { status: 200 });
        }
        customerProfile = newProfile;
      }

      // 3. PERSIST MESSAGE (Context Persistence)
      let content = text;
      if (isAudio) content = "[AUDIO]";
      else if (isImage) content = "[IMAGE]";

      const role = isFromMe ? 'assistant' : 'user';

      const { error: msgError } = await supabaseAdmin.from('messages').insert({
        lead_phone: phone,
        role: role,
        content: content,
        message_id: key.id || Math.random().toString(36).substring(7),
        instance_name: instanceName, // CRITICAL: For worker owner resolution
        created_at: new Date().toISOString()
      });

      if (msgError) {
        console.error(`❌ [WEBHOOK:MSG_ERROR] Critical failure persisting message:`, msgError.message);
        return NextResponse.json({ success: false, error: 'Message persistence failed' }, { status: 200 });
      }

      // 4. ANTI-LOOP SHIELD
      if (isFromMe) {
          console.log(`🛡️ [ANTI-LOOP] Message from me (${phone}). Saved but skipping worker.`);
          return NextResponse.json({ success: true, message: 'Message saved, loop prevented' });
      }

      // 5. QUEUE TRIGGER (The Handover)
      // Force AI resume on any new inbound message (Mimics Legacy reliability)
      const { error: triggerError } = await supabaseAdmin
        .from('profiles')
        .update({ 
          worker_status: 'eliza_processing',
          ai_paused: false,
          needs_human: false,
          updated_at: new Date().toISOString()
        })
        .eq('id', customerProfile.id);

      if (triggerError) {
        console.error(`❌ [WEBHOOK:TRIGGER_ERROR] Failed to signal worker:`, triggerError.message);
      }

      console.log(`✅ [WEBHOOK:SUCCESS] Message saved. Worker signaled for Customer Profile: ${customerProfile.id} (Owner: ${ownerId})`);
      return NextResponse.json({ success: true });
    }

    // Default response for unhandled events
    return NextResponse.json({ success: true, message: 'Event ignored' });

  } catch (error: any) {
    console.error('❌ [WEBHOOK ERROR]:', error.message);
    return NextResponse.json({ success: false, error: error.message }, { status: 200 });
  }
}
