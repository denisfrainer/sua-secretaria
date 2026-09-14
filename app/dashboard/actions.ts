'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import type {
  Tenant,
  TenantBrandingInput,
  Premio,
  PremioInput,
  Cupom,
  CouponStatus
} from '@/lib/supabase/types';

export interface CouponWithPremio extends Cupom {
  premio?: {
    id: string;
    title: string;
    color_hex: string;
    description?: string | null;
  } | null;
}

// ----------------------------------------------------
// 🏢 TENANT IDENTITY & BRANDING ACTIONS
// ----------------------------------------------------

export async function getTenant(userId: string): Promise<Tenant | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('tenants')
    .select('*')
    .eq('id', userId)
    .maybeSingle();

  if (error) {
    console.error('❌ [DB_READ_ERROR] getTenant:', error.message);
    return null;
  }

  if (data) return data;

  // Auto-provision tenant record if not yet created for this user
  console.log(`ℹ️ [TENANT_PROVISION] Initializing default tenant record for user ${userId}`);
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle();

  const fallbackSlug = (profile?.slug || `loja-${userId.slice(0, 6)}`)
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '-');

  const { data: newTenant, error: insertError } = await supabase
    .from('tenants')
    .insert({
      id: userId,
      name: profile?.display_name || profile?.full_name || 'Meu Estabelecimento',
      slug: fallbackSlug,
      whatsapp: '5500000000000',
      primary_color: '#f43f5e',
      secondary_color: '#fda4af',
      background_color: '#fffbfb',
      cooldown_hours: 24,
      plan_tier: 'STARTER',
      is_active: true
    })
    .select()
    .single();

  if (insertError) {
    console.error('❌ [TENANT_PROVISION_ERROR] Failed to auto-provision tenant:', insertError.message);
    return null;
  }

  return newTenant;
}

export async function upsertTenantBranding(payload: TenantBrandingInput): Promise<{ success: boolean; tenant?: Tenant; error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('Usuário não autenticado.');
  }

  // Sanitize and validate slug format
  const sanitizedSlug = payload.slug
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '-');

  if (!sanitizedSlug || sanitizedSlug.length < 3) {
    throw new Error('O slug deve conter no mínimo 3 caracteres alfanuméricos.');
  }

  // Check slug collision with other tenants
  const { data: existingSlug, error: slugCheckError } = await supabase
    .from('tenants')
    .select('id')
    .eq('slug', sanitizedSlug)
    .neq('id', user.id)
    .maybeSingle();

  if (slugCheckError) {
    console.error('❌ [SLUG_CHECK_ERROR]:', slugCheckError.message);
  }

  if (existingSlug) {
    throw new Error(`O link "/${sanitizedSlug}" já está em uso por outro estabelecimento. Escolha outro.`);
  }

  console.log('[DB_MUTATION] upsertTenantBranding:', { userId: user.id, ...payload });

  const record = {
    name: payload.name.trim(),
    slug: sanitizedSlug,
    whatsapp: payload.whatsapp.replace(/\D/g, ''),
    logo_url: payload.logo_url?.trim() || null,
    primary_color: payload.primary_color || '#f43f5e',
    secondary_color: payload.secondary_color || '#fda4af',
    background_color: payload.background_color || '#fffbfb',
    cooldown_hours: Number(payload.cooldown_hours) >= 0 ? Number(payload.cooldown_hours) : 24,
    updated_at: new Date().toISOString()
  };

  const { data: updatedTenant, error: updateError } = await supabase
    .from('tenants')
    .update(record)
    .eq('id', user.id)
    .select()
    .single();

  if (updateError) {
    console.error('❌ [DB_MUTATION_ERROR] upsertTenantBranding:', updateError.message);
    throw new Error('Falha ao salvar configurações do estabelecimento.');
  }

  revalidatePath('/dashboard');
  revalidatePath(`/${sanitizedSlug}`);

  return { success: true, tenant: updatedTenant };
}

