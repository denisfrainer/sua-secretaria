import { NextResponse } from 'next/server';
import { z } from 'zod';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { normalizePhone } from '@/lib/utils/phone';
import { checkIpRateLimit, getClientIp } from '@/lib/security/rate-limit';
import axios from 'axios';

export const dynamic = 'force-dynamic';

/**
 * STRICT ZERO-TRUST PAYLOAD SCHEMA
 * Any extra fields sent by the client (e.g., winning_index, premio_id, code, probability)
 * will immediately fail validation due to .strict().
 */
const SpinRequestSchema = z
  .object({
    tenant_id: z.string().uuid({ message: 'Identificador do estabelecimento inválido (UUID requerido).' }),
    user_phone: z
      .string()
      .min(10, { message: 'Número de WhatsApp deve conter DDD e telefone.' })
      .max(20, { message: 'Número de telefone excessivamente longo.' }),
    consumer_name: z.string().max(100).optional().nullable(),
  })
  .strict();

/**
 * Validates Brazilian Area Code (DDD)
 */
function isValidBrazilianDdd(ddd: string): boolean {
  const validDdds = new Set([
    '11', '12', '13', '14', '15', '16', '17', '18', '19', // SP
    '21', '22', '24',                                     // RJ
    '27', '28',                                           // ES
    '31', '32', '33', '34', '35', '37', '38',             // MG
    '41', '42', '43', '44', '45', '46',                   // PR
    '47', '48', '49',                                     // SC
    '51', '53', '54', '55',                               // RS
    '61',                                                 // DF
    '62', '64',                                           // GO
    '63',                                                 // TO
    '65', '66',                                           // MT
    '67',                                                 // MS
    '68',                                                 // AC
    '69',                                                 // RO
    '71', '73', '74', '75', '77',                         // BA
    '79',                                                 // SE
    '81', '87',                                           // PE
    '82',                                                 // AL
    '83',                                                 // PB
    '84',                                                 // RN
    '85', '88',                                           // CE
    '86', '89',                                           // PI
    '91', '93', '94',                                     // PA
    '92', '97',                                           // AM
    '95',                                                 // RR
    '96',                                                 // AP
    '98', '99',                                           // MA
  ]);
  return validDdds.has(ddd);
}

/**
 * POST /api/roulette/spin
 * Secure Server-Authoritative Roulette Spin Endpoint
 */
