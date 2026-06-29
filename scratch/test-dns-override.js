const dns = require('dns');

// Monkeypatch dns.lookup
const originalLookup = dns.lookup;
dns.lookup = function(hostname, options, callback) {
  let cb = callback;
  let opts = options;
  if (typeof options === 'function') {
    cb = options;
    opts = {};
  }
  if (hostname === 'db.ofbjkrzncfysvmkzrurl.supabase.co') {
    console.log(`[DNS Interceptor] Resolving ${hostname} to pooler IPv4: 52.45.94.125, all: ${!!(opts && opts.all)}`);
    if (opts && opts.all) {
      return cb(null, [{ address: '52.45.94.125', family: 4 }]);
    }
    return cb(null, '52.45.94.125', 4);
  }
  return originalLookup.call(dns, hostname, opts, cb);
};

const { Client } = require('pg');

async function main() {
  const client = new Client({
    host: 'db.ofbjkrzncfysvmkzrurl.supabase.co',
    port: 5432,
    user: 'postgres',
    password: 'wolfagent2026',
    database: 'postgres',
    ssl: { 
      servername: 'db.ofbjkrzncfysvmkzrurl.supabase.co',
      rejectUnauthorized: false 
    }
  });

  try {
    await client.connect();
    console.log("✅ Successfully connected to Supabase PostgreSQL using DNS monkeypatch + SNI servername!");
    const res = await client.query("SELECT VERSION()");
    console.log("Database Version:", res.rows[0].version);
  } catch (err) {
    console.error("❌ Failed to connect via DNS monkeypatch + SNI:", err);
  } finally {
    await client.end();
  }
}

main();
