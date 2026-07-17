const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

const pool = new Pool({
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || '5432', 10),
  database: process.env.DB_NAME,
});

async function run() {
  const res = await pool.query(`
    SELECT table_name, column_name, data_type 
    FROM information_schema.columns 
    WHERE table_schema = 'public'
    ORDER BY table_name, ordinal_position;
  `);
  
  let currentTable = '';
  for (let row of res.rows) {
    if (row.table_name !== currentTable) {
      console.log(`\nTable: ${row.table_name}`);
      currentTable = row.table_name;
    }
    console.log(`  ${row.column_name}: ${row.data_type}`);
  }
  await pool.end();
}

run().catch(console.error);
