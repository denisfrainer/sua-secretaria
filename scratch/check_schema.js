const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
dotenv.config({ path: '.env.local' });
dotenv.config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function check() {
  const { data, error } = await supabase.from('profiles').select('*').limit(1);
  if (error) console.error(error);
  else if (data.length > 0) console.log('Profiles columns:', Object.keys(data[0]));
  else console.log('Profiles is empty');

  const { data: mData, error: mError } = await supabase.from('messages').select('*').limit(1);
  if (mError) console.error(mError);
  else if (mData.length > 0) console.log('Messages columns:', Object.keys(mData[0]));
  else console.log('Messages is empty');
}

check();
