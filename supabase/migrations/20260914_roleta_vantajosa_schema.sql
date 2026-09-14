-- ============================================================================
-- MIGRATION: ROLETA VANTAJOSA (Supabase PostgreSQL Schema & RPC Engine)
-- File: supabase/migrations/20260914_roleta_vantajosa_schema.sql
-- Description:
--   1. Creates/Updates tables: tenants, premios, cupons, spins_history
--   2. Enables Row-Level Security (RLS) and strict tenant isolation policies
--   3. Creates performance indexes for slug and phone cooldown lookups
--   4. Installs atomic, race-condition protected PostgreSQL function: spin_roulette
--   5. Backfills existing profiles into tenants (if any exist)
-- ============================================================================

-- Enable pgcrypto if not already enabled (for UUID and cryptographic hashing)
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- 1. TENANTS TABLE (Merchant visual identity, custom slug, cooldown & plans)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.tenants (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  whatsapp TEXT NOT NULL,
  logo_url TEXT,
  primary_color TEXT NOT NULL DEFAULT '#f43f5e',
  secondary_color TEXT NOT NULL DEFAULT '#fda4af',
  background_color TEXT NOT NULL DEFAULT '#fffbfb',
  cooldown_hours INT NOT NULL DEFAULT 24 CHECK (cooldown_hours >= 0),
  plan_tier TEXT NOT NULL DEFAULT 'STARTER' CHECK (plan_tier IN ('TRIAL', 'STARTER', 'PRO', 'ELITE')),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- 2. PREMIOS TABLE (Tenant prizes, probability weights, stock, wheel colors)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.premios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  probability_weight INT NOT NULL DEFAULT 10 CHECK (probability_weight >= 0),
  initial_stock INT NOT NULL DEFAULT 100,       -- -1 represents infinite/unlimited stock
  current_stock INT NOT NULL DEFAULT 100,       -- Decremented atomically upon winning
  color_hex TEXT NOT NULL DEFAULT '#f43f5e',
  text_color_hex TEXT NOT NULL DEFAULT '#ffffff',
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_losing_slice BOOLEAN NOT NULL DEFAULT false, -- e.g. "Tente Novamente"
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- 3. CUPONS TABLE (Issued vouchers won by end-users)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.cupons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  premio_id UUID REFERENCES public.premios(id) ON DELETE SET NULL,
  code TEXT NOT NULL,
  consumer_phone TEXT NOT NULL,
  consumer_name TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'redeemed', 'expired', 'cancelled')),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '7 days'),
  redeemed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Ensure coupon code is unique per tenant
CREATE UNIQUE INDEX IF NOT EXISTS idx_cupons_tenant_code ON public.cupons(tenant_id, code);

