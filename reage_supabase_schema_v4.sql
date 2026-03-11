-- =============================================================================
-- REAGE Supabase Migration SQL v4
-- 작성일: 2026-03-11
-- 구성: v3 전체 구조 + 이번 세션 추가 테이블 (design_files, design_folders, excelTemplates)
-- =============================================================================
-- 실행 방법: Supabase SQL Editor에서 이 파일 전체를 한 번에 실행하세요.
-- 재실행 안전: 모든 구문이 IF NOT EXISTS / ON CONFLICT 처리됨
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 0. ENUM 타입 정의 (이미 존재하면 건너뜀)
-- ---------------------------------------------------------------------------
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
    CREATE TYPE user_role AS ENUM ('user', 'admin');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'member_type') THEN
    CREATE TYPE member_type AS ENUM ('consumer', 'professional', 'membership');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'pro_verification_status') THEN
    CREATE TYPE pro_verification_status AS ENUM ('none', 'pending', 'approved', 'rejected');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'inquiry_type') THEN
    CREATE TYPE inquiry_type AS ENUM ('trial', 'introduction', 'education');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'inquiry_status') THEN
    CREATE TYPE inquiry_status AS ENUM ('received', 'contacted', 'closed');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'review_category') THEN
    CREATE TYPE review_category AS ENUM ('before_after', 'device', 'education', 'event', 'etc');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'gallery_category') THEN
    CREATE TYPE gallery_category AS ENUM ('salon', 'education', 'japan', 'expo', 'product', 'instructor', 'etc');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'magazine_category') THEN
    CREATE TYPE magazine_category AS ENUM ('japan', 'korea', 'ai_tech', 'trend', 'etc');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'order_status') THEN
    CREATE TYPE order_status AS ENUM (
      'pending', 'paid', 'preparing', 'shipped', 'completed',
      'cancel_requested', 'cancelled',
      'return_requested', 'returned',
      'exchange_requested', 'exchanged',
      'refund_requested', 'refunded'
    );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'payment_status') THEN
    CREATE TYPE payment_status AS ENUM ('unpaid', 'paid', 'partial_refunded', 'fully_refunded', 'cancelled');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'shipping_status') THEN
    CREATE TYPE shipping_status AS ENUM ('pending_payment', 'ready', 'hold', 'shipping', 'delivered');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'cancel_status') THEN
    CREATE TYPE cancel_status AS ENUM ('requested', 'approved', 'rejected', 'completed');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'exchange_status') THEN
    CREATE TYPE exchange_status AS ENUM ('requested', 'pickup_scheduled', 'picked_up', 'reshipping', 'completed', 'rejected');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'return_status') THEN
    CREATE TYPE return_status AS ENUM ('requested', 'pickup_scheduled', 'picked_up', 'received', 'completed', 'rejected');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'refund_status') THEN
    CREATE TYPE refund_status AS ENUM ('pending', 'processing', 'completed', 'failed');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'refund_type') THEN
    CREATE TYPE refund_type AS ENUM ('full', 'partial');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'discount_type') THEN
    CREATE TYPE discount_type AS ENUM ('fixed', 'percent');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'coupon_issue_status') THEN
    CREATE TYPE coupon_issue_status AS ENUM ('issued', 'used', 'expired', 'cancelled');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'discount_target_type') THEN
    CREATE TYPE discount_target_type AS ENUM ('order', 'product', 'category');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'alert_channel') THEN
    CREATE TYPE alert_channel AS ENUM ('email', 'sms', 'alimtalk', 'push');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'alert_target_type') THEN
    CREATE TYPE alert_target_type AS ENUM ('order', 'inquiry', 'marketing', 'system');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'alert_status') THEN
    CREATE TYPE alert_status AS ENUM ('queued', 'sent', 'failed', 'cancelled');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'integration_type') THEN
    CREATE TYPE integration_type AS ENUM ('payment', 'crm', 'messaging', 'analytics', 'logistics', 'etc');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'third_party_status') THEN
    CREATE TYPE third_party_status AS ENUM ('success', 'failed', 'pending');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'product_category') THEN
    CREATE TYPE product_category AS ENUM ('cream', 'device', 'kit', 'supplement', 'etc');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'popup_device_type') THEN
    CREATE TYPE popup_device_type AS ENUM ('pc', 'mobile', 'all');
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 공통 updated_at 자동 갱신 함수
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- ---------------------------------------------------------------------------
-- 1. profiles — Supabase Auth 연동 사용자 프로필
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS profiles (
  id                      UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name                    VARCHAR(100),
  phone                   VARCHAR(30),
  email                   VARCHAR(320),
  role                    user_role NOT NULL DEFAULT 'user',
  member_type             member_type NOT NULL DEFAULT 'consumer',
  pro_verification_status pro_verification_status NOT NULL DEFAULT 'none',
  membership_grade        VARCHAR(50),
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO profiles (id, email, name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.raw_user_meta_data->>'full_name', '')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

DROP TRIGGER IF EXISTS profiles_updated_at ON profiles;
CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ---------------------------------------------------------------------------
-- 2. contact_inquiries — 문의 폼 3종 통합 (체험/도입/교육)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS contact_inquiries (
  id                      BIGSERIAL PRIMARY KEY,
  inquiry_type            inquiry_type NOT NULL,
  name                    VARCHAR(100) NOT NULL,
  phone                   VARCHAR(30) NOT NULL,
  shop_name               VARCHAR(200),
  message                 TEXT,
  status                  inquiry_status NOT NULL DEFAULT 'received',
  privacy_agreed          BOOLEAN NOT NULL DEFAULT FALSE,
  admin_memo              TEXT,
  preferred_date          DATE,
  region                  VARCHAR(100),
  business_stage          VARCHAR(100),
  education_program       VARCHAR(200),
  reage_experience_level  VARCHAR(100),
  source_page             VARCHAR(500),
  ip_hash                 VARCHAR(128),
  user_agent              TEXT,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DROP TRIGGER IF EXISTS contact_inquiries_updated_at ON contact_inquiries;
CREATE TRIGGER contact_inquiries_updated_at
  BEFORE UPDATE ON contact_inquiries
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE INDEX IF NOT EXISTS idx_contact_inquiries_type    ON contact_inquiries(inquiry_type);
CREATE INDEX IF NOT EXISTS idx_contact_inquiries_status  ON contact_inquiries(status);
CREATE INDEX IF NOT EXISTS idx_contact_inquiries_created ON contact_inquiries(created_at DESC);

-- ---------------------------------------------------------------------------
-- 3. experience_centers — 전국 체험센터 목록
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS experience_centers (
  id          BIGSERIAL PRIMARY KEY,
  name        VARCHAR(200) NOT NULL,
  region      VARCHAR(100) NOT NULL,
  address     VARCHAR(500),
  phone       VARCHAR(30),
  description TEXT,
  image_url   TEXT,
  image_key   VARCHAR(500),
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order  INTEGER NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DROP TRIGGER IF EXISTS experience_centers_updated_at ON experience_centers;
CREATE TRIGGER experience_centers_updated_at
  BEFORE UPDATE ON experience_centers
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE INDEX IF NOT EXISTS idx_experience_centers_region ON experience_centers(region);
CREATE INDEX IF NOT EXISTS idx_experience_centers_active ON experience_centers(is_active);

-- ---------------------------------------------------------------------------
-- 4. reviews — 후기 콘텐츠
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS reviews (
  id              BIGSERIAL PRIMARY KEY,
  category        review_category NOT NULL DEFAULT 'etc',
  title           VARCHAR(200),
  description     TEXT,
  image_url       TEXT,
  image_key       VARCHAR(500),
  reviewer_label  VARCHAR(100),
  rating          SMALLINT CHECK (rating BETWEEN 1 AND 5),
  is_published    BOOLEAN NOT NULL DEFAULT FALSE,
  sort_order      INTEGER NOT NULL DEFAULT 0,
  author_id       UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DROP TRIGGER IF EXISTS reviews_updated_at ON reviews;
CREATE TRIGGER reviews_updated_at
  BEFORE UPDATE ON reviews
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE INDEX IF NOT EXISTS idx_reviews_category  ON reviews(category);
CREATE INDEX IF NOT EXISTS idx_reviews_published ON reviews(is_published);
CREATE INDEX IF NOT EXISTS idx_reviews_sort      ON reviews(sort_order);

-- ---------------------------------------------------------------------------
-- 5. gallery_posts — 갤러리 포스트
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS gallery_posts (
  id              BIGSERIAL PRIMARY KEY,
  category        gallery_category NOT NULL DEFAULT 'etc',
  title           VARCHAR(300) NOT NULL,
  summary         TEXT,
  cover_image_url TEXT,
  cover_image_key VARCHAR(500),
  is_published    BOOLEAN NOT NULL DEFAULT FALSE,
  sort_order      INTEGER NOT NULL DEFAULT 0,
  view_count      INTEGER NOT NULL DEFAULT 0,
  author_id       UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DROP TRIGGER IF EXISTS gallery_posts_updated_at ON gallery_posts;
CREATE TRIGGER gallery_posts_updated_at
  BEFORE UPDATE ON gallery_posts
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE INDEX IF NOT EXISTS idx_gallery_posts_category   ON gallery_posts(category);
CREATE INDEX IF NOT EXISTS idx_gallery_posts_published  ON gallery_posts(is_published);
CREATE INDEX IF NOT EXISTS idx_gallery_posts_sort       ON gallery_posts(sort_order);
CREATE INDEX IF NOT EXISTS idx_gallery_posts_created    ON gallery_posts(created_at DESC);

-- ---------------------------------------------------------------------------
-- 6. gallery_images — 갤러리 이미지 (gallery_posts 1:N)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS gallery_images (
  id          BIGSERIAL PRIMARY KEY,
  post_id     BIGINT NOT NULL REFERENCES gallery_posts(id) ON DELETE CASCADE,
  image_url   TEXT NOT NULL,
  image_key   VARCHAR(500) NOT NULL,
  file_name   VARCHAR(300),
  alt_text    VARCHAR(300),
  sort_order  INTEGER NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_gallery_images_post ON gallery_images(post_id);
CREATE INDEX IF NOT EXISTS idx_gallery_images_sort ON gallery_images(post_id, sort_order);

-- ---------------------------------------------------------------------------
-- 7. magazine_posts — 매거진 포스트
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS magazine_posts (
  id              BIGSERIAL PRIMARY KEY,
  slug            VARCHAR(200) UNIQUE NOT NULL,
  title           VARCHAR(300) NOT NULL,
  subtitle        VARCHAR(500),
  excerpt         TEXT,
  content         TEXT,
  cover_image_url TEXT,
  cover_image_key VARCHAR(500),
  category        magazine_category NOT NULL DEFAULT 'etc',
  is_published    BOOLEAN NOT NULL DEFAULT FALSE,
  published_at    TIMESTAMPTZ,
  view_count      INTEGER NOT NULL DEFAULT 0,
  author_id       UUID REFERENCES profiles(id) ON DELETE SET NULL,
  seo_title       VARCHAR(200),
  seo_description VARCHAR(500),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DROP TRIGGER IF EXISTS magazine_posts_updated_at ON magazine_posts;
CREATE TRIGGER magazine_posts_updated_at
  BEFORE UPDATE ON magazine_posts
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE INDEX IF NOT EXISTS idx_magazine_posts_slug         ON magazine_posts(slug);
CREATE INDEX IF NOT EXISTS idx_magazine_posts_category     ON magazine_posts(category);
CREATE INDEX IF NOT EXISTS idx_magazine_posts_published    ON magazine_posts(is_published);
CREATE INDEX IF NOT EXISTS idx_magazine_posts_published_at ON magazine_posts(published_at DESC);

-- ---------------------------------------------------------------------------
-- 8. certified_instructors — 공인 강사 목록
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS certified_instructors (
  id              BIGSERIAL PRIMARY KEY,
  name            VARCHAR(100) NOT NULL,
  title           VARCHAR(200),
  bio             TEXT,
  image_url       TEXT,
  image_key       VARCHAR(500),
  region          VARCHAR(100),
  is_published    BOOLEAN NOT NULL DEFAULT FALSE,
  sort_order      INTEGER NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DROP TRIGGER IF EXISTS certified_instructors_updated_at ON certified_instructors;
CREATE TRIGGER certified_instructors_updated_at
  BEFORE UPDATE ON certified_instructors
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE INDEX IF NOT EXISTS idx_certified_instructors_published ON certified_instructors(is_published);
CREATE INDEX IF NOT EXISTS idx_certified_instructors_sort      ON certified_instructors(sort_order);

-- ---------------------------------------------------------------------------
-- 9. page_views — 페이지 뷰 로그
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS page_views (
  id          BIGSERIAL PRIMARY KEY,
  page_path   VARCHAR(500) NOT NULL,
  referrer    VARCHAR(500),
  user_agent  TEXT,
  ip_hash     VARCHAR(128),
  user_id     UUID REFERENCES profiles(id) ON DELETE SET NULL,
  device_type VARCHAR(20),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_page_views_path    ON page_views(page_path);
CREATE INDEX IF NOT EXISTS idx_page_views_created ON page_views(created_at DESC);

-- ---------------------------------------------------------------------------
-- 10. revenue_simulator_logs — 수익 시뮬레이터 사용 로그
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS revenue_simulator_logs (
  id                 BIGSERIAL PRIMARY KEY,
  sessions_per_day   INTEGER,
  price_per_session  INTEGER,
  working_days       INTEGER,
  calculated_monthly BIGINT,
  ip_hash            VARCHAR(128),
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_revenue_simulator_created ON revenue_simulator_logs(created_at DESC);

-- ---------------------------------------------------------------------------
-- 11. download_logs — 카탈로그 다운로드 추적
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS download_logs (
  id          BIGSERIAL PRIMARY KEY,
  file_name   VARCHAR(300) NOT NULL,
  file_key    VARCHAR(500),
  user_id     UUID REFERENCES profiles(id) ON DELETE SET NULL,
  ip_hash     VARCHAR(128),
  user_agent  TEXT,
  source_page VARCHAR(500),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_download_logs_file    ON download_logs(file_name);
CREATE INDEX IF NOT EXISTS idx_download_logs_created ON download_logs(created_at DESC);

-- ---------------------------------------------------------------------------
-- 12. business_verifications — 사업자 인증 서류
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS business_verifications (
  id                  BIGSERIAL PRIMARY KEY,
  user_id             UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  business_name       VARCHAR(200),
  business_number     VARCHAR(30),
  representative_name VARCHAR(100),
  doc_url             TEXT,
  doc_key             VARCHAR(500),
  status              pro_verification_status NOT NULL DEFAULT 'pending',
  admin_memo          TEXT,
  reviewed_by         UUID REFERENCES profiles(id) ON DELETE SET NULL,
  reviewed_at         TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DROP TRIGGER IF EXISTS business_verifications_updated_at ON business_verifications;
CREATE TRIGGER business_verifications_updated_at
  BEFORE UPDATE ON business_verifications
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE INDEX IF NOT EXISTS idx_business_verifications_user   ON business_verifications(user_id);
CREATE INDEX IF NOT EXISTS idx_business_verifications_status ON business_verifications(status);

-- ---------------------------------------------------------------------------
-- 13. popups — 팝업 관리
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS popups (
  id               BIGSERIAL PRIMARY KEY,
  title            VARCHAR(200) NOT NULL,
  image_url        TEXT,
  image_key        VARCHAR(500),
  link_url         VARCHAR(500),
  device_type      popup_device_type NOT NULL DEFAULT 'all',
  display_position VARCHAR(50) DEFAULT 'center',
  bottom_text      VARCHAR(200),
  is_active        BOOLEAN NOT NULL DEFAULT FALSE,
  starts_at        TIMESTAMPTZ,
  ends_at          TIMESTAMPTZ,
  sort_order       INTEGER NOT NULL DEFAULT 0,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DROP TRIGGER IF EXISTS popups_updated_at ON popups;
CREATE TRIGGER popups_updated_at
  BEFORE UPDATE ON popups
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE INDEX IF NOT EXISTS idx_popups_active ON popups(is_active);
CREATE INDEX IF NOT EXISTS idx_popups_dates  ON popups(starts_at, ends_at);

-- ---------------------------------------------------------------------------
-- 14. products — 상품 목록
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS products (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug              VARCHAR(200) UNIQUE NOT NULL,
  name              VARCHAR(200) NOT NULL,
  short_description VARCHAR(500),
  full_description  TEXT,
  category          product_category NOT NULL DEFAULT 'cream',
  price             INTEGER NOT NULL CHECK (price >= 0),
  sale_price        INTEGER CHECK (sale_price >= 0),
  thumbnail_url     TEXT,
  thumbnail_key     VARCHAR(500),
  is_active         BOOLEAN NOT NULL DEFAULT TRUE,
  is_featured       BOOLEAN NOT NULL DEFAULT FALSE,
  is_pro_only       BOOLEAN NOT NULL DEFAULT FALSE,
  stock_quantity    INTEGER,
  sort_order        INTEGER NOT NULL DEFAULT 0,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DROP TRIGGER IF EXISTS products_updated_at ON products;
CREATE TRIGGER products_updated_at
  BEFORE UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE INDEX IF NOT EXISTS idx_products_slug     ON products(slug);
CREATE INDEX IF NOT EXISTS idx_products_active   ON products(is_active);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
CREATE INDEX IF NOT EXISTS idx_products_featured ON products(is_featured);

-- ---------------------------------------------------------------------------
-- 15. orders — 주문
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS orders (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                 UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  order_number            VARCHAR(50) UNIQUE NOT NULL,
  status                  order_status NOT NULL DEFAULT 'pending',
  payment_status          payment_status NOT NULL DEFAULT 'unpaid',
  payment_method          VARCHAR(50),
  shipping_status         shipping_status NOT NULL DEFAULT 'pending_payment',
  subtotal_amount         INTEGER NOT NULL DEFAULT 0,
  discount_amount         INTEGER NOT NULL DEFAULT 0,
  shipping_amount         INTEGER NOT NULL DEFAULT 0,
  total_amount            INTEGER NOT NULL DEFAULT 0,
  recipient_name          VARCHAR(100),
  recipient_phone         VARCHAR(30),
  shipping_address        VARCHAR(500),
  shipping_detail_address VARCHAR(300),
  postal_code             VARCHAR(10),
  courier_name            VARCHAR(100),
  tracking_number         VARCHAR(100),
  external_order_id       VARCHAR(200),
  order_memo              TEXT,
  admin_memo              TEXT,
  toss_payment_key        VARCHAR(200),
  toss_order_id           VARCHAR(200),
  paid_at                 TIMESTAMPTZ,
  coupon_id               UUID,
  discount_code_id        UUID,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DROP TRIGGER IF EXISTS orders_updated_at ON orders;
CREATE TRIGGER orders_updated_at
  BEFORE UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE INDEX IF NOT EXISTS idx_orders_user            ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_number          ON orders(order_number);
CREATE INDEX IF NOT EXISTS idx_orders_status          ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_payment_status  ON orders(payment_status);
CREATE INDEX IF NOT EXISTS idx_orders_shipping_status ON orders(shipping_status);
CREATE INDEX IF NOT EXISTS idx_orders_created         ON orders(created_at DESC);

-- ---------------------------------------------------------------------------
-- 16. order_items — 주문 상품 항목
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS order_items (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id              UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id            UUID REFERENCES products(id) ON DELETE SET NULL,
  product_name_snapshot VARCHAR(200) NOT NULL,
  unit_price            INTEGER NOT NULL,
  quantity              INTEGER NOT NULL CHECK (quantity > 0),
  total_price           INTEGER NOT NULL,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_order_items_order   ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_product ON order_items(product_id);

-- ---------------------------------------------------------------------------
-- 17. order_cancellations — 주문 취소 관리
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS order_cancellations (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id      UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  reason        VARCHAR(200) NOT NULL,
  detail_reason TEXT,
  requested_by  VARCHAR(20) NOT NULL DEFAULT 'user' CHECK (requested_by IN ('user', 'admin')),
  status        cancel_status NOT NULL DEFAULT 'requested',
  approved_at   TIMESTAMPTZ,
  rejected_at   TIMESTAMPTZ,
  admin_memo    TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DROP TRIGGER IF EXISTS order_cancellations_updated_at ON order_cancellations;
CREATE TRIGGER order_cancellations_updated_at
  BEFORE UPDATE ON order_cancellations
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE INDEX IF NOT EXISTS idx_order_cancellations_order  ON order_cancellations(order_id);
CREATE INDEX IF NOT EXISTS idx_order_cancellations_status ON order_cancellations(status);

-- ---------------------------------------------------------------------------
-- 18. order_exchanges — 교환 관리
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS order_exchanges (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id      UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  reason        VARCHAR(200) NOT NULL,
  detail_reason TEXT,
  status        exchange_status NOT NULL DEFAULT 'requested',
  pickup_status VARCHAR(50),
  reship_status VARCHAR(50),
  admin_memo    TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DROP TRIGGER IF EXISTS order_exchanges_updated_at ON order_exchanges;
CREATE TRIGGER order_exchanges_updated_at
  BEFORE UPDATE ON order_exchanges
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE INDEX IF NOT EXISTS idx_order_exchanges_order  ON order_exchanges(order_id);
CREATE INDEX IF NOT EXISTS idx_order_exchanges_status ON order_exchanges(status);

-- ---------------------------------------------------------------------------
-- 19. order_returns — 반품 관리
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS order_returns (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id      UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  reason        VARCHAR(200) NOT NULL,
  detail_reason TEXT,
  status        return_status NOT NULL DEFAULT 'requested',
  pickup_status VARCHAR(50),
  received_at   TIMESTAMPTZ,
  admin_memo    TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DROP TRIGGER IF EXISTS order_returns_updated_at ON order_returns;
CREATE TRIGGER order_returns_updated_at
  BEFORE UPDATE ON order_returns
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE INDEX IF NOT EXISTS idx_order_returns_order  ON order_returns(order_id);
CREATE INDEX IF NOT EXISTS idx_order_returns_status ON order_returns(status);

-- ---------------------------------------------------------------------------
-- 20. order_refunds — 환불 관리
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS order_refunds (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id      UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  refund_type   refund_type NOT NULL DEFAULT 'full',
  refund_amount INTEGER NOT NULL CHECK (refund_amount > 0),
  refund_method VARCHAR(50),
  refund_status refund_status NOT NULL DEFAULT 'pending',
  processed_at  TIMESTAMPTZ,
  admin_memo    TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DROP TRIGGER IF EXISTS order_refunds_updated_at ON order_refunds;
CREATE TRIGGER order_refunds_updated_at
  BEFORE UPDATE ON order_refunds
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE INDEX IF NOT EXISTS idx_order_refunds_order  ON order_refunds(order_id);
CREATE INDEX IF NOT EXISTS idx_order_refunds_status ON order_refunds(refund_status);

-- ---------------------------------------------------------------------------
-- 21. card_cancellations — PG사 카드 취소 로그
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS card_cancellations (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id         UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  pg_provider      VARCHAR(50) NOT NULL,
  transaction_id   VARCHAR(200),
  cancel_amount    INTEGER NOT NULL,
  cancel_status    VARCHAR(50) NOT NULL DEFAULT 'requested',
  response_code    VARCHAR(50),
  response_message TEXT,
  requested_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  processed_at     TIMESTAMPTZ,
  raw_payload      JSONB
);

CREATE INDEX IF NOT EXISTS idx_card_cancellations_order     ON card_cancellations(order_id);
CREATE INDEX IF NOT EXISTS idx_card_cancellations_requested ON card_cancellations(requested_at DESC);

-- ---------------------------------------------------------------------------
-- 22. coupons — 쿠폰 마스터
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS coupons (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code                VARCHAR(50) UNIQUE NOT NULL,
  name                VARCHAR(200) NOT NULL,
  description         TEXT,
  discount_type       discount_type NOT NULL,
  discount_value      INTEGER NOT NULL CHECK (discount_value > 0),
  min_order_amount    INTEGER,
  max_discount_amount INTEGER,
  starts_at           TIMESTAMPTZ NOT NULL,
  ends_at             TIMESTAMPTZ NOT NULL,
  is_active           BOOLEAN NOT NULL DEFAULT TRUE,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DROP TRIGGER IF EXISTS coupons_updated_at ON coupons;
CREATE TRIGGER coupons_updated_at
  BEFORE UPDATE ON coupons
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE INDEX IF NOT EXISTS idx_coupons_code   ON coupons(code);
CREATE INDEX IF NOT EXISTS idx_coupons_active ON coupons(is_active);
CREATE INDEX IF NOT EXISTS idx_coupons_dates  ON coupons(starts_at, ends_at);

-- ---------------------------------------------------------------------------
-- 23. coupon_issues — 쿠폰 발급 이력
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS coupon_issues (
  id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coupon_id UUID NOT NULL REFERENCES coupons(id) ON DELETE CASCADE,
  user_id   UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  issued_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  used_at   TIMESTAMPTZ,
  expired_at TIMESTAMPTZ,
  status    coupon_issue_status NOT NULL DEFAULT 'issued',
  UNIQUE (coupon_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_coupon_issues_user   ON coupon_issues(user_id);
CREATE INDEX IF NOT EXISTS idx_coupon_issues_coupon ON coupon_issues(coupon_id);
CREATE INDEX IF NOT EXISTS idx_coupon_issues_status ON coupon_issues(status);

-- ---------------------------------------------------------------------------
-- 24. discount_codes — 할인코드
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS discount_codes (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code           VARCHAR(50) UNIQUE NOT NULL,
  description    TEXT,
  discount_type  discount_type NOT NULL,
  discount_value INTEGER NOT NULL CHECK (discount_value > 0),
  target_type    discount_target_type NOT NULL DEFAULT 'order',
  target_id      UUID,
  usage_limit    INTEGER,
  used_count     INTEGER NOT NULL DEFAULT 0,
  starts_at      TIMESTAMPTZ NOT NULL,
  ends_at        TIMESTAMPTZ NOT NULL,
  is_active      BOOLEAN NOT NULL DEFAULT TRUE,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DROP TRIGGER IF EXISTS discount_codes_updated_at ON discount_codes;
CREATE TRIGGER discount_codes_updated_at
  BEFORE UPDATE ON discount_codes
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE INDEX IF NOT EXISTS idx_discount_codes_code   ON discount_codes(code);
CREATE INDEX IF NOT EXISTS idx_discount_codes_active ON discount_codes(is_active);

-- ---------------------------------------------------------------------------
-- 25. remind_alerts — 알림/마케팅 자동화 큐
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS remind_alerts (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID REFERENCES profiles(id) ON DELETE SET NULL,
  target_type  alert_target_type NOT NULL DEFAULT 'system',
  target_id    UUID,
  channel      alert_channel NOT NULL,
  template_key VARCHAR(100),
  recipient    VARCHAR(320) NOT NULL,
  title        VARCHAR(300),
  content      TEXT NOT NULL,
  status       alert_status NOT NULL DEFAULT 'queued',
  scheduled_at TIMESTAMPTZ,
  sent_at      TIMESTAMPTZ,
  fail_reason  TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DROP TRIGGER IF EXISTS remind_alerts_updated_at ON remind_alerts;
CREATE TRIGGER remind_alerts_updated_at
  BEFORE UPDATE ON remind_alerts
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE INDEX IF NOT EXISTS idx_remind_alerts_user      ON remind_alerts(user_id);
CREATE INDEX IF NOT EXISTS idx_remind_alerts_status    ON remind_alerts(status);
CREATE INDEX IF NOT EXISTS idx_remind_alerts_channel   ON remind_alerts(channel);
CREATE INDEX IF NOT EXISTS idx_remind_alerts_scheduled ON remind_alerts(scheduled_at);

-- ---------------------------------------------------------------------------
-- 26. third_party_logs — 외부 연동 로그
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS third_party_logs (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_name    VARCHAR(100) NOT NULL,
  integration_type integration_type NOT NULL DEFAULT 'etc',
  event_type       VARCHAR(100) NOT NULL,
  reference_id     VARCHAR(200),
  request_payload  JSONB,
  response_payload JSONB,
  status           third_party_status NOT NULL DEFAULT 'pending',
  error_message    TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_third_party_logs_provider ON third_party_logs(provider_name);
CREATE INDEX IF NOT EXISTS idx_third_party_logs_type     ON third_party_logs(integration_type);
CREATE INDEX IF NOT EXISTS idx_third_party_logs_status   ON third_party_logs(status);
CREATE INDEX IF NOT EXISTS idx_third_party_logs_created  ON third_party_logs(created_at DESC);

-- ---------------------------------------------------------------------------
-- 27. admin_audit_logs — 관리자 액션 추적 로그
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS admin_audit_logs (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  action_type   VARCHAR(100) NOT NULL,
  target_table  VARCHAR(100) NOT NULL,
  target_id     VARCHAR(200),
  before_data   JSONB,
  after_data    JSONB,
  ip_hash       VARCHAR(128),
  user_agent    TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_admin   ON admin_audit_logs(admin_user_id);
CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_table   ON admin_audit_logs(target_table);
CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_created ON admin_audit_logs(created_at DESC);

-- ---------------------------------------------------------------------------
-- orders FK 추가 (coupons, discount_codes 생성 후)
-- ---------------------------------------------------------------------------
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'fk_orders_coupon' AND table_name = 'orders'
  ) THEN
    ALTER TABLE orders
      ADD CONSTRAINT fk_orders_coupon
        FOREIGN KEY (coupon_id) REFERENCES coupons(id) ON DELETE SET NULL;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'fk_orders_discount_code' AND table_name = 'orders'
  ) THEN
    ALTER TABLE orders
      ADD CONSTRAINT fk_orders_discount_code
        FOREIGN KEY (discount_code_id) REFERENCES discount_codes(id) ON DELETE SET NULL;
  END IF;
END $$;

-- ===========================================================================
-- ★ 이번 세션 신규 추가 테이블 ★
-- ===========================================================================

-- ---------------------------------------------------------------------------
-- 28. design_folders — 디자인 보관함 폴더
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS design_folders (
  id         BIGSERIAL PRIMARY KEY,
  name       VARCHAR(200) NOT NULL,
  parent_id  BIGINT REFERENCES design_folders(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_design_folders_parent ON design_folders(parent_id);

-- ---------------------------------------------------------------------------
-- 29. design_files — 디자인 보관함 파일
--     thumbnailUrl: 300×300px 자동 크롭 썸네일 (목록/피드용)
--     medium_url:   800px 비율유지 중간 사이즈 (상품 상세페이지용)
--     file_url:     원본 파일 URL
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS design_files (
  id            BIGSERIAL PRIMARY KEY,
  file_name     VARCHAR(300) NOT NULL,
  file_key      TEXT NOT NULL,
  file_url      TEXT NOT NULL,
  thumbnail_url TEXT,        -- 300×300px 자동 크롭 썸네일
  medium_url    TEXT,        -- 800px 비율유지 중간 사이즈
  mime_type     VARCHAR(100),
  file_size     INTEGER,
  folder        VARCHAR(200) NOT NULL DEFAULT 'ROOT',
  uploaded_by   UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_design_files_folder     ON design_files(folder);
CREATE INDEX IF NOT EXISTS idx_design_files_uploaded   ON design_files(uploaded_by);
CREATE INDEX IF NOT EXISTS idx_design_files_created    ON design_files(created_at DESC);

-- ---------------------------------------------------------------------------
-- 30. excel_templates — 주문 엑셀 다운로드 양식 관리
--     columns: JSON 배열 [{key, label, order, width, enabled}]
--     sort_config: JSON 배열 [{field, direction}]
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS excel_templates (
  id          BIGSERIAL PRIMARY KEY,
  name        VARCHAR(100) NOT NULL,
  description TEXT,
  is_default  BOOLEAN NOT NULL DEFAULT FALSE,
  columns     TEXT NOT NULL,   -- JSON: [{key, label, order, width, enabled}]
  sort_config TEXT,            -- JSON: [{field, direction}]
  author_id   UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DROP TRIGGER IF EXISTS excel_templates_updated_at ON excel_templates;
CREATE TRIGGER excel_templates_updated_at
  BEFORE UPDATE ON excel_templates
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE INDEX IF NOT EXISTS idx_excel_templates_default ON excel_templates(is_default);

-- ---------------------------------------------------------------------------
-- 기본 엑셀 양식 시드 데이터 (중복 실행 안전)
-- ---------------------------------------------------------------------------
INSERT INTO excel_templates (name, description, is_default, columns, sort_config)
SELECT
  '기본양식(주문번호기준)',
  '주문번호 기준으로 주문을 조회하는 기본 양식입니다.',
  true,
  '[{"key":"order_number","label":"주문번호","order":1},{"key":"created_at","label":"주문일","order":2},{"key":"status","label":"결제상태","order":3},{"key":"recipient_name","label":"수령인","order":4},{"key":"recipient_phone","label":"수령인 연락처","order":5},{"key":"shipping_address","label":"배송지","order":6},{"key":"total_amount","label":"총 결제금액","order":7},{"key":"payment_method","label":"결제수단","order":8},{"key":"shipping_status","label":"배송상태","order":9},{"key":"tracking_number","label":"송장번호","order":10}]',
  '[{"field":"created_at","direction":"desc"}]'
WHERE NOT EXISTS (
  SELECT 1 FROM excel_templates WHERE name = '기본양식(주문번호기준)'
);

INSERT INTO excel_templates (name, description, is_default, columns, sort_config)
SELECT
  '기본양식(품목주문기준)',
  '품목(상품) 기준으로 주문을 조회하는 기본 양식입니다.',
  true,
  '[{"key":"order_number","label":"주문번호","order":1},{"key":"created_at","label":"주문일","order":2},{"key":"product_name_snapshot","label":"상품명","order":3},{"key":"quantity","label":"수량","order":4},{"key":"unit_price","label":"단가","order":5},{"key":"total_price","label":"품목 금액","order":6},{"key":"recipient_name","label":"수령인","order":7},{"key":"recipient_phone","label":"수령인 연락처","order":8},{"key":"shipping_address","label":"배송지","order":9},{"key":"status","label":"결제상태","order":10},{"key":"shipping_status","label":"배송상태","order":11}]',
  '[{"field":"created_at","direction":"desc"}]'
WHERE NOT EXISTS (
  SELECT 1 FROM excel_templates WHERE name = '기본양식(품목주문기준)'
);

-- ===========================================================================
-- RLS (Row Level Security) 정책
-- ===========================================================================

-- admin 여부 확인 헬퍼 함수
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
$$;

-- profiles
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "profiles_select_own"  ON profiles;
CREATE POLICY "profiles_select_own"  ON profiles FOR SELECT USING (auth.uid() = id OR is_admin());
DROP POLICY IF EXISTS "profiles_update_own"  ON profiles;
CREATE POLICY "profiles_update_own"  ON profiles FOR UPDATE USING (auth.uid() = id OR is_admin());
DROP POLICY IF EXISTS "profiles_insert_own"  ON profiles;
CREATE POLICY "profiles_insert_own"  ON profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- contact_inquiries
ALTER TABLE contact_inquiries ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "contact_inquiries_insert_anon"   ON contact_inquiries;
CREATE POLICY "contact_inquiries_insert_anon"   ON contact_inquiries FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "contact_inquiries_select_admin"  ON contact_inquiries;
CREATE POLICY "contact_inquiries_select_admin"  ON contact_inquiries FOR SELECT USING (is_admin());
DROP POLICY IF EXISTS "contact_inquiries_update_admin"  ON contact_inquiries;
CREATE POLICY "contact_inquiries_update_admin"  ON contact_inquiries FOR UPDATE USING (is_admin());
DROP POLICY IF EXISTS "contact_inquiries_delete_admin"  ON contact_inquiries;
CREATE POLICY "contact_inquiries_delete_admin"  ON contact_inquiries FOR DELETE USING (is_admin());

-- experience_centers
ALTER TABLE experience_centers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "experience_centers_select_public" ON experience_centers;
CREATE POLICY "experience_centers_select_public" ON experience_centers FOR SELECT USING (is_active = true OR is_admin());
DROP POLICY IF EXISTS "experience_centers_admin_all"     ON experience_centers;
CREATE POLICY "experience_centers_admin_all"     ON experience_centers FOR ALL USING (is_admin());

-- reviews
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "reviews_select_published" ON reviews;
CREATE POLICY "reviews_select_published" ON reviews FOR SELECT USING (is_published = true OR is_admin());
DROP POLICY IF EXISTS "reviews_admin_all"        ON reviews;
CREATE POLICY "reviews_admin_all"        ON reviews FOR ALL USING (is_admin());

-- gallery_posts
ALTER TABLE gallery_posts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "gallery_posts_select_published" ON gallery_posts;
CREATE POLICY "gallery_posts_select_published" ON gallery_posts FOR SELECT USING (is_published = true OR is_admin());
DROP POLICY IF EXISTS "gallery_posts_admin_all"        ON gallery_posts;
CREATE POLICY "gallery_posts_admin_all"        ON gallery_posts FOR ALL USING (is_admin());

-- gallery_images
ALTER TABLE gallery_images ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "gallery_images_select_public" ON gallery_images;
CREATE POLICY "gallery_images_select_public" ON gallery_images FOR SELECT USING (true);
DROP POLICY IF EXISTS "gallery_images_admin_all"     ON gallery_images;
CREATE POLICY "gallery_images_admin_all"     ON gallery_images FOR ALL USING (is_admin());

-- magazine_posts
ALTER TABLE magazine_posts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "magazine_posts_select_published" ON magazine_posts;
CREATE POLICY "magazine_posts_select_published" ON magazine_posts FOR SELECT USING (is_published = true OR is_admin());
DROP POLICY IF EXISTS "magazine_posts_admin_all"        ON magazine_posts;
CREATE POLICY "magazine_posts_admin_all"        ON magazine_posts FOR ALL USING (is_admin());

-- certified_instructors
ALTER TABLE certified_instructors ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "certified_instructors_select_published" ON certified_instructors;
CREATE POLICY "certified_instructors_select_published" ON certified_instructors FOR SELECT USING (is_published = true OR is_admin());
DROP POLICY IF EXISTS "certified_instructors_admin_all"        ON certified_instructors;
CREATE POLICY "certified_instructors_admin_all"        ON certified_instructors FOR ALL USING (is_admin());

-- page_views (비로그인 insert 허용)
ALTER TABLE page_views ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "page_views_insert_anon"  ON page_views;
CREATE POLICY "page_views_insert_anon"  ON page_views FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "page_views_select_admin" ON page_views;
CREATE POLICY "page_views_select_admin" ON page_views FOR SELECT USING (is_admin());

-- revenue_simulator_logs (비로그인 insert 허용)
ALTER TABLE revenue_simulator_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "revenue_simulator_logs_insert_anon"  ON revenue_simulator_logs;
CREATE POLICY "revenue_simulator_logs_insert_anon"  ON revenue_simulator_logs FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "revenue_simulator_logs_select_admin" ON revenue_simulator_logs;
CREATE POLICY "revenue_simulator_logs_select_admin" ON revenue_simulator_logs FOR SELECT USING (is_admin());

-- download_logs
ALTER TABLE download_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "download_logs_insert_anon"  ON download_logs;
CREATE POLICY "download_logs_insert_anon"  ON download_logs FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "download_logs_select_admin" ON download_logs;
CREATE POLICY "download_logs_select_admin" ON download_logs FOR SELECT USING (is_admin());

-- business_verifications
ALTER TABLE business_verifications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "business_verifications_select_own"   ON business_verifications;
CREATE POLICY "business_verifications_select_own"   ON business_verifications FOR SELECT USING (auth.uid() = user_id OR is_admin());
DROP POLICY IF EXISTS "business_verifications_insert_own"   ON business_verifications;
CREATE POLICY "business_verifications_insert_own"   ON business_verifications FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "business_verifications_admin_all"    ON business_verifications;
CREATE POLICY "business_verifications_admin_all"    ON business_verifications FOR ALL USING (is_admin());

-- popups
ALTER TABLE popups ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "popups_select_active" ON popups;
CREATE POLICY "popups_select_active" ON popups FOR SELECT USING (is_active = true OR is_admin());
DROP POLICY IF EXISTS "popups_admin_all"     ON popups;
CREATE POLICY "popups_admin_all"     ON popups FOR ALL USING (is_admin());

-- products
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "products_select_active" ON products;
CREATE POLICY "products_select_active" ON products FOR SELECT USING (is_active = true OR is_admin());
DROP POLICY IF EXISTS "products_admin_all"     ON products;
CREATE POLICY "products_admin_all"     ON products FOR ALL USING (is_admin());

-- orders
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "orders_select_own"   ON orders;
CREATE POLICY "orders_select_own"   ON orders FOR SELECT USING (auth.uid() = user_id OR is_admin());
DROP POLICY IF EXISTS "orders_insert_own"   ON orders;
CREATE POLICY "orders_insert_own"   ON orders FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "orders_update_admin" ON orders;
CREATE POLICY "orders_update_admin" ON orders FOR UPDATE USING (is_admin());
DROP POLICY IF EXISTS "orders_delete_admin" ON orders;
CREATE POLICY "orders_delete_admin" ON orders FOR DELETE USING (is_admin());

-- order_items
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "order_items_select_own"   ON order_items;
CREATE POLICY "order_items_select_own"   ON order_items FOR SELECT USING (
  EXISTS (SELECT 1 FROM orders WHERE orders.id = order_items.order_id AND (orders.user_id = auth.uid() OR is_admin()))
);
DROP POLICY IF EXISTS "order_items_admin_all"    ON order_items;
CREATE POLICY "order_items_admin_all"    ON order_items FOR ALL USING (is_admin());

-- order_cancellations / exchanges / returns / refunds / card_cancellations
ALTER TABLE order_cancellations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "order_cancellations_admin_all" ON order_cancellations;
CREATE POLICY "order_cancellations_admin_all" ON order_cancellations FOR ALL USING (is_admin());

ALTER TABLE order_exchanges ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "order_exchanges_admin_all" ON order_exchanges;
CREATE POLICY "order_exchanges_admin_all" ON order_exchanges FOR ALL USING (is_admin());

ALTER TABLE order_returns ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "order_returns_admin_all" ON order_returns;
CREATE POLICY "order_returns_admin_all" ON order_returns FOR ALL USING (is_admin());

ALTER TABLE order_refunds ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "order_refunds_admin_all" ON order_refunds;
CREATE POLICY "order_refunds_admin_all" ON order_refunds FOR ALL USING (is_admin());

ALTER TABLE card_cancellations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "card_cancellations_admin_all" ON card_cancellations;
CREATE POLICY "card_cancellations_admin_all" ON card_cancellations FOR ALL USING (is_admin());

-- coupons / coupon_issues / discount_codes
ALTER TABLE coupons ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "coupons_select_active" ON coupons;
CREATE POLICY "coupons_select_active" ON coupons FOR SELECT USING (
  (is_active = true AND starts_at <= NOW() AND ends_at >= NOW()) OR is_admin()
);
DROP POLICY IF EXISTS "coupons_admin_all" ON coupons;
CREATE POLICY "coupons_admin_all" ON coupons FOR ALL USING (is_admin());

ALTER TABLE coupon_issues ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "coupon_issues_select_own" ON coupon_issues;
CREATE POLICY "coupon_issues_select_own" ON coupon_issues FOR SELECT USING (auth.uid() = user_id OR is_admin());
DROP POLICY IF EXISTS "coupon_issues_admin_all"  ON coupon_issues;
CREATE POLICY "coupon_issues_admin_all"  ON coupon_issues FOR ALL USING (is_admin());

ALTER TABLE discount_codes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "discount_codes_select_active" ON discount_codes;
CREATE POLICY "discount_codes_select_active" ON discount_codes FOR SELECT USING (
  (is_active = true AND starts_at <= NOW() AND ends_at >= NOW()) OR is_admin()
);
DROP POLICY IF EXISTS "discount_codes_admin_all" ON discount_codes;
CREATE POLICY "discount_codes_admin_all" ON discount_codes FOR ALL USING (is_admin());

-- remind_alerts / third_party_logs / admin_audit_logs
ALTER TABLE remind_alerts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "remind_alerts_admin_all" ON remind_alerts;
CREATE POLICY "remind_alerts_admin_all" ON remind_alerts FOR ALL USING (is_admin());

ALTER TABLE third_party_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "third_party_logs_admin_all" ON third_party_logs;
CREATE POLICY "third_party_logs_admin_all" ON third_party_logs FOR ALL USING (is_admin());

ALTER TABLE admin_audit_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "admin_audit_logs_admin_all" ON admin_audit_logs;
CREATE POLICY "admin_audit_logs_admin_all" ON admin_audit_logs FOR ALL USING (is_admin());

-- design_folders / design_files (admin만 관리, 공개 조회 허용)
ALTER TABLE design_folders ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "design_folders_select_public" ON design_folders;
CREATE POLICY "design_folders_select_public" ON design_folders FOR SELECT USING (true);
DROP POLICY IF EXISTS "design_folders_admin_all"     ON design_folders;
CREATE POLICY "design_folders_admin_all"     ON design_folders FOR ALL USING (is_admin());

ALTER TABLE design_files ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "design_files_select_public" ON design_files;
CREATE POLICY "design_files_select_public" ON design_files FOR SELECT USING (true);
DROP POLICY IF EXISTS "design_files_admin_all"     ON design_files;
CREATE POLICY "design_files_admin_all"     ON design_files FOR ALL USING (is_admin());

-- excel_templates (admin만 관리)
ALTER TABLE excel_templates ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "excel_templates_admin_all" ON excel_templates;
CREATE POLICY "excel_templates_admin_all" ON excel_templates FOR ALL USING (is_admin());

-- ===========================================================================
-- Storage 버킷 생성 (ON CONFLICT로 재실행 안전)
-- ===========================================================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('review-images',      'review-images',      true,  10485760, ARRAY['image/jpeg','image/png','image/webp','image/gif'])
ON CONFLICT (id) DO UPDATE SET public = EXCLUDED.public, file_size_limit = EXCLUDED.file_size_limit, allowed_mime_types = EXCLUDED.allowed_mime_types;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('gallery-images',     'gallery-images',     true,  20971520, ARRAY['image/jpeg','image/png','image/webp','image/gif'])
ON CONFLICT (id) DO UPDATE SET public = EXCLUDED.public, file_size_limit = EXCLUDED.file_size_limit, allowed_mime_types = EXCLUDED.allowed_mime_types;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('magazine-images',    'magazine-images',    true,  20971520, ARRAY['image/jpeg','image/png','image/webp','image/gif'])
ON CONFLICT (id) DO UPDATE SET public = EXCLUDED.public, file_size_limit = EXCLUDED.file_size_limit, allowed_mime_types = EXCLUDED.allowed_mime_types;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('product-images',     'product-images',     true,  10485760, ARRAY['image/jpeg','image/png','image/webp'])
ON CONFLICT (id) DO UPDATE SET public = EXCLUDED.public, file_size_limit = EXCLUDED.file_size_limit, allowed_mime_types = EXCLUDED.allowed_mime_types;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('catalog-files',      'catalog-files',      true,  52428800, ARRAY['application/pdf','image/jpeg','image/png'])
ON CONFLICT (id) DO UPDATE SET public = EXCLUDED.public, file_size_limit = EXCLUDED.file_size_limit, allowed_mime_types = EXCLUDED.allowed_mime_types;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('design-files',       'design-files',       true,  52428800, ARRAY['image/jpeg','image/png','image/webp','image/gif','application/pdf'])
ON CONFLICT (id) DO UPDATE SET public = EXCLUDED.public, file_size_limit = EXCLUDED.file_size_limit, allowed_mime_types = EXCLUDED.allowed_mime_types;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('verification-docs',  'verification-docs',  false, 20971520, ARRAY['image/jpeg','image/png','image/webp','application/pdf'])
ON CONFLICT (id) DO UPDATE SET public = EXCLUDED.public, file_size_limit = EXCLUDED.file_size_limit, allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Storage 정책 (공개 버킷 — 누구나 조회, admin만 업로드/수정/삭제)
DO $$ DECLARE buckets TEXT[] := ARRAY['review-images','gallery-images','magazine-images','product-images','catalog-files','design-files'];
  b TEXT;
BEGIN
  FOREACH b IN ARRAY buckets LOOP
    EXECUTE format('DROP POLICY IF EXISTS "%s_select_public" ON storage.objects', b);
    EXECUTE format('CREATE POLICY "%s_select_public" ON storage.objects FOR SELECT USING (bucket_id = %L)', b, b);
    EXECUTE format('DROP POLICY IF EXISTS "%s_insert_admin" ON storage.objects', b);
    EXECUTE format('CREATE POLICY "%s_insert_admin" ON storage.objects FOR INSERT WITH CHECK (bucket_id = %L AND is_admin())', b, b);
    EXECUTE format('DROP POLICY IF EXISTS "%s_update_admin" ON storage.objects', b);
    EXECUTE format('CREATE POLICY "%s_update_admin" ON storage.objects FOR UPDATE USING (bucket_id = %L AND is_admin())', b, b);
    EXECUTE format('DROP POLICY IF EXISTS "%s_delete_admin" ON storage.objects', b);
    EXECUTE format('CREATE POLICY "%s_delete_admin" ON storage.objects FOR DELETE USING (bucket_id = %L AND is_admin())', b, b);
  END LOOP;
END $$;

-- verification-docs 정책 (비공개 — 본인 폴더 격리)
DROP POLICY IF EXISTS "verification-docs_select_own"  ON storage.objects;
CREATE POLICY "verification-docs_select_own"  ON storage.objects FOR SELECT USING (
  bucket_id = 'verification-docs' AND (
    (auth.uid() IS NOT NULL AND (storage.foldername(name))[1] = auth.uid()::text) OR is_admin()
  )
);
DROP POLICY IF EXISTS "verification-docs_insert_own"  ON storage.objects;
CREATE POLICY "verification-docs_insert_own"  ON storage.objects FOR INSERT WITH CHECK (
  bucket_id = 'verification-docs' AND auth.uid() IS NOT NULL
  AND (storage.foldername(name))[1] = auth.uid()::text
);
DROP POLICY IF EXISTS "verification-docs_update_own"  ON storage.objects;
CREATE POLICY "verification-docs_update_own"  ON storage.objects FOR UPDATE USING (
  bucket_id = 'verification-docs' AND (
    (auth.uid() IS NOT NULL AND (storage.foldername(name))[1] = auth.uid()::text) OR is_admin()
  )
);
DROP POLICY IF EXISTS "verification-docs_delete_admin" ON storage.objects;
CREATE POLICY "verification-docs_delete_admin" ON storage.objects FOR DELETE USING (
  bucket_id = 'verification-docs' AND is_admin()
);

-- =============================================================================
-- 완료: 총 30개 테이블, 7개 Storage 버킷, 완전한 RLS 정책 포함
-- v3 대비 신규 추가: design_folders(28), design_files(29), excel_templates(30)
-- =============================================================================
