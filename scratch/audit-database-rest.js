const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
dotenv.config({ path: '.env.local' });
dotenv.config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const tables = [
  'agent_configs',
  'appointments',
  'business_config',
  'chat_history',
  'leads_lobo',
  'lobo_daily_stats',
  'menu_config',
  'messages',
  'organizations',
  'otp_resets',
  'profiles',
  'system_settings',
  'users',
  'vitrine_portfolio',
  'vitrine_profiles',
  'vitrine_services',
  'wolf_system_lock'
];

async function audit() {
  console.log("=== STARTING REST DATABASE AUDIT ===");
  
  for (const table of tables) {
    try {
      // Query 1 row to get columns and check existence
      const { data, error } = await supabase
        .from(table)
        .select('*')
        .limit(1);
        
      if (error) {
        console.log(`❌ Table: [${table}] - Error: ${error.message} (Code: ${error.code})`);
      } else {
        // Count total rows
        const { count, error: countError } = await supabase
          .from(table)
          .select('*', { count: 'exact', head: true });
          
        const rowCount = countError ? 'unknown' : count;
        const columns = data.length > 0 ? Object.keys(data[0]) : [];
        console.log(`\n======================================`);
        console.log(`👉 Table: [${table}]`);
        console.log(`   - Status: EXISTS`);
        console.log(`   - Row count: ${rowCount}`);
        if (data.length > 0) {
          console.log(`   - Columns:`, columns);
          console.log(`   - Sample row:`, data[0]);
        } else {
          console.log(`   - Columns: [No rows to inspect columns via REST]`);
          // Try to insert a dummy/rollback or query another endpoint to get columns? 
          // For empty tables, we will list columns if we can find them in TypeScript or metadata.
        }
      }
    } catch (e) {
      console.log(`❌ Table: [${table}] - Exception:`, e.message);
    }
  }
  
  console.log("\n=== AUDIT COMPLETED ===");
}

audit();
