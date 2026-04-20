const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing env vars');
  process.exit(1);
}

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

async function testResolution(slug) {
  console.log(`Testing resolution for: ${slug}`);
  
  const { data: profile, error: slugError } = await supabaseAdmin
    .from('profiles')
    .select('*')
    .eq('slug', slug)
    .maybeSingle();

  if (slugError) {
    console.error('Slug Error:', slugError);
    return;
  }

  if (!profile) {
    console.log('Profile not found for slug');
    return;
  }

  console.log('Found profile:', profile.id, profile.slug);

  const { data: businessConfig, error: configError } = await supabaseAdmin
    .from('business_config')
    .select('*')
    .eq('owner_id', profile.id)
    .maybeSingle();

  if (configError) {
    console.error('Config Error:', configError);
    return;
  }

  console.log('Found business config:', businessConfig?.id);
}

testResolution('rubia-beauty');
