import { createClient } from '@supabase/supabase-js'

// Tenta pegar de qualquer um dos nomes comuns
const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl) {
    console.error("❌ Erro: SUPABASE_URL não encontrada no process.env");
    throw new Error('supabaseUrl is required.')
}

if (!supabaseServiceKey) {
    console.error("❌ Erro: SUPABASE_SERVICE_ROLE_KEY não encontrada no process.env");
    throw new Error('supabaseServiceKey is required.')
}

export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)