import { Client } from 'pg';

async function migrate() {
  const client = new Client({
    connectionString: "postgresql://postgres:wolfagent2026@db.ofbjkrzncfysvmkzrurl.supabase.co:5432/postgres",
  });

  try {
    await client.connect();
    console.log("✅ Connected to database");

    const sql = `
      ALTER TABLE appointments 
      DROP CONSTRAINT IF EXISTS appointments_status_check;
      
      ALTER TABLE appointments 
      ADD CONSTRAINT appointments_status_check 
      CHECK (status IN ('confirmed', 'cancelled', 'completed', 'BLOCKED'));
    `;

    await client.query(sql);
    console.log("🚀 Migration successful: Status 'BLOCKED' added to constraints.");

  } catch (err) {
    console.error("❌ Migration failed:", err);
  } finally {
    await client.end();
  }
}

migrate();