-- ============================================================================
-- 4. SPINS_HISTORY TABLE (Audit trail for rate limits & analytics)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.spins_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  consumer_phone TEXT NOT NULL,
  premio_id UUID REFERENCES public.premios(id) ON DELETE SET NULL,
  cupom_id UUID REFERENCES public.cupons(id) ON DELETE SET NULL,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- 5. PERFORMANCE INDEXES
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_tenants_slug ON public.tenants(slug);
CREATE INDEX IF NOT EXISTS idx_premios_tenant_active ON public.premios(tenant_id, is_active);
CREATE INDEX IF NOT EXISTS idx_cupons_tenant_status ON public.cupons(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_cupons_tenant_phone ON public.cupons(tenant_id, consumer_phone);
CREATE INDEX IF NOT EXISTS idx_spins_history_cooldown ON public.spins_history(tenant_id, consumer_phone, created_at DESC);

-- ============================================================================
-- 6. ROW-LEVEL SECURITY (RLS) POLICIES
-- ============================================================================
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.premios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.spins_history ENABLE ROW LEVEL SECURITY;

-- Tenants Policies
DROP POLICY IF EXISTS "Public read active tenant" ON public.tenants;
CREATE POLICY "Public read active tenant" ON public.tenants
  FOR SELECT
  USING (is_active = true);

DROP POLICY IF EXISTS "Tenant owner manage tenant" ON public.tenants;
CREATE POLICY "Tenant owner manage tenant" ON public.tenants
  FOR ALL
  USING (auth.uid() = id);

-- Premios Policies
DROP POLICY IF EXISTS "Public read active tenant prizes" ON public.premios;
CREATE POLICY "Public read active tenant prizes" ON public.premios
  FOR SELECT
  USING (is_active = true);

DROP POLICY IF EXISTS "Tenant owner manage prizes" ON public.premios;
CREATE POLICY "Tenant owner manage prizes" ON public.premios
  FOR ALL
  USING (auth.uid() = tenant_id);

-- Cupons Policies
DROP POLICY IF EXISTS "Tenant owner manage cupons" ON public.cupons;
CREATE POLICY "Tenant owner manage cupons" ON public.cupons
  FOR ALL
  USING (auth.uid() = tenant_id);

-- Spins History Policies
DROP POLICY IF EXISTS "Tenant owner view spins history" ON public.spins_history;
CREATE POLICY "Tenant owner view spins history" ON public.spins_history
  FOR SELECT
  USING (auth.uid() = tenant_id);

-- ============================================================================
-- 7. ATOMIC SERVER-AUTHORITATIVE ROULETTE RPC ENGINE
-- ============================================================================
CREATE OR REPLACE FUNCTION public.spin_roulette(
  p_tenant_id UUID,
  p_consumer_phone TEXT,
  p_consumer_name TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_cooldown_hours INT;
  v_tenant_active BOOLEAN;
  v_last_spin TIMESTAMPTZ;
  v_cooldown_until TIMESTAMPTZ;
  v_total_weight INT := 0;
  v_rand INT;
  v_current_weight INT := 0;
  v_winner RECORD;
  v_winner_id UUID := NULL;
  v_winner_index INT := 0;
  v_rows_updated INT;
  v_premios_json JSONB;
  v_premio_count INT := 0;
  v_coupon_code TEXT;
  v_coupon_id UUID := NULL;
  v_expires_at TIMESTAMPTZ;
BEGIN
  -- 1. Validate Tenant Existence & Status
  SELECT cooldown_hours, is_active INTO v_cooldown_hours, v_tenant_active
  FROM public.tenants
  WHERE id = p_tenant_id;

  IF NOT FOUND OR v_tenant_active = false THEN
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'TENANT_NOT_FOUND',
      'message', 'Estabelecimento não encontrado ou inativo.'
    );
  END IF;

  -- 2. Strict Cooldown Verification per Consumer Phone & Tenant
  SELECT created_at INTO v_last_spin
  FROM public.spins_history
  WHERE tenant_id = p_tenant_id AND consumer_phone = p_consumer_phone
  ORDER BY created_at DESC
  LIMIT 1;

  IF v_last_spin IS NOT NULL AND v_last_spin > (NOW() - (v_cooldown_hours || ' hours')::INTERVAL) THEN
    v_cooldown_until := v_last_spin + (v_cooldown_hours || ' hours')::INTERVAL;
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'COOLDOWN_ACTIVE',
      'message', 'Você já girou a roleta hoje. Tente novamente mais tarde.',
      'cooldown_until', v_cooldown_until
    );
  END IF;

  -- 3. Lock candidate prizes (FOR UPDATE) to prevent race conditions on limited stock
  SELECT 
    COALESCE(SUM(GREATEST(probability_weight, 1)), 0),
    jsonb_agg(jsonb_build_object(
      'id', id,
      'title', title,
      'description', description,
      'probability_weight', GREATEST(probability_weight, 1),
      'initial_stock', initial_stock,
      'current_stock', current_stock,
      'color_hex', color_hex,
      'text_color_hex', text_color_hex,
      'is_losing_slice', is_losing_slice
    ) ORDER BY created_at ASC)
  INTO v_total_weight, v_premios_json
  FROM (
    SELECT id, title, description, probability_weight, initial_stock, current_stock, color_hex, text_color_hex, is_losing_slice, created_at
    FROM public.premios
    WHERE tenant_id = p_tenant_id 
      AND is_active = true 
      AND (current_stock > 0 OR current_stock = -1)
    ORDER BY created_at ASC
    FOR UPDATE
  ) candidate_premios;

  -- 4. Fallback if no active prizes are configured or all stock is depleted
  IF v_total_weight = 0 OR v_premios_json IS NULL OR jsonb_array_length(v_premios_json) = 0 THEN
    INSERT INTO public.spins_history (tenant_id, consumer_phone, premio_id, cupom_id)
    VALUES (p_tenant_id, p_consumer_phone, NULL, NULL);

    RETURN jsonb_build_object(
      'success', true,
      'is_winner', false,
      'winning_index', 0,
      'premio', jsonb_build_object(
        'title', 'Sem Prêmios Disponíveis',
        'color_hex', '#94a3b8',
        'text_color_hex', '#ffffff'
      ),
      'cupom', NULL,
      'message', 'No momento não há prêmios disponíveis. Tente novamente mais tarde!'
    );
  END IF;

  -- 5. Calculate Server-Authoritative Weighted Random Selection
  v_rand := floor(random() * v_total_weight);
  v_premio_count := jsonb_array_length(v_premios_json);

  FOR i IN 0..(v_premio_count - 1) LOOP
    v_current_weight := v_current_weight + (v_premios_json->i->>'probability_weight')::INT;
    
    IF v_rand < v_current_weight THEN
      v_winner_id := (v_premios_json->i->>'id')::UUID;
      v_winner_index := i;
      EXIT;
    END IF;
  END LOOP;

  -- Safety boundary fallback
  IF v_winner_id IS NULL THEN
    v_winner_id := (v_premios_json->0->>'id')::UUID;
    v_winner_index := 0;
  END IF;

  -- 6. Fetch Full Winner Details
  SELECT id, title, description, current_stock, color_hex, text_color_hex, is_losing_slice
  INTO v_winner
  FROM public.premios
  WHERE id = v_winner_id;

  -- 7. Atomic Stock Decrement (Only if stock is finite > 0)
  IF v_winner.current_stock > 0 THEN
    UPDATE public.premios
    SET current_stock = current_stock - 1,
        updated_at = NOW()
    WHERE id = v_winner.id AND current_stock > 0;
    
    GET DIAGNOSTICS v_rows_updated = ROW_COUNT;
    
    -- Race condition fallback if stock exhausted in a parallel transaction
    IF v_rows_updated = 0 THEN
      INSERT INTO public.spins_history (tenant_id, consumer_phone, premio_id, cupom_id)
      VALUES (p_tenant_id, p_consumer_phone, NULL, NULL);

      RETURN jsonb_build_object(
        'success', true,
        'is_winner', false,
        'winning_index', 0,
        'premio', jsonb_build_object(
          'title', 'Tente Novamente',
          'color_hex', '#94a3b8',
          'text_color_hex', '#ffffff'
        ),
        'cupom', NULL,
        'message', 'Que pena! Este prêmio acabou de esgotar. Tente novamente!'
      );
    END IF;
  END IF;

  -- 8. Handle "Losing Slice" (e.g. "Tente Novamente")
  IF v_winner.is_losing_slice = true THEN
    INSERT INTO public.spins_history (tenant_id, consumer_phone, premio_id, cupom_id)
    VALUES (p_tenant_id, p_consumer_phone, v_winner.id, NULL);

    RETURN jsonb_build_object(
      'success', true,
      'is_winner', false,
      'winning_index', v_winner_index,
      'premio', jsonb_build_object(
        'id', v_winner.id,
        'title', v_winner.title,
        'description', v_winner.description,
        'color_hex', v_winner.color_hex,
        'text_color_hex', v_winner.text_color_hex
      ),
      'cupom', NULL,
      'message', 'Não foi desta vez! Tente novamente amanhã.'
    );
  END IF;

  -- 9. Generate Unique Collision-Resistant Coupon Code (Format: ROL-XXXXXX)
  LOOP
    v_coupon_code := 'ROL-' || UPPER(SUBSTRING(MD5(gen_random_uuid()::text) FROM 1 FOR 6));
    PERFORM 1 FROM public.cupons WHERE tenant_id = p_tenant_id AND code = v_coupon_code;
    IF NOT FOUND THEN
      EXIT;
    END IF;
  END LOOP;

  v_expires_at := NOW() + INTERVAL '7 days';

  -- 10. Insert Issued Winning Coupon
  INSERT INTO public.cupons (
    tenant_id,
    premio_id,
    code,
    consumer_phone,
    consumer_name,
    status,
    expires_at,
    created_at
  )
  VALUES (
    p_tenant_id,
    v_winner.id,
    v_coupon_code,
    p_consumer_phone,
    p_consumer_name,
    'active',
    v_expires_at,
    NOW()
  )
  RETURNING id INTO v_coupon_id;

  -- 11. Record Spin History
  INSERT INTO public.spins_history (tenant_id, consumer_phone, premio_id, cupom_id)
  VALUES (p_tenant_id, p_consumer_phone, v_winner.id, v_coupon_id);

  -- 12. Return Final Winner Payload
  RETURN jsonb_build_object(
    'success', true,
    'is_winner', true,
    'winning_index', v_winner_index,
    'premio', jsonb_build_object(
      'id', v_winner.id,
      'title', v_winner.title,
      'description', v_winner.description,
      'color_hex', v_winner.color_hex,
      'text_color_hex', v_winner.text_color_hex
    ),
    'cupom', jsonb_build_object(
      'id', v_coupon_id,
      'code', v_coupon_code,
      'expires_at', v_expires_at,
      'status', 'active'
    ),
    'message', 'Parabéns! Você ganhou um cupom!'
  );
END;
$$;

-- ============================================================================
-- 8. BACKFILL MIGRATION: Copy existing profiles / vitrine_profiles to tenants
-- ============================================================================
INSERT INTO public.tenants (id, name, slug, whatsapp, logo_url, created_at, updated_at)
SELECT 
  p.id,
  COALESCE(vp.name, p.display_name, p.full_name, 'Meu Negócio'),
  COALESCE(vp.slug, p.slug, SUBSTRING(p.id::text, 1, 8)),
  COALESCE(vp.whatsapp, '5500000000000'),
  COALESCE(vp.cover_photo_url, p.avatar_url),
  COALESCE(vp.created_at, NOW()),
  NOW()
FROM public.profiles p
LEFT JOIN public.vitrine_profiles vp ON vp.user_id = p.id
ON CONFLICT (id) DO UPDATE 
SET 
  name = EXCLUDED.name,
  slug = EXCLUDED.slug,
  whatsapp = EXCLUDED.whatsapp,
  logo_url = COALESCE(public.tenants.logo_url, EXCLUDED.logo_url);
