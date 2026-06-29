const { Client } = require('pg');

async function main() {
  const client = new Client({
    host: 'aws-1-us-east-1.pooler.supabase.com',
    port: 5432,
    user: 'postgres.ofbjkrzncfysvmkzrurl',
    password: 'wolfagent2026',
    database: 'postgres',
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log("✅ Successfully connected to Supabase PostgreSQL using aws-1-us-east-1 pooler!");
    const res = await client.query("SELECT VERSION()");
    console.log("Database Version:", res.rows[0].version);
  } catch (err) {
    console.error("❌ Failed to connect via aws-1-us-east-1 pooler:", err);
  } finally {
    await client.end();
  }
}

main();