export async function POST(request: Request) {
  const startTime = Date.now();
  const clientIp = getClientIp(request);
  console.log(`📡 [ROULETTE_API] Inbound spin request from IP: ${clientIp}`);

  try {
    // ----------------------------------------------------
    // 1. IP-BASED RATE LIMITING & BOT DEFENSE
    // ----------------------------------------------------
    const ipCheck = checkIpRateLimit(clientIp, {
      maxRequests: 5,             // Max 5 spin attempts
      windowMs: 10 * 60 * 1000,   // Per 10 minutes per IP
    });

    if (!ipCheck.allowed) {
      const retryAfterSeconds = Math.ceil((ipCheck.resetTime - Date.now()) / 1000);
      console.warn(`🚨 [RATE_LIMIT_BLOCKED] IP ${clientIp} exceeded rate limit. Retry in ${retryAfterSeconds}s`);

      return NextResponse.json(
        {
          success: false,
          error_code: 'IP_RATE_LIMITED',
          message: 'Muitas tentativas detectadas a partir deste endereço IP. Por favor, aguarde alguns minutos para tentar novamente.',
          retry_after_seconds: retryAfterSeconds,
        },
        {
          status: 429,
          headers: {
            'Retry-After': String(retryAfterSeconds),
          },
        }
      );
    }

    // ----------------------------------------------------
    // 2. ZERO-TRUST PAYLOAD VALIDATION
    // ----------------------------------------------------
    let rawBody: unknown;
    try {
      rawBody = await request.json();
    } catch {
      return NextResponse.json(
        { success: false, message: 'JSON mal formatado ou corpo vazio.' },
        { status: 400 }
      );
    }

    const validation = SpinRequestSchema.safeParse(rawBody);
    if (!validation.success) {
      console.warn('⚠️ [ROULETTE_API] Validation error:', validation.error.flatten());
      return NextResponse.json(
        {
          success: false,
          error_code: 'INVALID_PAYLOAD',
          message: 'Dados inválidos.',
          errors: validation.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const { tenant_id, user_phone, consumer_name } = validation.data;

    // ----------------------------------------------------
    // 3. BRAZILIAN PHONE VALIDATION & NORMALIZATION
    // ----------------------------------------------------
    const normalizedPhone = normalizePhone(user_phone);
    console.log(`📱 [ROULETTE_API] Phone normalization: "${user_phone}" -> "${normalizedPhone}"`);

    // Normalized phone must start with 55 and have DDD + 8 or 9 digits (total 12 or 13 digits)
    if (!normalizedPhone || normalizedPhone.length < 12 || normalizedPhone.length > 13) {
      return NextResponse.json(
        {
          success: false,
          error_code: 'INVALID_PHONE',
          message: 'Por favor, informe um número de WhatsApp brasileiro válido com DDD (ex: 41 99999-9999).',
        },
        { status: 400 }
      );
    }

    const ddd = normalizedPhone.slice(2, 4);
    if (!isValidBrazilianDdd(ddd)) {
      return NextResponse.json(
        {
          success: false,
          error_code: 'INVALID_DDD',
          message: `DDD "${ddd}" não é um código de área brasileiro válido.`,
        },
        { status: 400 }
      );
    }

    if (!supabaseAdmin) {
      console.error('❌ [ROULETTE_API] Critical Error: supabaseAdmin client not available.');
      return NextResponse.json(
        { success: false, message: 'Erro interno no servidor de banco de dados.' },
        { status: 500 }
      );
    }

    // ----------------------------------------------------
    // 4. EXECUTE ATOMIC SERVER-AUTHORITATIVE POSTGRESQL RPC
    // ----------------------------------------------------
    console.time('[ROULETTE_API] DB_RPC_Execution');
    const { data: rpcResult, error: rpcError } = await supabaseAdmin.rpc('spin_roulette', {
      p_tenant_id: tenant_id,
      p_consumer_phone: normalizedPhone,
      p_consumer_name: consumer_name?.trim() || null,
    });
    console.timeEnd('[ROULETTE_API] DB_RPC_Execution');

    if (rpcError) {
      console.error('❌ [ROULETTE_API] DB RPC Execution error:', rpcError);
      return NextResponse.json(
        { success: false, message: 'Erro ao processar o sorteio. Tente novamente.' },
        { status: 500 }
      );
    }

    console.log('🎰 [ROULETTE_API] RPC Result payload:', rpcResult);

    // ----------------------------------------------------
    // 5. MAP ERROR CODES TO CLEAN HTTP RESPONSES
    // ----------------------------------------------------
    if (rpcResult && rpcResult.error_code === 'COOLDOWN_ACTIVE') {
      console.warn(`⏳ [ROULETTE_API] 24h Cooldown active for phone ${normalizedPhone}`);
      return NextResponse.json(rpcResult, { status: 429 });
    }

    if (rpcResult && rpcResult.error_code === 'TENANT_NOT_FOUND') {
      console.warn(`⚠️ [ROULETTE_API] Tenant not found or inactive: ${tenant_id}`);
      return NextResponse.json(rpcResult, { status: 404 });
    }

    if (!rpcResult || rpcResult.success === false) {
      return NextResponse.json(rpcResult || { success: false, message: 'Não foi possível concluir o giro.' }, { status: 400 });
    }

    // Standardize coupon / cupom key for client convenience
    const responsePayload = {
      ...rpcResult,
      coupon: rpcResult.cupom || null,
      cupom: rpcResult.cupom || null,
    };

    // ----------------------------------------------------
    // 6. ASYNC OUTBOUND WHATSAPP DISPATCH (NON-BLOCKING)
    // ----------------------------------------------------
    const winningCoupon = rpcResult.cupom;
    if (rpcResult.is_winner && winningCoupon?.code) {
      dispatchEvolutionWhatsAppNotification(
        normalizedPhone,
        rpcResult.premio,
        winningCoupon,
        tenant_id
      ).catch(err => {
        console.error('⚠️ [EVOLUTION_API] Async outbound notification error:', err.message);
      });
    }

    const duration = Date.now() - startTime;
    console.log(`✅ [ROULETTE_API] Spin successfully processed in ${duration}ms for ${normalizedPhone}.`);

    return NextResponse.json(responsePayload, { status: 200 });

  } catch (error: any) {
    console.error('❌ [ROULETTE_API] Unexpected server crash:', error);
    return NextResponse.json(
      { success: false, message: 'Erro interno ao processar requisição.' },
      { status: 500 }
    );
  }
}

/**
 * Dispatches automated WhatsApp coupon message via Evolution API
 */
async function dispatchEvolutionWhatsAppNotification(
  phone: string,
  premio: any,
  coupon: any,
  tenantId: string
) {
  const evoUrl = (process.env.EVOLUTION_API_URL || '').replace(/\/$/, '');
  const apiKey = process.env.EVOLUTION_API_KEY;
  const instanceName = process.env.EVOLUTION_INSTANCE_NAME || 'default';

  if (!evoUrl || !apiKey) {
    console.log('ℹ️ [EVOLUTION_API] EVOLUTION_API_URL or EVOLUTION_API_KEY not configured. Skipping WhatsApp notification.');
    return;
  }

  // Fetch Store Name from tenants
  let storeName = 'Nosso Estabelecimento';
  if (supabaseAdmin) {
    const { data: tenant } = await supabaseAdmin
      .from('tenants')
      .select('name')
      .eq('id', tenantId)
      .maybeSingle();
    if (tenant?.name) {
      storeName = tenant.name;
    }
  }

  const messageText =
    `🎉 *PARABÉNS! VOCÊ GANHOU NA ROLETA!* 🎁\n\n` +
    `Olá! Você acabou de girar a roleta da sorte no estabelecimento *${storeName}*!\n\n` +
    `🏆 *Prêmio:* ${premio?.title || 'Cupom Exclusivo'}\n` +
    `🎟️ *Seu Código de Cupom:* *${coupon.code}*\n\n` +
    `Apresente este código no local ou envie esta mensagem para resgatar o seu presente! Válido por 7 dias. 💖`;

  console.log(`💬 [EVOLUTION_API] Sending WhatsApp notification to ${phone} via instance "${instanceName}"...`);

  await axios.post(
    `${evoUrl}/message/sendText/${instanceName}`,
    {
      number: phone,
      text: messageText,
      options: {
        delay: 1200,
        presence: 'composing',
      },
    },
    {
      headers: {
        'Content-Type': 'application/json',
        apikey: apiKey,
      },
      timeout: 10000,
    }
  );

  console.log(`✅ [EVOLUTION_API] Outbound WhatsApp sent successfully to ${phone}.`);
}
