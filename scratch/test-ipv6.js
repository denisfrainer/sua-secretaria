const dns = require('dns');

const host = 'db.ofbjkrzncfysvmkzrurl.supabase.co';

dns.resolve6(host, (err, addresses) => {
  if (err) {
    console.error('❌ IPv6 DNS resolution failed:', err.message);
  } else {
    console.log('✅ IPv6 DNS resolution succeeded:', addresses);
  }
});
