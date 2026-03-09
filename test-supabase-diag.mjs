const url = process.env.SUPABASE_DATABASE_URL;
if (!url) {
  console.error('SUPABASE_DATABASE_URL is not set');
  process.exit(1);
}

// Mask password for safe display
const maskedUrl = url.replace(/:([^:@]{3,})@/, ':****@');
console.log('URL value:', maskedUrl);
console.log('URL starts with:', url.substring(0, 20));

if (url.startsWith('https://') || url.startsWith('http://')) {
  console.log('\n⚠️  URL is HTTP format, not PostgreSQL connection string!');
  console.log('Expected format: postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres');
  console.log('\nHow to get the correct URL:');
  console.log('1. Go to Supabase Dashboard → Settings → Database');
  console.log('2. Find "Connection string" section');
  console.log('3. Select "URI" tab (not "JDBC" or "Python")');
  console.log('4. Copy the string starting with postgresql://');
} else if (url.startsWith('postgresql://') || url.startsWith('postgres://')) {
  console.log('✅ URL format looks correct (postgresql:// format)');
} else {
  console.log('⚠️  Unexpected URL format');
}