// ----------------------------------------------------
// 🎁 PREMIOS (PRIZES & PROBABILITY) ACTIONS
// ----------------------------------------------------

export async function getPremios(tenantId: string): Promise<Premio[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('premios')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('❌ [DB_READ_ERROR] getPremios:', error.message);
    return [];
  }

  return data || [];
}

export async function createPremio(payload: PremioInput): Promise<{ success: boolean; premio?: Premio; error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('Usuário não autenticado.');
  }

  if (!payload.title.trim()) {
    throw new Error('O título do prêmio é obrigatório.');
  }

  const weight = Math.max(0, Number(payload.probability_weight) || 10);
  const stock = Number(payload.initial_stock) ?? 100;

  console.log('[DB_MUTATION] createPremio:', { userId: user.id, payload });

  const { data: newPremio, error } = await supabase
    .from('premios')
    .insert({
      tenant_id: user.id,
      title: payload.title.trim(),
      description: payload.description?.trim() || null,
      probability_weight: weight,
      initial_stock: stock,
      current_stock: stock,
      color_hex: payload.color_hex || '#f43f5e',
      text_color_hex: payload.text_color_hex || '#ffffff',
      is_active: payload.is_active ?? true,
      is_losing_slice: payload.is_losing_slice ?? false
    })
    .select()
    .single();

  if (error) {
    console.error('❌ [DB_MUTATION_ERROR] createPremio:', error.message);
    throw new Error('Falha ao cadastrar novo prêmio.');
  }

  revalidatePath('/dashboard');
  return { success: true, premio: newPremio };
}

export async function updatePremio(
  premioId: string,
  payload: Partial<PremioInput>
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('Usuário não autenticado.');
  }

  console.log('[DB_MUTATION] updatePremio:', { premioId, userId: user.id, payload });

  const updateData: Record<string, any> = {
    updated_at: new Date().toISOString()
  };

  if (payload.title !== undefined) updateData.title = payload.title.trim();
  if (payload.description !== undefined) updateData.description = payload.description?.trim() || null;
  if (payload.probability_weight !== undefined) updateData.probability_weight = Math.max(0, Number(payload.probability_weight));
  if (payload.color_hex !== undefined) updateData.color_hex = payload.color_hex;
  if (payload.text_color_hex !== undefined) updateData.text_color_hex = payload.text_color_hex;
  if (payload.is_active !== undefined) updateData.is_active = payload.is_active;
  if (payload.is_losing_slice !== undefined) updateData.is_losing_slice = payload.is_losing_slice;

  if (payload.initial_stock !== undefined) {
    updateData.initial_stock = Number(payload.initial_stock);
    // If setting to unlimited (-1) or higher stock, update current_stock
    if (payload.initial_stock === -1) {
      updateData.current_stock = -1;
    }
  }

  const { error } = await supabase
    .from('premios')
    .update(updateData)
    .eq('id', premioId)
    .eq('tenant_id', user.id);

  if (error) {
    console.error('❌ [DB_MUTATION_ERROR] updatePremio:', error.message);
    throw new Error('Falha ao atualizar o prêmio.');
  }

  revalidatePath('/dashboard');
  return { success: true };
}

export async function deletePremio(premioId: string): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('Usuário não autenticado.');
  }

  console.log('[DB_MUTATION] deletePremio:', { premioId, userId: user.id });

  const { error } = await supabase
    .from('premios')
    .delete()
    .eq('id', premioId)
    .eq('tenant_id', user.id);

  if (error) {
    console.error('❌ [DB_MUTATION_ERROR] deletePremio:', error.message);
    throw new Error('Falha ao excluir o prêmio.');
  }

  revalidatePath('/dashboard');
  return { success: true };
}

