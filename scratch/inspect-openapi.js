const axios = require('axios');
const dotenv = require('dotenv');
dotenv.config({ path: '.env.local' });
dotenv.config();

const url = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/`;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function main() {
  try {
    const res = await axios.get(url, {
      headers: {
        'apikey': key,
        'Authorization': `Bearer ${key}`
      }
    });
    
    const paths = res.data.definitions;
    console.log("=== TABLE SCHEMAS FROM OPENAPI ===");
    for (const tableName of Object.keys(paths)) {
      if (tableName.startsWith('vitrine_') || tableName === 'profiles') {
        console.log(`Table: ${tableName}`);
        console.log("Properties:", Object.keys(paths[tableName].properties));
        console.log("");
      }
    }
  } catch (err) {
    console.error("Error fetching OpenAPI schema:", err.message);
  }
}

main();
