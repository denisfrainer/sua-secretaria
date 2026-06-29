const { Client } = require('pg');

const regions = [
  'sa-east-1',
  'us-east-1',
  'us-east-2',
  'us-west-1',
  'us-west-2',
  'ca-central-1',
  'eu-west-1',
  'eu-west-2',
  'eu-west-3',
  'eu-central-1',
  'ap-southeast-1',
  'ap-southeast-2',
  'ap-northeast-1',
  'ap-northeast-2',
  'ap-south-1'
];

async function testRegion(region) {
  const host = `aws-0-${region}.pooler.supabase.com`;
  const client = new Client({
    host: host,
    port: 6543,
    user: 'postgres.ofbjkrzncfysvmkzrurl',
    password: 'wolfagent2026',
    database: 'postgres',
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log(`🎉 SUCCESS: Connected to region ${region}!`);
    const res = await client.query("SELECT VERSION()");
    console.log("Version:", res.rows[0].version);
    await client.end();
    return true;
  } catch (err) {
    if (err.message.includes("tenant/user postgres.ofbjkrzncfysvmkzrurl not found")) {
      // Quiet fail if tenant not found, meaning it's the wrong region
    } else {
      console.log(`❓ Region ${region} returned error:`, err.message);
    }
    return false;
  }
}

async function main() {
  console.log("Searching for correct database pooler region...");
  for (const region of regions) {
    const success = await testRegion(region);
    if (success) {
      console.log(`Found region: ${region}`);
      break;
    }
  }
  console.log("Search finished.");
}

main();
