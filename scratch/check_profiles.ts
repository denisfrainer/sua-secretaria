import { supabaseAdmin } from './lib/supabase/admin';

async function checkProfiles() {
  const { data, error } = await supabaseAdmin
    .from('profiles')
    .select('id, full_name, slug, phone');
  
  if (error) {
    console.error('Error fetching profiles:', error);
    return;
  }

  console.log('--- PROFILES ---');
  data.forEach(p => {
    console.log(`ID: ${p.id} | Slug: ${p.slug} | Name: ${p.full_name} | Phone: ${p.phone}`);
  });
  console.log('----------------');
}

checkProfiles();
