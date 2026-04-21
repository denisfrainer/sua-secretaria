import { supabaseAdmin } from './lib/supabase/admin';

async function checkColumns() {
    const { data, error } = await supabaseAdmin.from('messages').select('*').limit(1);
    if (error) {
        console.error(error);
    } else {
        console.log('Columns:', Object.keys(data[0] || {}));
    }
}

checkColumns();
