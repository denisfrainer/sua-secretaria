const { Client } = require('pg');

async function main() {
  const client = new Client({
    connectionString: "postgresql://postgres:wolfagent2026@db.ofbjkrzncfysvmkzrurl.supabase.co:5432/postgres",
  });

  try {
    await client.connect();
    console.log("Connected to database successfully.\n");

    // 1. Get all tables in public schema
    const tablesRes = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name;
    `);
    const tables = tablesRes.rows.map(r => r.table_name);
    console.log("=== PUBLIC TABLES ===");
    console.log(tables.join(", "));
    console.log("\n");

    // 2. Get all foreign key constraints in public schema
    const fkRes = await client.query(`
      SELECT
          tc.constraint_name, 
          tc.table_name AS source_table, 
          kcu.column_name AS source_column, 
          ccu.table_name AS target_table,
          ccu.column_name AS target_column
      FROM 
          information_schema.table_constraints AS tc 
          JOIN information_schema.key_column_usage AS kcu
            ON tc.constraint_name = kcu.constraint_name
            AND tc.table_schema = kcu.table_schema
          JOIN information_schema.constraint_column_usage AS ccu
            ON ccu.constraint_name = tc.constraint_name
            AND ccu.table_schema = ccu.table_schema
            AND kcu.ordinal_position = ccu.ordinal_position
      WHERE tc.constraint_type = 'FOREIGN KEY' 
        AND tc.table_schema = 'public';
    `);

    console.log("=== FOREIGN KEY RELATIONSHIPS ===");
    fkRes.rows.forEach(fk => {
      console.log(`- ${fk.source_table}.${fk.source_column} -> ${fk.target_table}.${fk.target_column} (Constraint: ${fk.constraint_name})`);
    });
    console.log("\n");

    // 3. For each table, get column definitions
    console.log("=== TABLE SCHEMAS ===");
    for (const table of tables) {
      const colRes = await client.query(`
        SELECT column_name, data_type, is_nullable, column_default
        FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = $1
        ORDER BY ordinal_position;
      `, [table]);
      console.log(`Table: ${table}`);
      colRes.rows.forEach(col => {
        console.log(`  - ${col.column_name} (${col.data_type})${col.is_nullable === 'NO' ? ' NOT NULL' : ''}${col.column_default ? ' DEFAULT ' + col.column_default : ''}`);
      });
      console.log("");
    }

  } catch (err) {
    console.error("Error running database inspection:", err);
  } finally {
    await client.end();
  }
}

main();
