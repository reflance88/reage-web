const projectUrl = 'https://pblsxhfghmcqpcefzvfd.supabase.co';
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const anonKey = process.env.SUPABASE_ANON_KEY;

if (!serviceKey) {
  console.error('SUPABASE_SERVICE_ROLE_KEY is not set');
  process.exit(1);
}

console.log('Testing Supabase REST API connection...');
console.log('Project URL:', projectUrl);

// Test with service role key - list tables via REST API
try {
  const res = await fetch(`${projectUrl}/rest/v1/`, {
    headers: {
      'apikey': serviceKey,
      'Authorization': `Bearer ${serviceKey}`
    }
  });
  
  const data = await res.json();
  console.log('\n✅ Supabase REST API connection successful!');
  console.log('Response status:', res.status);
  
  if (res.status === 200) {
    // Try to query information_schema via RPC
    const tablesRes = await fetch(`${projectUrl}/rest/v1/rpc/get_tables`, {
      method: 'POST',
      headers: {
        'apikey': serviceKey,
        'Authorization': `Bearer ${serviceKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({})
    });
    
    if (tablesRes.ok) {
      const tables = await tablesRes.json();
      console.log('Tables:', tables);
    } else {
      // Try direct table query
      const userRes = await fetch(`${projectUrl}/rest/v1/users?select=count`, {
        headers: {
          'apikey': serviceKey,
          'Authorization': `Bearer ${serviceKey}`,
          'Prefer': 'count=exact'
        }
      });
      
      if (userRes.status === 404 || userRes.status === 400) {
        console.log('\n📋 Tables not yet created (migration needed)');
        console.log('Run: pnpm db:push:pg to create tables');
      } else if (userRes.ok) {
        console.log('\n✅ "users" table exists!');
        const count = userRes.headers.get('content-range');
        console.log('Content-Range:', count);
      } else {
        const errData = await userRes.json();
        console.log('\nUsers table check:', userRes.status, JSON.stringify(errData));
      }
    }
  } else {
    console.log('API response:', JSON.stringify(data));
  }
} catch (err) {
  console.error('❌ Connection failed:', err.message);
  process.exit(1);
}
