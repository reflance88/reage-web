import "dotenv/config";
import pg from "pg";

const { Pool } = pg;

const connectionString = process.env.SUPABASE_DATABASE_URL || process.env.DATABASE_URL;

if (!connectionString) {
  console.error("SUPABASE_DATABASE_URL or DATABASE_URL is not set");
  process.exit(1);
}

const productData = [
  {
    slug: "reage-device",
    name: "레아쥬기기",
    description:
      "레아쥬 기기는 테라피스트의 손을 통해 5V 미세전류를 전달하는 올핸드 미세전류 시스템입니다. 기기 단독 판매가 아닌, 교육과 운영 지원 패키지를 포함한 도입 상담형 상품입니다.",
    priceConsumer: 0,
    pricePro: 0,
    imageUrl:
      "https://files.manuscdn.com/user_upload_by_module/session_file/310519663306521822/XJcjlYyYshHUOjCk.jpg",
    productCode: "REAGE-DEVICE",
    summaryDescription:
      "20년간 검증된 올핸드 미세전류 시스템. 교육·운영 지원 패키지와 함께 도입 상담으로 안내합니다.",
    seoTitle: "레아쥬기기 | REAGE 공식 스토어",
    seoDescription: "REAGE 올핸드 미세전류 기기 도입 상담과 상세 스펙을 공식 스토어에서 확인하세요.",
    seoImageAlt: "레아쥬기기 제품 이미지",
    detailPageUrl: "/reage-device.html",
    sortOrder: 5,
  },
  {
    slug: "s1-cream",
    name: "S1크림",
    description:
      "S1크림은 레아쥬 미세전류 테라피의 효과를 극대화하기 위해 특별히 설계된 전문 크림입니다. 피부의 전기 전도성을 높이고 테라피 중 영양 성분의 침투를 돕습니다. 일본 에스테틱 현장에서 20년간 검증된 성분 배합으로, 테라피 전·중·후 모든 단계에서 사용 가능합니다.",
    priceConsumer: 58000,
    pricePro: 42000,
    imageUrl:
      "https://d2xsxph8kpxj0f.cloudfront.net/310519663306521822/AerFeijbfzRzRoaKj4KqTe/s1-cream_dde44c8f.png",
    productCode: "REAGE-S1",
    summaryDescription:
      "레아쥬 미세전류 테라피와 함께 사용하는 전문 크림입니다. 피부 컨디셔닝을 최적화하여 테라피 효과를 극대화합니다.",
    seoTitle: "S1크림 | REAGE 공식 스토어",
    seoDescription: "레아쥬 미세전류 테라피와 함께 사용하는 S1크림을 공식 스토어에서 확인하세요.",
    seoImageAlt: "S1크림 제품 이미지",
    detailPageUrl: "/product/s1-cream",
    sortOrder: 10,
  },
  {
    slug: "m2-cream",
    name: "M2크림",
    description:
      "M2크림은 레아쥬 미세전류 테라피의 효과를 극대화하기 위해 특별히 설계된 전문 크림입니다. 피부의 전기 전도성을 높이고 테라피 중 영양 성분의 침투를 돕습니다. 일본 에스테틱 현장에서 20년간 검증된 성분 배합으로, 테라피 전·중·후 모든 단계에서 사용 가능합니다.",
    priceConsumer: 68000,
    pricePro: 49000,
    imageUrl:
      "https://d2xsxph8kpxj0f.cloudfront.net/310519663306521822/AerFeijbfzRzRoaKj4KqTe/m2-cream_d7617098.png",
    productCode: "REAGE-M2",
    summaryDescription:
      "레아쥬 미세전류 테라피와 함께 사용하는 전문 크림입니다. 피부 컨디셔닝을 최적화하여 테라피 효과를 극대화합니다.",
    seoTitle: "M2크림 | REAGE 공식 스토어",
    seoDescription: "레아쥬 미세전류 테라피와 함께 사용하는 M2크림을 공식 스토어에서 확인하세요.",
    seoImageAlt: "M2크림 제품 이미지",
    detailPageUrl: "/product/m2-cream",
    sortOrder: 20,
  },
  {
    slug: "f3-cream",
    name: "F3크림",
    description:
      "F3크림은 레아쥬 미세전류 테라피의 효과를 극대화하기 위해 특별히 설계된 전문 크림입니다. 피부의 전기 전도성을 높이고 테라피 중 영양 성분의 침투를 돕습니다. 일본 에스테틱 현장에서 20년간 검증된 성분 배합으로, 테라피 전·중·후 모든 단계에서 사용 가능합니다.",
    priceConsumer: 78000,
    pricePro: 56000,
    imageUrl:
      "https://d2xsxph8kpxj0f.cloudfront.net/310519663306521822/AerFeijbfzRzRoaKj4KqTe/f3-cream_fd3b1431.png",
    productCode: "REAGE-F3",
    summaryDescription:
      "레아쥬 미세전류 테라피와 함께 사용하는 전문 크림입니다. 피부 컨디셔닝을 최적화하여 테라피 효과를 극대화합니다.",
    seoTitle: "F3크림 | REAGE 공식 스토어",
    seoDescription: "레아쥬 미세전류 테라피와 함께 사용하는 F3크림을 공식 스토어에서 확인하세요.",
    seoImageAlt: "F3크림 제품 이미지",
    detailPageUrl: "/product/f3-cream",
    sortOrder: 30,
  },
];

