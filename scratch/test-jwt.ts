import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
const supabaseAnon = createClient(supabaseUrl, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);

async function run() {
  const email = '5511999999999@was.app';
  
  // 1. Get user id
  const { data: usersData } = await supabaseAdmin.auth.admin.listUsers();
  const user = usersData.users.find(u => u.email === email);
  
  if (!user) {
    console.log('User not found');
    return;
  }
  
  // 2. Generate new random password
  const newPassword = crypto.randomUUID();
  console.log('Setting new password:', newPassword);
  
  await supabaseAdmin.auth.admin.updateUserById(user.id, { password: newPassword });
  
  // 3. Sign in with the new password to get the session (using anon client because admin client bypasses RLS but we want to simulate client signin)
  const { data: sessionData, error } = await supabaseAnon.auth.signInWithPassword({
    email,
    password: newPassword,
  });
  
  console.log('Sign in result:', sessionData.session?.access_token ? 'Success' : 'Failure', error);
}

run().catch(console.error);
