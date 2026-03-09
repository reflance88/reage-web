import pg from 'pg';
const { Client } = pg;

const url = process.env.SUPABASE_DATABASE_URL;
if (!url) {
  console.error('SUPABASE_DATABASE_URL is not set');
  process.exit(1);
}

const maskedUrl = url.replace(/:([^:@]+)@/, ':****@');
console.log('Connecting to:', maskedUrl);

const client = new Client({ connectionString: url, ssl: { rejectUnauthorized: false } });

try {
  await client.connect();
  console.log('✅ Connected to Supabase successfully!');

  // Check existing tables
  const res = await client.query(`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    ORDER BY table_name;
  `);
  
  console.log(`\n📊 Current tables in public schema (${res.rows.length} tables):`);
  res.rows.forEach(row => console.log('  -', row.table_name));

  await client.end();
  process.exit(0);
} catch (err) {
  console.error('❌ Connection failed:', err.message);
  await client.end().catch(() => {});
  process.exit(1);
}
