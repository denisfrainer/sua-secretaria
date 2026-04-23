const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
dotenv.config({ path: '.env.local' });
dotenv.config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function check() {
  const { data, error } = await supabase.from('chat_sessions').select('*').limit(1);
  if (error) console.error(error);
  else if (data.length > 0) console.log('Chat Sessions columns:', Object.keys(data[0]));
  else console.log('Chat Sessions is empty');
}

check();
