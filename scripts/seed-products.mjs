import "dotenv/config";
import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";

const connection = await mysql.createConnection(process.env.DATABASE_URL);
const db = drizzle(connection);

const { products } = await import("../drizzle/schema.ts");

const productData = [
  {
    slug: "reage-device",
    name: "레아쥬기기",
    description: "REAGE 올핸드 미세전류 기기 도입 상담 상품",
    priceConsumer: "0",
    pricePro: "0",
    isProOnly: false,
    stock: 999,
    isActive: true,
  },
  {
    slug: "s1-cream",
    name: "S1크림",
    description: "레아쥬 S1 미세전류 크림",
    priceConsumer: "58000",
    pricePro: "42000",
    isProOnly: false,
    stock: 999,
    isActive: true,
  },
  {
    slug: "m2-cream",
    name: "M2크림",
    description: "레아쥬 M2 미세전류 크림",
    priceConsumer: "68000",
    pricePro: "49000",
    isProOnly: false,
    stock: 999,
    isActive: true,
  },
  {
    slug: "f3-cream",
    name: "F3크림",
    description: "레아쥬 F3 미세전류 크림",
    priceConsumer: "78000",
    pricePro: "56000",
    isProOnly: false,
    stock: 999,
    isActive: true,
  },
  {
    slug: "new-product-1",
    name: "신제품1",
    description: "레아쥬 신제품1",
    priceConsumer: "88000",
    pricePro: "63000",
    isProOnly: false,
    stock: 999,
    isActive: true,
  },
  {
    slug: "new-product-2",
    name: "신제품2",
    description: "레아쥬 신제품2",
    priceConsumer: "98000",
    pricePro: "70000",
    isProOnly: false,
    stock: 999,
    isActive: true,
  },
  {
    slug: "new-product-3",
    name: "신제품3",
    description: "레아쥬 신제품3",
    priceConsumer: "108000",
    pricePro: "77000",
    isProOnly: false,
    stock: 999,
    isActive: true,
  },
];

for (const p of productData) {
  await db
    .insert(products)
    .values(p)
    .onDuplicateKeyUpdate({ set: { name: p.name } });
  console.log(`Seeded: ${p.name}`);
}

console.log("Done!");
await connection.end();
