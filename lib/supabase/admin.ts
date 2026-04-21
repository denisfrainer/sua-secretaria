import { createClient } from '@supabase/supabase-js'

if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    try {
        const dotenv = require('dotenv');
        dotenv.config({ path: '.env.local' });
        dotenv.config();
    } catch (e) {}
}

// Tenta pegar de qualquer um dos nomes comuns
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY; // STRICT: Bypasses RLS

console.log('🛡️  [SUPABASE ADMIN] Initializing with URL:', supabaseUrl);
if (supabaseServiceKey) {
    console.log('🔑 [SUPABASE ADMIN] Service Key (first 10):', supabaseServiceKey.substring(0, 10));
} else {
    console.warn('⚠️  [SUPABASE ADMIN] No Service Role Key found. Admin client will be inactive.');
}

if (!supabaseUrl) {
    console.error("❌ Erro: SUPABASE_URL não encontrada no process.env");
    throw new Error('supabaseUrl is required.')
}

export const supabaseAdmin = supabaseServiceKey 
    ? createClient(supabaseUrl, supabaseServiceKey)
    : (null as any);