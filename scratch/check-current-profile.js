const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
dotenv.config({ path: '.env.local' });
dotenv.config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function main() {
  // Let's find the profile matching the slug 'denistreak'
  const { data: vitrineProfile, error: vErr } = await supabase
    .from('vitrine_profiles')
    .select('*')
    .eq('slug', 'denistreak')
    .maybeSingle();

  if (vErr) {
    console.error("Vitrine profile error:", vErr);
  } else {
    console.log("Vitrine profile stored:", vitrineProfile);
  }

  if (vitrineProfile) {
    const { data: baseProfile, error: pErr } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', vitrineProfile.user_id)
      .maybeSingle();

    if (pErr) {
      console.error("Base profile error:", pErr);
    } else {
      console.log("Base profile stored:", baseProfile);
    }
  }
}

main();
