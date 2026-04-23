const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
dotenv.config({ path: '.env.local' });
dotenv.config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function check() {
  const { data, error } = await supabase.rpc('get_tables'); // This might not work
  if (error) {
    // Fallback: try common names
    const tables = ['worker_tasks', 'tasks', 'processing_queue', 'eliza_tasks'];
    for (const t of tables) {
      const { error: te } = await supabase.from(t).select('count').limit(1);
      if (!te) console.log(`Table found: ${t}`);
      else console.log(`Table NOT found: ${t} (${te.message})`);
    }
  } else {
    console.log('Tables:', data);
  }
}

check();
