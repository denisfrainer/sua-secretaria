import { supabaseAdmin } from './lib/supabase/admin';

async function checkSchema() {
  const { data, error } = await supabaseAdmin
    .from('profiles')
    .select('*')
    .limit(1);
  
  if (error) {
    console.error('Error fetching profiles:', error);
    return;
  }
  
  if (data && data.length > 0) {
    console.log('Columns in profiles:', Object.keys(data[0]));
  } else {
    console.log('No data in profiles table.');
  }

  const { data: mData, error: mError } = await supabaseAdmin
    .from('messages')
    .select('*')
    .limit(1);

  if (mData && mData.length > 0) {
    console.log('Columns in messages:', Object.keys(mData[0]));
  }
}

checkSchema();
