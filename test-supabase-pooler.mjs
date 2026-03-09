import pg from 'pg';
const { Client } = pg;

// Convert direct connection URL to pooler URL
const directUrl = process.env.SUPABASE_DATABASE_URL;
if (!directUrl) {
  console.error('SUPABASE_DATABASE_URL is not set');
  process.exit(1);
}

// Extract project ref from URL
// postgresql://postgres:[PASSWORD]@db.[PROJECT_REF].supabase.co:5432/postgres
const match = directUrl.match(/postgresql:\/\/([^:]+):([^@]+)@db\.([^.]+)\.supabase\.co:5432\/postgres/);
if (!match) {
  console.error('Cannot parse URL. Trying direct URL as-is...');
  // Try the URL directly but with pooler host
}

let poolerUrl;
if (match) {
  const [, user, password, projectRef] = match;
  // Transaction pooler URL format
  poolerUrl = `postgresql://${user}.${projectRef}:${password}@aws-0-ap-northeast-2.pooler.supabase.com:6543/postgres`;
  console.log('Using Transaction Pooler URL (masked):', poolerUrl.replace(/:([^:@]+)@/, ':****@'));
} else {
  poolerUrl = directUrl;
  console.log('Using URL as-is (masked):', directUrl.replace(/:([^:@]+)@/, ':****@'));
}

const client = new Client({ 
  connectionString: poolerUrl, 
  ssl: { rejectUnauthorized: false } 
});

try {
  await client.connect();
  console.log('✅ Connected to Supabase successfully via Transaction Pooler!');

  // Check existing tables
  const res = await client.query(`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    ORDER BY table_name;
  `);
  
  console.log(`\n📊 Current tables in public schema (${res.rows.length} tables):`);
  if (res.rows.length === 0) {
    console.log('  (No tables yet - migration needed)');
  } else {
    res.rows.forEach(row => console.log('  -', row.table_name));
  }

  await client.end();
  process.exit(0);
} catch (err) {
  console.error('❌ Connection failed:', err.message);
  await client.end().catch(() => {});
  process.exit(1);
}
