import dotenv from 'dotenv';
dotenv.config();
import pg from 'pg';
const { Pool } = pg;

const url = process.env.SUPABASE_DATABASE_URL || process.env.DATABASE_URL;
console.log('Connecting to:', url ? url.substring(0, 60) + '...' : 'NOT SET');

const pool = new Pool({ 
  connectionString: url, 
  ssl: { rejectUnauthorized: false }, 
  connectionTimeoutMillis: 5000 
});

try {
  const client = await pool.connect();
  console.log('Connected!');
  
  // users 테이블 구조 확인
  const cols = await client.query(`SELECT column_name FROM information_schema.columns WHERE table_name = 'users' ORDER BY ordinal_position`);
  console.log('users columns:', cols.rows.map(r => r.column_name).join(', '));
  
  // 테스트 INSERT
  const res = await client.query(`
    INSERT INTO users ("openId", name, email, "loginMethod", "lastSignedIn")
    VALUES ('test-oauth-check', 'Test', 'test@test.com', 'google', NOW())
    ON CONFLICT ("openId") DO UPDATE SET "lastSignedIn" = NOW()
    RETURNING id
  `);
  console.log('Upsert result:', res.rows);
  
  // 정리
  await client.query(`DELETE FROM users WHERE "openId" = 'test-oauth-check'`);
  console.log('Cleanup done - DB upsert works correctly!');
  
  client.release();
  await pool.end();
} catch (err) {
  console.error('ERROR:', err.message);
  process.exit(1);
}
