const { Client } = require('pg');

async function main() {
  const client = new Client({
    host: '2600:1f18:6f7d:e801:b31d:aef1:e619:f968',
    port: 5432,
    user: 'postgres',
    password: 'wolfagent2026',
    database: 'postgres',
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log("✅ Connected via IPv6 address!");
    const res = await client.query("SELECT VERSION()");
    console.log("Version:", res.rows[0].version);
  } catch (err) {
    console.error("❌ Failed to connect via IPv6:", err);
  } finally {
    await client.end();
  }
}

main();
