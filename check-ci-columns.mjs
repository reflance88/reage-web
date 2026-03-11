import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const { Pool } = pg;
const connectionString = process.env.SUPABASE_DATABASE_URL;
if (!connectionString) {
  console.log('SUPABASE_DATABASE_URL not found');
  process.exit(1);
}

const pool = new Pool({ connectionString, ssl: { rejectUnauthorized: false } });
try {
  const result = await pool.query(
    "SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'certified_instructors' ORDER BY ordinal_position"
  );
  console.log('certified_instructors 컬럼 목록:');
  result.rows.forEach(r => console.log(' -', r.column_name, ':', r.data_type));
} catch(e) {
  console.log('오류:', e.message);
} finally {
  await pool.end();
}
