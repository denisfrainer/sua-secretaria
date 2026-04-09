import { supabaseAdmin } from '../../lib/supabase/admin';

async function test() {
  const { data, error } = await supabaseAdmin
    .from('profiles')
    .select('id, full_name, slug')
    .eq('slug', 'rubia-beauty')
    .maybeSingle();

  if (error) {
    console.error('DB Error:', error.message);
  } else {
    console.log('Result:', data);
  }
}

test();