const sharedProductFields = {
  priceMembership: null,
  isProOnly: false,
  stock: 999,
  isActive: true,
  visible: true,
  productStatus: "new",
  manufacturer: "REAGE",
  brand: "REAGE",
  origin: "Japan",
  shortDescription:
    "레아쥬 미세전류 테라피와 함께 사용하는 전문 크림입니다. 피부 컨디셔닝을 최적화하여 테라피 효과를 극대화합니다.",
  features: "테라피 전 피부 전도성 보조, 부드러운 슬라이딩, 홈케어와 샵케어 겸용",
  howToUse:
    "테라피 전: 세안 후 피부에 적당량을 도포하여 기기 슬라이딩이 원활하게 합니다.\n테라피 중: 필요에 따라 추가 도포하여 건조함을 방지합니다.\n테라피 후: 잔여 크림을 가볍게 흡수시켜 마무리합니다.",
  ingredients:
    "정제수, 글리세린, 나이아신아마이드, 히알루론산나트륨, 판테놀, 알란토인, 카보머, 트리에탄올아민, 페녹시에탄올, 에틸헥실글리세린",
  isRecommended: true,
  isNew: true,
};

const pool = new Pool({
  connectionString,
  ssl: connectionString.includes("supabase.com") ? { rejectUnauthorized: false } : undefined,
});

const client = await pool.connect();

try {
  await client.query("begin");

  for (const product of productData) {
    const payload = { ...sharedProductFields, ...product };

    await client.query(
      `
        insert into public.products (
          slug,
          name,
          description,
          "priceConsumer",
          "pricePro",
          "priceMembership",
          "isProOnly",
          stock,
          "imageUrl",
          "thumbnailUrl",
          "isActive",
          visible,
          "productCode",
          "productStatus",
          manufacturer,
          brand,
          origin,
          "summaryDescription",
          "shortDescription",
          "seoTitle",
          "seoDescription",
          "seoImageAlt",
          features,
          "howToUse",
          ingredients,
          "detailPageUrl",
          "sortOrder",
          "isRecommended",
          "isNew",
          "updatedAt"
        ) values (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $9, $10, $11, $12, $13, $14, $15, $16,
          $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, now()
        )
        on conflict (slug) do update set
          name = excluded.name,
          description = excluded.description,
          "priceConsumer" = excluded."priceConsumer",
          "pricePro" = excluded."pricePro",
          "priceMembership" = excluded."priceMembership",
          "isProOnly" = excluded."isProOnly",
          stock = excluded.stock,
          "imageUrl" = excluded."imageUrl",
          "thumbnailUrl" = excluded."thumbnailUrl",
          "isActive" = excluded."isActive",
          visible = excluded.visible,
          "productCode" = excluded."productCode",
          "productStatus" = excluded."productStatus",
          manufacturer = excluded.manufacturer,
          brand = excluded.brand,
          origin = excluded.origin,
          "summaryDescription" = excluded."summaryDescription",
          "shortDescription" = excluded."shortDescription",
          "seoTitle" = excluded."seoTitle",
          "seoDescription" = excluded."seoDescription",
          "seoImageAlt" = excluded."seoImageAlt",
          features = excluded.features,
          "howToUse" = excluded."howToUse",
          ingredients = excluded.ingredients,
          "detailPageUrl" = excluded."detailPageUrl",
          "sortOrder" = excluded."sortOrder",
          "isRecommended" = excluded."isRecommended",
          "isNew" = excluded."isNew",
          "updatedAt" = now()
      `,
      [
        payload.slug,
        payload.name,
        payload.description,
        payload.priceConsumer,
        payload.pricePro,
        payload.priceMembership,
        payload.isProOnly,
        payload.stock,
        payload.imageUrl,
        payload.isActive,
        payload.visible,
        payload.productCode,
        payload.productStatus,
        payload.manufacturer,
        payload.brand,
        payload.origin,
        payload.summaryDescription,
        payload.shortDescription,
        payload.seoTitle,
        payload.seoDescription,
        payload.seoImageAlt,
        payload.features,
        payload.howToUse,
        payload.ingredients,
        payload.detailPageUrl,
        payload.sortOrder,
        payload.isRecommended,
        payload.isNew,
      ],
    );

    console.log(`Seeded: ${payload.name}`);
  }

  await client.query("commit");
  console.log("Done!");
} catch (error) {
  await client.query("rollback");
  throw error;
} finally {
  client.release();
  await pool.end();
}