export async function togglePremioStatus(premioId: string, isActive: boolean): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('Usuário não autenticado.');
  }

  const { error } = await supabase
    .from('premios')
    .update({ is_active: isActive, updated_at: new Date().toISOString() })
    .eq('id', premioId)
    .eq('tenant_id', user.id);

  if (error) {
    console.error('❌ [DB_MUTATION_ERROR] togglePremioStatus:', error.message);
    throw new Error('Falha ao alternar status do prêmio.');
  }

  revalidatePath('/dashboard');
  return { success: true };
}

// ----------------------------------------------------
// 🎟️ CUPONS (COUPON VALIDATION & REDEMPTION) ACTIONS
// ----------------------------------------------------

export async function searchCoupons(
  query: string = '',
  tenantId?: string
): Promise<CouponWithPremio[]> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const targetTenantId = tenantId || user?.id;
  if (!targetTenantId) return [];

  let req = supabase
    .from('cupons')
    .select('*, premio:premios(id, title, color_hex, description)')
    .eq('tenant_id', targetTenantId)
    .order('created_at', { ascending: false })
    .limit(50);

  const cleanQuery = query.trim();
  if (cleanQuery) {
    // Search by voucher code, customer phone, or customer name
    req = req.or(
      `code.ilike.%${cleanQuery}%,consumer_phone.ilike.%${cleanQuery}%,consumer_name.ilike.%${cleanQuery}%`
    );
  }

  const { data, error } = await req;

  if (error) {
    console.error('❌ [DB_READ_ERROR] searchCoupons:', error.message);
    return [];
  }

  const now = new Date();
  // Lazily flag expired coupons in memory
  return (data || []).map((coupon: any) => {
    if (coupon.status === 'active' && new Date(coupon.expires_at) < now) {
      return { ...coupon, status: 'expired' as CouponStatus };
    }
    return coupon;
  });
}

export async function redeemCoupon(
  couponId: string,
  tenantId?: string
): Promise<{ success: boolean; cupom?: CouponWithPremio; error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('Usuário não autenticado.');
  }

  const targetTenantId = tenantId || user.id;

  // 1. Fetch current coupon details
  const { data: existing, error: fetchError } = await supabase
    .from('cupons')
    .select('*, premio:premios(id, title, color_hex, description)')
    .eq('id', couponId)
    .eq('tenant_id', targetTenantId)
    .maybeSingle();

  if (fetchError || !existing) {
    throw new Error('Cupom não encontrado no sistema.');
  }

  const now = new Date();
  const expiresAt = new Date(existing.expires_at);

  // 2. Validate Business Rules
  if (existing.status === 'redeemed') {
    const redeemedDate = existing.redeemed_at
      ? new Date(existing.redeemed_at).toLocaleString('pt-BR')
      : 'data anterior';
    throw new Error(`Este cupom já foi resgatado em ${redeemedDate}.`);
  }

  if (existing.status === 'cancelled') {
    throw new Error('Este cupom foi cancelado e não pode ser resgatado.');
  }

  if (existing.status === 'expired' || expiresAt < now) {
    // Persist expired status if not already set
    if (existing.status !== 'expired') {
      await supabase
        .from('cupons')
        .update({ status: 'expired' })
        .eq('id', couponId)
        .eq('tenant_id', targetTenantId);
    }
    throw new Error(
      `Este cupom expirou em ${expiresAt.toLocaleDateString('pt-BR')} e não pode mais ser resgatado.`
    );
  }

  // 3. Mark as Redeemed
  const { data: updatedCoupon, error: updateError } = await supabase
    .from('cupons')
    .update({
      status: 'redeemed',
      redeemed_at: now.toISOString(),
    })
    .eq('id', couponId)
    .eq('tenant_id', targetTenantId)
    .select('*, premio:premios(id, title, color_hex, description)')
    .single();

  if (updateError) {
    console.error('❌ [DB_MUTATION_ERROR] redeemCoupon:', updateError.message);
    throw new Error('Falha ao validar o resgate do cupom no banco de dados.');
  }

  revalidatePath('/dashboard');
  return { success: true, cupom: updatedCoupon };
}
