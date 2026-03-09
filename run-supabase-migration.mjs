import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

const projectUrl = 'https://pblsxhfghmcqpcefzvfd.supabase.co';
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!serviceKey) {
  console.error('SUPABASE_SERVICE_ROLE_KEY is not set');
  process.exit(1);
}

// Read the migration SQL
const sqlPath = join(__dirname, 'drizzle/migrations-pg/0000_late_victor_mancha.sql');
const rawSql = readFileSync(sqlPath, 'utf-8');

// Clean up: remove drizzle-kit markers
const cleanSql = rawSql.replace(/--> statement-breakpoint\n/g, '\n');

console.log('Running Supabase migration via REST API...');
console.log('SQL length:', cleanSql.length, 'chars');

// Execute via Supabase SQL endpoint
try {
  const res = await fetch(`${projectUrl}/rest/v1/rpc/exec_sql`, {
    method: 'POST',
    headers: {
      'apikey': serviceKey,
      'Authorization': `Bearer ${serviceKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ sql: cleanSql })
  });
  
  const data = await res.json();
  
  if (res.ok) {
    console.log('✅ Migration executed successfully!');
  } else {
    console.log('Response status:', res.status);
    console.log('Response:', JSON.stringify(data));
    
    // Try alternative: Supabase Management API
    console.log('\nTrying Supabase Management API...');
    const mgmtRes = await fetch(`https://api.supabase.com/v1/projects/pblsxhfghmcqpcefzvfd/database/query`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${serviceKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ query: cleanSql })
    });
    
    const mgmtData = await mgmtRes.json();
    console.log('Management API status:', mgmtRes.status);
    console.log('Management API response:', JSON.stringify(mgmtData).substring(0, 200));
  }
} catch (err) {
  console.error('Error:', err.message);
}

// Check tables after migration
console.log('\nChecking tables after migration...');
const tablesRes = await fetch(`${projectUrl}/rest/v1/users?select=count&limit=1`, {
  headers: {
    'apikey': serviceKey,
    'Authorization': `Bearer ${serviceKey}`,
    'Prefer': 'count=exact'
  }
});

if (tablesRes.ok || tablesRes.status === 200) {
  console.log('✅ "users" table exists!');
} else {
  const errData = await tablesRes.json().catch(() => ({}));
  console.log('Users table check:', tablesRes.status, JSON.stringify(errData).substring(0, 100));
}
