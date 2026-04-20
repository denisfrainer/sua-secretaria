import { supabaseAdmin } from '../lib/supabase/admin';

async function checkSchema() {
  const { data, error } = await supabaseAdmin
    .from('profiles')
    .select('*')
    .limit(1);

  if (error) {
    console.error('Error fetching profiles:', error);
  } else {
    console.log('Profile columns:', Object.keys(data[0] || {}));
  }
}

checkSchema();
