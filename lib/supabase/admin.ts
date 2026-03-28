import { createClient } from '@supabase/supabase-js'

// Tenta pegar de qualquer um dos nomes comuns
const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY; // STRICT: Bypasses RLS

if (!supabaseUrl) {
    console.error("❌ Erro: SUPABASE_URL não encontrada no process.env");
    throw new Error('supabaseUrl is required.')
}

if (!supabaseServiceKey) {
    console.error("❌ CRITICAL: SUPABASE_SERVICE_ROLE_KEY missing. Cannot bypass RLS.");
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is required to prevent 42501 limits.')
}

export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)