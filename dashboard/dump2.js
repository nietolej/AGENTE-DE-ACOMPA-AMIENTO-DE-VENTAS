const { Client } = require('pg');

const client = new Client({
  user: 'postgres',
  password: 'postgres',
  host: 'localhost',
  port: 5432,
  database: 'postgres',
});

async function run() {
  await client.connect();
  const res = await client.query(`
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
  await client.end();
}

run().catch(console.error);
