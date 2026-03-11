-- ============================================================
-- REAGE 웹사이트 Supabase (PostgreSQL) 스키마 SQL
-- 생성일: 2026-03-11
-- 설명: 현재 TiDB(MySQL) 스키마를 Supabase PostgreSQL 호환 형식으로 변환
-- 사용법: Supabase SQL Editor에서 순서대로 실행하세요.
-- ============================================================

-- ─── 확장 모듈 ────────────────────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ─── ENUM 타입 정의 ──────────────────────────────────────────────────────────
-- 이미 존재하는 타입은 건너뜁니다 (duplicate_object 예외 처리)
DO $$ BEGIN CREATE TYPE user_role AS ENUM ('user', 'admin');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE TYPE member_role AS ENUM ('consumer', 'professional', 'membership');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE TYPE pro_verification_status AS ENUM ('none', 'pending', 'approved', 'rejected');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE TYPE verification_status AS ENUM ('none', 'pending', 'approved', 'rejected');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE TYPE product_status AS ENUM ('new', 'used', 'refurbished');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE TYPE tax_type AS ENUM ('taxable', 'tax_free', 'exempt');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE TYPE shipping_type AS ENUM ('direct', 'warehouse', 'other');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE TYPE order_status AS ENUM ('created', 'paid', 'failed', 'cancelled');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE TYPE shipping_status AS ENUM ('pending_payment', 'ready', 'hold', 'shipping', 'delivered', 'none');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE TYPE third_party_status AS ENUM ('none', 'synced', 'error');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE TYPE third_party_result AS ENUM ('success', 'failed', 'skipped');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE TYPE review_category AS ENUM ('before_after', 'device', 'education', 'event', 'etc');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE TYPE cancellation_status AS ENUM ('requested', 'approved', 'rejected', 'completed');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE TYPE exchange_status AS ENUM ('requested', 'approved', 'rejected', 'completed');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE TYPE return_status AS ENUM ('requested', 'approved', 'rejected', 'completed');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE TYPE refund_status AS ENUM ('requested', 'approved', 'rejected', 'completed');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE TYPE card_cancellation_status AS ENUM ('requested', 'completed', 'failed');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE TYPE user_role_snapshot AS ENUM ('consumer', 'professional');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE TYPE pro_status_snapshot AS ENUM ('none', 'pending', 'approved', 'rejected');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ─── users ────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id                       SERIAL PRIMARY KEY,
  "openId"                 VARCHAR(64)  NOT NULL UNIQUE,
  name                     TEXT,
  email                    VARCHAR(320),
  "loginMethod"            VARCHAR(64),
  phone                    VARCHAR(30),
  role                     user_role    NOT NULL DEFAULT 'user',
  "memberRole"             member_role  NOT NULL DEFAULT 'consumer',
  "membershipDiscountRate" INTEGER      NOT NULL DEFAULT 0,
  "proVerificationStatus"  pro_verification_status NOT NULL DEFAULT 'none',
  "createdAt"              TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  "updatedAt"              TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  "lastSignedIn"           TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  "passwordHash"           VARCHAR(255),
  "emailVerified"          BOOLEAN      NOT NULL DEFAULT FALSE,
  "resetToken"             VARCHAR(128),
  "resetTokenExpiresAt"    TIMESTAMPTZ
);

