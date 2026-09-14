-- ==========================================================
-- GAMIFIED ROULETTE MIGRATION (Supabase PostgreSQL)
-- Tables: coupons, spins_history
-- RPC: spin_roulette(p_tenant_id UUID, p_user_phone TEXT)
-- ==========================================================

-- 1. Create Coupons Table
CREATE TABLE IF NOT EXISTS public.coupons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  code TEXT NOT NULL,
  weight INT NOT NULL DEFAULT 10,
  stock INT NOT NULL DEFAULT 100,
  is_active BOOLEAN NOT NULL DEFAULT true,
  color_hex TEXT DEFAULT '#f43f5e',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Create Spins History Table
CREATE TABLE IF NOT EXISTS public.spins_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  user_phone TEXT NOT NULL,
  coupon_id UUID REFERENCES public.coupons(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Create Performance Indexes
CREATE INDEX IF NOT EXISTS idx_coupons_tenant_active ON public.coupons(tenant_id, is_active);
CREATE INDEX IF NOT EXISTS idx_spins_history_tenant_phone_time ON public.spins_history(tenant_id, user_phone, created_at DESC);

-- 4. Enable Row-Level Security (RLS)
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.spins_history ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies for Coupons
DROP POLICY IF EXISTS "Public view active tenant coupons" ON public.coupons;
CREATE POLICY "Public view active tenant coupons" ON public.coupons
  FOR SELECT
  USING (is_active = true);

DROP POLICY IF EXISTS "Tenant owner manages coupons" ON public.coupons;
CREATE POLICY "Tenant owner manages coupons" ON public.coupons
  FOR ALL
  USING (auth.uid() = tenant_id);

-- 6. RLS Policies for Spins History
DROP POLICY IF EXISTS "Tenant owner views spins history" ON public.spins_history;
CREATE POLICY "Tenant owner views spins history" ON public.spins_history
  FOR SELECT
  USING (auth.uid() = tenant_id);

-- 7. Atomic Server-Authoritative Roulette RPC Function
CREATE OR REPLACE FUNCTION public.spin_roulette(
  p_tenant_id UUID,
  p_user_phone TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_last_spin TIMESTAMPTZ;
  v_total_weight INT := 0;
  v_rand INT;
  v_current_weight INT := 0;
  v_winner RECORD;
  v_winner_id UUID := NULL;
  v_winner_index INT := 0;
  v_rows_updated INT;
  v_coupons_json JSONB;
  v_coupon_count INT := 0;
BEGIN
  -- 1. Check 24-Hour Cooldown Limit
  SELECT created_at INTO v_last_spin
  FROM public.spins_history
  WHERE tenant_id = p_tenant_id AND user_phone = p_user_phone
  ORDER BY created_at DESC
  LIMIT 1;

  IF v_last_spin IS NOT NULL AND v_last_spin > (NOW() - INTERVAL '24 hours') THEN
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'COOLDOWN_ACTIVE',
      'message', 'Você já girou a roleta hoje. Tente novamente em 24 horas.'
    );
  END IF;

  -- 2. Aggregate Active Candidate Coupons into JSON array & calculate total weight
  SELECT 
    COALESCE(SUM(GREATEST(weight, 1)), 0),
    jsonb_agg(jsonb_build_object(
      'id', id,
      'title', title,
      'code', code,
      'weight', GREATEST(weight, 1),
      'stock', stock,
      'color_hex', color_hex
    ) ORDER BY created_at ASC)
  INTO v_total_weight, v_coupons_json
  FROM (
    SELECT id, title, code, weight, stock, color_hex, created_at
    FROM public.coupons
    WHERE tenant_id = p_tenant_id 
      AND is_active = true 
      AND (stock > 0 OR stock = -1)
    FOR UPDATE
  ) candidate_coupons;

  -- 3. Fallback: No Active/Stocked Coupons Available
  IF v_total_weight = 0 OR v_coupons_json IS NULL OR jsonb_array_length(v_coupons_json) = 0 THEN
    INSERT INTO public.spins_history (tenant_id, user_phone, coupon_id)
    VALUES (p_tenant_id, p_user_phone, NULL);

    RETURN jsonb_build_object(
      'success', true,
      'is_winner', false,
      'winning_index', 0,
      'coupon', jsonb_build_object(
        'title', 'Tente Novamente',
        'code', NULL,
        'color_hex', '#94a3b8'
      ),
      'message', 'Que pena! Não foi desta vez. Tente novamente amanhã!'
    );
  END IF;

  -- 4. Calculate Weighted Random Winner
  v_rand := floor(random() * v_total_weight);
  v_coupon_count := jsonb_array_length(v_coupons_json);

  FOR i IN 0..(v_coupon_count - 1) LOOP
    v_current_weight := v_current_weight + (v_coupons_json->i->>'weight')::INT;
    
    IF v_rand < v_current_weight THEN
      v_winner_id := (v_coupons_json->i->>'id')::UUID;
      v_winner_index := i;
      EXIT;
    END IF;
  END LOOP;

  -- Safety fallback if loop finishes without selecting
  IF v_winner_id IS NULL THEN
    v_winner_id := (v_coupons_json->0->>'id')::UUID;
    v_winner_index := 0;
  END IF;

  -- 5. Fetch Full Winner Details & Atomic Stock Decrement
  SELECT id, title, code, stock, color_hex INTO v_winner
  FROM public.coupons
  WHERE id = v_winner_id;

  IF v_winner.stock > 0 THEN
    UPDATE public.coupons
    SET stock = stock - 1
    WHERE id = v_winner.id AND stock > 0;
    
    GET DIAGNOSTICS v_rows_updated = ROW_COUNT;
    
    -- Race condition fallback if stock ran out concurrently
    IF v_rows_updated = 0 THEN
      INSERT INTO public.spins_history (tenant_id, user_phone, coupon_id)
      VALUES (p_tenant_id, p_user_phone, NULL);

      RETURN jsonb_build_object(
        'success', true,
        'is_winner', false,
        'winning_index', 0,
        'coupon', jsonb_build_object(
          'title', 'Tente Novamente',
          'code', NULL,
          'color_hex', '#94a3b8'
        ),
        'message', 'Que pena! O prêmio acabou de esgotar. Tente novamente!'
      );
    END IF;
  END IF;

  -- 6. Record Successful Spin History
  INSERT INTO public.spins_history (tenant_id, user_phone, coupon_id)
  VALUES (p_tenant_id, p_user_phone, v_winner.id);

  -- 7. Return Winner Payload
  RETURN jsonb_build_object(
    'success', true,
    'is_winner', true,
    'winning_index', v_winner_index,
    'coupon', jsonb_build_object(
      'id', v_winner.id,
      'title', v_winner.title,
      'code', v_winner.code,
      'color_hex', v_winner.color_hex
    ),
    'message', 'Parabéns! Você ganhou um cupom!'
  );
END;
$$;
