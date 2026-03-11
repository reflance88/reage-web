const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

const tables = [
  'users','orders','products','gallery_posts','magazine_posts',
  'reviews','contact_inquiries','certified_instructors',
  'design_files','design_folders','excel_templates','coupons',
  'order_items','business_verifications','popups','page_views'
];

const results = await Promise.all(tables.map(async (t) => {
  const r = await fetch(`${url}/rest/v1/${t}?limit=0`, {
    headers: { apikey: key, Authorization: `Bearer ${key}` }
  });
  const d = await r.json();
  return { table: t, exists: !d.code, error: d.code };
}));

results.forEach(r => {
  console.log(r.exists ? '✅' : '❌', r.table, r.error || '');
});