-- ─── business_verifications ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS business_verifications (
  id               SERIAL PRIMARY KEY,
  "userId"         INTEGER      NOT NULL REFERENCES users(id),
  "businessNumber" VARCHAR(30)  NOT NULL,
  "businessName"   VARCHAR(200) NOT NULL,
  "contactPhone"   VARCHAR(30),
  "fileUrl"        TEXT         NOT NULL,
  "fileKey"        TEXT         NOT NULL,
  "fileName"       VARCHAR(300),
  status           verification_status NOT NULL DEFAULT 'pending',
  "rejectReason"   TEXT,
  "submittedAt"    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  "reviewedAt"     TIMESTAMPTZ,
  "createdAt"      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  "updatedAt"      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- ─── products ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS products (
  id                      SERIAL PRIMARY KEY,
  slug                    VARCHAR(100)  NOT NULL UNIQUE,
  name                    VARCHAR(200)  NOT NULL,
  description             TEXT,
  "priceConsumer"         NUMERIC(12,0) NOT NULL,
  "pricePro"              NUMERIC(12,0) NOT NULL,
  "priceMembership"       NUMERIC(12,0),
  "isProOnly"             BOOLEAN       NOT NULL DEFAULT FALSE,
  stock                   INTEGER       NOT NULL DEFAULT 999,
  "imageUrl"              TEXT,
  "isActive"              BOOLEAN       NOT NULL DEFAULT TRUE,
  visible                 BOOLEAN       NOT NULL DEFAULT TRUE,
  "productCode"           VARCHAR(50),
  "productStatus"         product_status DEFAULT 'new',
  "summaryDescription"    VARCHAR(255),
  "shortDescription"      TEXT,
  "priceSupply"           NUMERIC(12,0),
  "priceConsumerOriginal" NUMERIC(12,0),
  "taxType"               tax_type      DEFAULT 'taxable',
  "taxRate"               NUMERIC(5,2)  DEFAULT 10.00,
  "shippingType"          shipping_type DEFAULT 'direct',
  weight                  NUMERIC(8,2)  DEFAULT 1.00,
  manufacturer            VARCHAR(100),
  brand                   VARCHAR(100),
  origin                  VARCHAR(100),
  "seoTitle"              VARCHAR(200),
  "seoDescription"        TEXT,
  "seoKeywords"           VARCHAR(500),
  "seoImageAlt"           VARCHAR(200),
  "adminMemo"             TEXT,
  features                TEXT,          -- JSON: [{icon, title, desc}]
  "howToUse"              TEXT,
  ingredients             TEXT,
  "thumbnailUrl"          TEXT,
  "detailPageUrl"         VARCHAR(500),
  "sortOrder"             INTEGER       NOT NULL DEFAULT 0,
  "isRecommended"         BOOLEAN       NOT NULL DEFAULT FALSE,
  "isNew"                 BOOLEAN       NOT NULL DEFAULT FALSE,
  "createdAt"             TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  "updatedAt"             TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

-- ─── design_files ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS design_files (
  id             SERIAL PRIMARY KEY,
  "fileName"     VARCHAR(300) NOT NULL,
  "fileKey"      TEXT         NOT NULL,
  "fileUrl"      TEXT         NOT NULL,
  "thumbnailUrl" TEXT,                    -- 300px 썸네일 (자동 리사이징)
  "mediumUrl"    TEXT,                    -- 800px 중간 사이즈 (자동 리사이징)
  "mimeType"     VARCHAR(100),
  "fileSize"     INTEGER,
  folder         VARCHAR(200) DEFAULT 'ROOT',
  "uploadedBy"   INTEGER,
  "createdAt"    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- ─── design_folders ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS design_folders (
  id         SERIAL PRIMARY KEY,
  name       VARCHAR(200) NOT NULL,
  "parentId" INTEGER,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── orders ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS orders (
  id                      SERIAL PRIMARY KEY,
  "orderId"               VARCHAR(100)  NOT NULL UNIQUE,
  "userId"                INTEGER       NOT NULL REFERENCES users(id),
  "userRoleSnapshot"      user_role_snapshot NOT NULL,
  "proStatusSnapshot"     pro_status_snapshot NOT NULL,
  "totalAmount"           NUMERIC(12,0) NOT NULL,
  status                  order_status  NOT NULL DEFAULT 'created',
  "shippingStatus"        shipping_status NOT NULL DEFAULT 'none',
  "courierCode"           VARCHAR(50),
  "courierName"           VARCHAR(100),
  "trackingNumber"        VARCHAR(100),
  "shippedAt"             TIMESTAMPTZ,
  "deliveredAt"           TIMESTAMPTZ,
  "recipientName"         VARCHAR(100),
  "recipientPhone"        VARCHAR(30),
  "shippingAddress"       TEXT,
  "shippingAddressDetail" TEXT,
  "shippingZipCode"       VARCHAR(10),
  "shippingMemo"          TEXT,
  "externalOrderId"       VARCHAR(200),
  "thirdPartyStatus"      third_party_status NOT NULL DEFAULT 'none',
  "thirdPartySyncedAt"    TIMESTAMPTZ,
  "adminMemo"             TEXT,
  "paymentKey"            VARCHAR(200),
  "paymentMethod"         VARCHAR(50),
  "paidAt"                TIMESTAMPTZ,
  "orderName"             VARCHAR(300),
  "createdAt"             TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  "updatedAt"             TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

-- ─── order_items ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS order_items (
  id            SERIAL PRIMARY KEY,
  "orderId"     INTEGER       NOT NULL REFERENCES orders(id),
  "productId"   INTEGER       NOT NULL REFERENCES products(id),
  "productName" VARCHAR(200)  NOT NULL,
  quantity      INTEGER       NOT NULL,
  "unitPrice"   NUMERIC(12,0) NOT NULL,
  subtotal      NUMERIC(12,0) NOT NULL,
  "optionLabel" VARCHAR(300),
  "createdAt"   TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

-- ─── admin_audit_logs ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS admin_audit_logs (
  id          SERIAL PRIMARY KEY,
  "adminId"   INTEGER     NOT NULL REFERENCES users(id),
  action      VARCHAR(100) NOT NULL,
  "targetType" VARCHAR(50),
  "targetId"  INTEGER,
  detail      TEXT,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── gallery_posts ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS gallery_posts (
  id           SERIAL PRIMARY KEY,
  title        VARCHAR(300) NOT NULL,
  content      TEXT,
  "imageUrl"   TEXT,
  "imageKey"   VARCHAR(500),
  "isPublished" BOOLEAN     NOT NULL DEFAULT TRUE,
  "sortOrder"  INTEGER      NOT NULL DEFAULT 0,
  "authorId"   INTEGER      REFERENCES users(id),
  "createdAt"  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  "updatedAt"  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- ─── magazine_posts ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS magazine_posts (
  id           SERIAL PRIMARY KEY,
  title        VARCHAR(300) NOT NULL,
  content      TEXT,
  "imageUrl"   TEXT,
  "imageKey"   VARCHAR(500),
  "isPublished" BOOLEAN     NOT NULL DEFAULT TRUE,
  "sortOrder"  INTEGER      NOT NULL DEFAULT 0,
  "authorId"   INTEGER      REFERENCES users(id),
  "createdAt"  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  "updatedAt"  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- ─── post_images ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS post_images (
  id          SERIAL PRIMARY KEY,
  "postType"  VARCHAR(20)  NOT NULL,  -- 'gallery' | 'magazine'
  "postId"    INTEGER      NOT NULL,
  "imageUrl"  TEXT         NOT NULL,
  "imageKey"  VARCHAR(500),
  "sortOrder" INTEGER      NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- ─── popups ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS popups (
  id           SERIAL PRIMARY KEY,
  title        VARCHAR(200) NOT NULL,
  content      TEXT,
  "imageUrl"   TEXT,
  "linkUrl"    TEXT,
  "isActive"   BOOLEAN      NOT NULL DEFAULT TRUE,
  "startDate"  TIMESTAMPTZ,
  "endDate"    TIMESTAMPTZ,
  "positionX"  INTEGER      NOT NULL DEFAULT 0,
  "positionY"  INTEGER      NOT NULL DEFAULT 0,
  width        INTEGER      NOT NULL DEFAULT 400,
  height       INTEGER      NOT NULL DEFAULT 300,
  "sortOrder"  INTEGER      NOT NULL DEFAULT 0,
  "createdAt"  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  "updatedAt"  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- ─── page_views ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS page_views (
  id          SERIAL PRIMARY KEY,
  path        VARCHAR(500) NOT NULL,
  "userId"    INTEGER      REFERENCES users(id),
  "ipAddress" VARCHAR(45),
  "userAgent" TEXT,
  "referer"   TEXT,
  "createdAt" TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- ─── order_cancellations ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS order_cancellations (
  id              SERIAL PRIMARY KEY,
  "orderId"       INTEGER     NOT NULL REFERENCES orders(id),
  "requestedBy"   INTEGER     NOT NULL REFERENCES users(id),
  reason          TEXT,
  "adminMemo"     TEXT,
  status          cancellation_status NOT NULL DEFAULT 'requested',
  "processedBy"   INTEGER     REFERENCES users(id),
  "processedAt"   TIMESTAMPTZ,
  "refundAmount"  NUMERIC(12,0),
  "createdAt"     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt"     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── order_exchanges ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS order_exchanges (
  id              SERIAL PRIMARY KEY,
  "orderId"       INTEGER     NOT NULL REFERENCES orders(id),
  "requestedBy"   INTEGER     NOT NULL REFERENCES users(id),
  reason          TEXT,
  "adminMemo"     TEXT,
  status          exchange_status NOT NULL DEFAULT 'requested',
  "processedBy"   INTEGER     REFERENCES users(id),
  "processedAt"   TIMESTAMPTZ,
  "createdAt"     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt"     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── order_returns ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS order_returns (
  id              SERIAL PRIMARY KEY,
  "orderId"       INTEGER     NOT NULL REFERENCES orders(id),
  "requestedBy"   INTEGER     NOT NULL REFERENCES users(id),
  reason          TEXT,
  "adminMemo"     TEXT,
  status          return_status NOT NULL DEFAULT 'requested',
  "processedBy"   INTEGER     REFERENCES users(id),
  "processedAt"   TIMESTAMPTZ,
  "createdAt"     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt"     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── order_refunds ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS order_refunds (
  id              SERIAL PRIMARY KEY,
  "orderId"       INTEGER     NOT NULL REFERENCES orders(id),
  "requestedBy"   INTEGER     NOT NULL REFERENCES users(id),
  reason          TEXT,
  "adminMemo"     TEXT,
  status          refund_status NOT NULL DEFAULT 'requested',
  "processedBy"   INTEGER     REFERENCES users(id),
  "processedAt"   TIMESTAMPTZ,
  "refundAmount"  NUMERIC(12,0),
  "createdAt"     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt"     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── card_cancellations ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS card_cancellations (
  id              SERIAL PRIMARY KEY,
  "orderId"       INTEGER     NOT NULL REFERENCES orders(id),
  "paymentKey"    VARCHAR(200),
  "cancelAmount"  NUMERIC(12,0) NOT NULL,
  "cancelReason"  TEXT,
  status          card_cancellation_status NOT NULL DEFAULT 'requested',
  "pgResponse"    TEXT,
  "createdAt"     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt"     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── third_party_logs ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS third_party_logs (
  id           SERIAL PRIMARY KEY,
  "orderId"    INTEGER      REFERENCES orders(id),
  action       VARCHAR(100) NOT NULL,
  provider     VARCHAR(100),
  payload      TEXT,
  result       third_party_result NOT NULL DEFAULT 'success',
  "errorMessage" TEXT,
  "createdAt"  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- ─── reviews ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS reviews (
  id              SERIAL PRIMARY KEY,
  category        review_category NOT NULL DEFAULT 'etc',
  "categoryLabel" VARCHAR(100),
  "imageUrl"      TEXT         NOT NULL,
  "imageKey"      VARCHAR(500),
  title           VARCHAR(200),
  description     TEXT,
  "sortOrder"     INTEGER      NOT NULL DEFAULT 0,
  "isPublished"   BOOLEAN      NOT NULL DEFAULT TRUE,
  "authorId"      INTEGER      REFERENCES users(id),
  "createdAt"     TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  "updatedAt"     TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- ─── certified_instructors ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS certified_instructors (
  id            SERIAL PRIMARY KEY,
  "imageUrl"    TEXT         NOT NULL,
  "imageKey"    VARCHAR(500),
  name          VARCHAR(200),
  description   TEXT,
  "sortOrder"   INTEGER      NOT NULL DEFAULT 0,
  "isPublished" BOOLEAN      NOT NULL DEFAULT TRUE,
  "authorId"    INTEGER      REFERENCES users(id),
  "createdAt"   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  "updatedAt"   TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- ─── coupons ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS coupons (
  id                    SERIAL PRIMARY KEY,
  name                  VARCHAR(200) NOT NULL,
  description           TEXT,
  "benefitType"         VARCHAR(50)  NOT NULL DEFAULT 'discount_rate',
  "benefitValue"        INTEGER      NOT NULL DEFAULT 0,
  "issueType"           VARCHAR(50)  NOT NULL DEFAULT 'customer_download',
  "targetMember"        VARCHAR(20)  NOT NULL DEFAULT 'all',
  "displayTiming"       VARCHAR(20)  NOT NULL DEFAULT 'immediate',
  "scheduledAt"         TIMESTAMPTZ,
  "startDate"           TIMESTAMPTZ,
  "endDate"             TIMESTAMPTZ,
  "periodType"          VARCHAR(30)  NOT NULL DEFAULT 'fixed',
  "validDays"           INTEGER,
  "usePc"               BOOLEAN      NOT NULL DEFAULT TRUE,
  "useMobile"           BOOLEAN      NOT NULL DEFAULT TRUE,
  "applyScope"          VARCHAR(20)  NOT NULL DEFAULT 'order',
  "productScope"        VARCHAR(20)  NOT NULL DEFAULT 'all',
  "minAmountType"       VARCHAR(30)  NOT NULL DEFAULT 'none',
  "minAmount"           INTEGER      NOT NULL DEFAULT 0,
  "calcBasis"           VARCHAR(30)  NOT NULL DEFAULT 'before_discount',
  "maxUsagePerOrder"    INTEGER      NOT NULL DEFAULT 1,
  "paymentMethodLimit"  VARCHAR(20)  NOT NULL DEFAULT 'none',
  "imageType"           VARCHAR(20)  NOT NULL DEFAULT 'default',
  "imageUrl"            TEXT,
  "notifyOnLogin"       BOOLEAN      NOT NULL DEFAULT FALSE,
  "sendSms"             BOOLEAN      NOT NULL DEFAULT FALSE,
  "sendEmail"           BOOLEAN      NOT NULL DEFAULT FALSE,
  status                VARCHAR(20)  NOT NULL DEFAULT 'active',
  "totalIssued"         INTEGER      NOT NULL DEFAULT 0,
  "authorId"            INTEGER      REFERENCES users(id),
  "createdAt"           TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  "updatedAt"           TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- ─── coupon_issues ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS coupon_issues (
  id              SERIAL PRIMARY KEY,
  "couponNumber"  VARCHAR(30)  NOT NULL UNIQUE,
  "couponId"      INTEGER      NOT NULL REFERENCES coupons(id),
  "userId"        INTEGER      REFERENCES users(id),
  "isUsed"        BOOLEAN      NOT NULL DEFAULT FALSE,
  "usedAt"        TIMESTAMPTZ,
  "orderId"       INTEGER,
  "isDeleted"     BOOLEAN      NOT NULL DEFAULT FALSE,
  "createdAt"     TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- ─── discount_codes ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS discount_codes (
  id                      SERIAL PRIMARY KEY,
  name                    VARCHAR(200) NOT NULL,
  code                    VARCHAR(100) NOT NULL UNIQUE,
  "discountRate"          INTEGER      NOT NULL DEFAULT 0,
  "truncateUnit"          INTEGER      NOT NULL DEFAULT 0,
  "maxDiscountPerProduct" INTEGER,
  "startDate"             TIMESTAMPTZ,
  "endDate"               TIMESTAMPTZ,
  "applyScope"            VARCHAR(20)  NOT NULL DEFAULT 'all',
  "minOrderAmountType"    VARCHAR(20)  NOT NULL DEFAULT 'none',
  "minOrderAmount"        INTEGER      NOT NULL DEFAULT 0,
  "maxUsageType"          VARCHAR(20)  NOT NULL DEFAULT 'none',
  "maxUsageCount"         INTEGER,
  "targetType"            VARCHAR(20)  NOT NULL DEFAULT 'none',
  "samePersonLimitType"   VARCHAR(20)  NOT NULL DEFAULT 'none',
  "samePersonLimitCount"  INTEGER,
  "usedCount"             INTEGER      NOT NULL DEFAULT 0,
  "authorId"              INTEGER      REFERENCES users(id),
  "createdAt"             TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  "updatedAt"             TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- ─── remind_alerts ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS remind_alerts (
  id                SERIAL PRIMARY KEY,
  name              VARCHAR(200) NOT NULL,
  "alertType"       VARCHAR(50)  NOT NULL DEFAULT 'cart',
  "isActive"        BOOLEAN      NOT NULL DEFAULT TRUE,
  channel           VARCHAR(10)  NOT NULL DEFAULT 'email',
  "startDate"       TIMESTAMPTZ,
  "endDate"         TIMESTAMPTZ,
  frequency         VARCHAR(20)  NOT NULL DEFAULT 'weekly',
  "sendDayOfWeek"   INTEGER      NOT NULL DEFAULT 5,
  "sendHour"        INTEGER      NOT NULL DEFAULT 9,
  "targetType"      VARCHAR(50)  NOT NULL DEFAULT 'all',
  "targetDays"      INTEGER      NOT NULL DEFAULT 30,
  "sendToOptOut"    BOOLEAN      NOT NULL DEFAULT FALSE,
  "sendToSpecial"   BOOLEAN      NOT NULL DEFAULT TRUE,
  "sendToBad"       BOOLEAN      NOT NULL DEFAULT TRUE,
  "senderName"      VARCHAR(100),
  "senderEmail"     VARCHAR(200),
  "emailSubject"    VARCHAR(300),
  "emailBody"       TEXT,
  "benefitEnabled"  BOOLEAN      NOT NULL DEFAULT FALSE,
  "benefitDays"     INTEGER      NOT NULL DEFAULT 30,
  "benefitTrigger"  VARCHAR(30)  NOT NULL DEFAULT 'order_complete',
  "benefitContent"  VARCHAR(30)  NOT NULL DEFAULT 'coupon',
  "benefitCouponId" INTEGER      REFERENCES coupons(id),
  "totalSent"       INTEGER      NOT NULL DEFAULT 0,
  "authorId"        INTEGER      REFERENCES users(id),
  "createdAt"       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  "updatedAt"       TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- ─── excel_templates ──────────────────────────────────────────────────────────
-- 주문 엑셀 다운로드 양식 관리
CREATE TABLE IF NOT EXISTS "excelTemplates" (
  id            SERIAL PRIMARY KEY,
  name          VARCHAR(100) NOT NULL,
  description   TEXT,
  "isDefault"   BOOLEAN      NOT NULL DEFAULT FALSE,
  columns       TEXT         NOT NULL,  -- JSON: [{key, label, order}]
  "sortConfig"  TEXT,                   -- JSON: [{field, direction}]
  "authorId"    INTEGER      REFERENCES users(id),
  "createdAt"   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  "updatedAt"   TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- ─── 기본 엑셀 양식 시드 데이터 ─────────────────────────────────────────────
INSERT INTO "excelTemplates" (name, description, "isDefault", columns, "sortConfig", "authorId")
VALUES 
(
  '기본양식(주문번호기준)',
  '주문번호 기준으로 주문을 조회하는 기본 양식입니다.',
  true,
  '[{"key":"orderId","label":"주문번호","order":1},{"key":"createdAt","label":"주문일","order":2},{"key":"orderName","label":"주문명","order":3},{"key":"userName","label":"주문자","order":4},{"key":"userEmail","label":"이메일","order":5},{"key":"recipientName","label":"수령인","order":6},{"key":"recipientPhone","label":"수령인 연락처","order":7},{"key":"recipientAddress","label":"배송지","order":8},{"key":"totalAmount","label":"총 상품 구매금액","order":9},{"key":"paidAmount","label":"총 실결제금액","order":10},{"key":"paymentMethod","label":"결제수단","order":11},{"key":"status","label":"결제상태","order":12},{"key":"shippingStatus","label":"배송상태","order":13}]',
  '[{"field":"createdAt","direction":"desc"}]',
  NULL
),
(
  '기본양식(품목주문기준)',
  '품목(상품) 기준으로 주문을 조회하는 기본 양식입니다.',
  true,
  '[{"key":"orderId","label":"주문번호","order":1},{"key":"createdAt","label":"주문일","order":2},{"key":"productName","label":"상품명","order":3},{"key":"productOption","label":"옵션","order":4},{"key":"quantity","label":"수량","order":5},{"key":"unitPrice","label":"단가","order":6},{"key":"itemTotal","label":"품목 금액","order":7},{"key":"userName","label":"주문자","order":8},{"key":"userEmail","label":"이메일","order":9},{"key":"recipientName","label":"수령인","order":10},{"key":"recipientPhone","label":"수령인 연락처","order":11},{"key":"recipientAddress","label":"배송지","order":12},{"key":"status","label":"결제상태","order":13},{"key":"shippingStatus","label":"배송상태","order":14}]',
  '[{"field":"createdAt","direction":"desc"}]',
  NULL
);

-- ─── 인덱스 ───────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_users_open_id        ON users("openId");
CREATE INDEX IF NOT EXISTS idx_users_email          ON users(email);
CREATE INDEX IF NOT EXISTS idx_orders_order_id      ON orders("orderId");
CREATE INDEX IF NOT EXISTS idx_orders_user_id       ON orders("userId");
CREATE INDEX IF NOT EXISTS idx_orders_status        ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at    ON orders("createdAt");
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items("orderId");
CREATE INDEX IF NOT EXISTS idx_products_slug        ON products(slug);
CREATE INDEX IF NOT EXISTS idx_products_visible     ON products(visible);
CREATE INDEX IF NOT EXISTS idx_design_files_folder  ON design_files(folder);
CREATE INDEX IF NOT EXISTS idx_reviews_category     ON reviews(category);
CREATE INDEX IF NOT EXISTS idx_page_views_path      ON page_views(path);
CREATE INDEX IF NOT EXISTS idx_page_views_created   ON page_views("createdAt");
CREATE INDEX IF NOT EXISTS idx_biz_verif_user_id    ON business_verifications("userId");
CREATE INDEX IF NOT EXISTS idx_coupon_issues_coupon ON coupon_issues("couponId");
CREATE INDEX IF NOT EXISTS idx_coupon_issues_user   ON coupon_issues("userId");

-- ─── updatedAt 자동 갱신 트리거 함수 ─────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW."updatedAt" = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 각 테이블에 트리거 적용
CREATE TRIGGER trg_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_biz_verif_updated_at
  BEFORE UPDATE ON business_verifications
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_products_updated_at
  BEFORE UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_orders_updated_at
  BEFORE UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_gallery_posts_updated_at
  BEFORE UPDATE ON gallery_posts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_magazine_posts_updated_at
  BEFORE UPDATE ON magazine_posts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_popups_updated_at
  BEFORE UPDATE ON popups
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_order_cancellations_updated_at
  BEFORE UPDATE ON order_cancellations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_order_exchanges_updated_at
  BEFORE UPDATE ON order_exchanges
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_order_returns_updated_at
  BEFORE UPDATE ON order_returns
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_order_refunds_updated_at
  BEFORE UPDATE ON order_refunds
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_card_cancellations_updated_at
  BEFORE UPDATE ON card_cancellations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_reviews_updated_at
  BEFORE UPDATE ON reviews
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_certified_instructors_updated_at
  BEFORE UPDATE ON certified_instructors
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_coupons_updated_at
  BEFORE UPDATE ON coupons
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_discount_codes_updated_at
  BEFORE UPDATE ON discount_codes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_remind_alerts_updated_at
  BEFORE UPDATE ON remind_alerts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_excel_templates_updated_at
  BEFORE UPDATE ON "excelTemplates"
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ─── Row Level Security (RLS) 기본 설정 ──────────────────────────────────────
-- 주의: 실제 운영 환경에서는 RLS 정책을 세밀하게 설정하세요.
-- 아래는 서비스 롤(service_role)에서만 접근 가능하도록 기본 설정합니다.

ALTER TABLE users                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_verifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE products               ENABLE ROW LEVEL SECURITY;
ALTER TABLE design_files           ENABLE ROW LEVEL SECURITY;
ALTER TABLE design_folders         ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items            ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_audit_logs       ENABLE ROW LEVEL SECURITY;
ALTER TABLE gallery_posts          ENABLE ROW LEVEL SECURITY;
ALTER TABLE magazine_posts         ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_images            ENABLE ROW LEVEL SECURITY;
ALTER TABLE popups                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE page_views             ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_cancellations    ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_exchanges        ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_returns          ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_refunds          ENABLE ROW LEVEL SECURITY;
ALTER TABLE card_cancellations     ENABLE ROW LEVEL SECURITY;
ALTER TABLE third_party_logs       ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews                ENABLE ROW LEVEL SECURITY;
ALTER TABLE certified_instructors  ENABLE ROW LEVEL SECURITY;
ALTER TABLE coupons                ENABLE ROW LEVEL SECURITY;
ALTER TABLE coupon_issues          ENABLE ROW LEVEL SECURITY;
ALTER TABLE discount_codes         ENABLE ROW LEVEL SECURITY;
ALTER TABLE remind_alerts          ENABLE ROW LEVEL SECURITY;
ALTER TABLE "excelTemplates"       ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 완료: 총 27개 테이블, 17개 트리거, 16개 인덱스 생성
-- ============================================================
