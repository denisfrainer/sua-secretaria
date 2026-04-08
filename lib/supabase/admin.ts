import { createClient } from '@supabase/supabase-js'

// Tenta pegar de qualquer um dos nomes comuns
const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY; // STRICT: Bypasses RLS

if (!supabaseUrl) {
    console.error("❌ Erro: SUPABASE_URL não encontrada no process.env");
    throw new Error('supabaseUrl is required.')
}

if (!supabaseServiceKey) {
  console.warn("⚠️ [SUPABASE_ADMIN] SUPABASE_SERVICE_ROLE_KEY missing. Admin actions will be disabled.");
}

export const supabaseAdmin = supabaseServiceKey 
  ? createClient(supabaseUrl, supabaseServiceKey) 
  : null;