const { Client } = require('pg');

async function test(host, port, user) {
  console.log(`Testing Host: ${host}, Port: ${port}, User: ${user}`);
  const client = new Client({
    host: host,
    port: port,
    user: user,
    password: 'wolfagent2026',
    database: 'postgres',
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log(`✅ SUCCESS for Host: ${host}, Port: ${port}`);
    const res = await client.query("SELECT VERSION()");
    console.log("Version:", res.rows[0].version);
    await client.end();
    return true;
  } catch (err) {
    console.error(`❌ FAILED:`, err.message);
    return false;
  }
}

async function main() {
  const hosts = [
    'aws-0-sa-east-1.pooler.supabase.com',
    'aws-0-us-east-1.pooler.supabase.com'
  ];
  for (const host of hosts) {
    const success = await test(host, 6543, 'postgres.ofbjkrzncfysvmkzrurl');
    if (success) break;
    const success5432 = await test(host, 5432, 'postgres.ofbjkrzncfysvmkzrurl');
    if (success5432) break;
  }
}

main();
