import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({
  host: 'aws-1-ap-southeast-1.pooler.supabase.com',
  port: 6543,
  database: 'postgres',
  user: 'postgres.pblsxhfghmcqpcefzvfd',
  password: 'reagedatabase123',
  ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: 8000
});

const client = await pool.connect();
const r = await client.query(`
  SELECT column_name FROM information_schema.columns 
  WHERE table_name = 'products' ORDER BY ordinal_position
`);
const cols = r.rows.map(x => x.column_name);
const needed = ['description','features','howToUse','ingredients','priceConsumer','pricePro','isActive','visible','stock','thumbnailUrl','imageUrl','isRecommended','isNew','createdAt','updatedAt'];
const missing = needed.filter(n => cols.indexOf(n) === -1);
console.log('전체 컬럼 수:', cols.length);
console.log('필요 컬럼 누락:', missing.length === 0 ? '없음 ✅' : missing.join(', '));

// 상품 등록 테스트 INSERT
try {
  await client.query(`
    INSERT INTO products (slug, name, "priceConsumer", "pricePro", "isActive", "visible", "stock", "isRecommended", "isNew", "createdAt", "updatedAt")
    VALUES ('test-product-check', '테스트상품', '10000', '8000', true, true, 10, false, false, now(), now())
    ON CONFLICT (slug) DO NOTHING
  `);
  const check = await client.query(`SELECT id, slug, name, "priceConsumer", "isActive" FROM products WHERE slug = 'test-product-check'`);
  if (check.rows.length > 0) {
    console.log('INSERT 테스트 성공 ✅:', JSON.stringify(check.rows[0]));
    // 테스트 데이터 삭제
    await client.query(`DELETE FROM products WHERE slug = 'test-product-check'`);
    console.log('테스트 데이터 삭제 완료');
  }
} catch(e) {
  console.error('INSERT 테스트 실패:', e.message);
}

client.release();
await pool.end();
