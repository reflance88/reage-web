-- =============================================================================
-- REAGE Supabase Migration SQL — FINAL (코드 기준 완전 통합)
-- 작성일: 2026-03-11
-- 목적: schema-pg.ts 코드와 Supabase DB를 완전히 일치시킴
-- 
-- 실행 방법: Supabase Dashboard > SQL Editor에서 전체 실행
-- URL: https://supabase.com/dashboard/project/pblsxhfghmcqpcefzvfd/sql/new
-- 재실행 안전: 모든 구문이 IF NOT EXISTS / DO $$ 처리됨
-- =============================================================================

-- ===========================================================================
-- SECTION 0: ENUM 타입 정의 (코드 기준)
-- ===========================================================================

DO $$ BEGIN
  -- 기존 ENUM
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
    CREATE TYPE user_role AS ENUM ('user', 'admin');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'member_role') THEN
    CREATE TYPE member_role AS ENUM ('consumer', 'professional', 'membership');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'pro_verification_status') THEN
    CREATE TYPE pro_verification_status AS ENUM ('none', 'pending', 'approved', 'rejected');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'verification_status') THEN
    CREATE TYPE verification_status AS ENUM ('none', 'pending', 'approved', 'rejected');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'order_status') THEN
    CREATE TYPE order_status AS ENUM ('created', 'paid', 'failed', 'cancelled');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'shipping_status') THEN
    CREATE TYPE shipping_status AS ENUM ('pending_payment', 'ready', 'hold', 'shipping', 'delivered', 'none');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'third_party_status') THEN
    CREATE TYPE third_party_status AS ENUM ('none', 'synced', 'error');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role_snapshot') THEN
    CREATE TYPE user_role_snapshot AS ENUM ('consumer', 'professional');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'pro_status_snapshot') THEN
    CREATE TYPE pro_status_snapshot AS ENUM ('none', 'pending', 'approved', 'rejected');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'cancellation_requested_by') THEN
    CREATE TYPE cancellation_requested_by AS ENUM ('buyer', 'admin');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'cancellation_status') THEN
    CREATE TYPE cancellation_status AS ENUM ('requested', 'processing', 'completed', 'rejected');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'cancel_type') THEN
    CREATE TYPE cancel_type AS ENUM ('pre_payment', 'post_payment');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'exchange_status') THEN
    CREATE TYPE exchange_status AS ENUM ('requested', 'processing', 'ready', 'completed', 'rejected');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'return_status') THEN
    CREATE TYPE return_status AS ENUM ('requested', 'processing', 'hold', 'completed', 'rejected');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'refund_method') THEN
    CREATE TYPE refund_method AS ENUM ('card', 'bank', 'point', 'deposit', 'mixed');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'refund_status') THEN
    CREATE TYPE refund_status AS ENUM ('pending', 'completed', 'hold', 'rejected');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'refund_type') THEN
    CREATE TYPE refund_type AS ENUM ('full', 'partial');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'card_cancel_type') THEN
    CREATE TYPE card_cancel_type AS ENUM ('full', 'partial');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'third_party_result') THEN
    CREATE TYPE third_party_result AS ENUM ('success', 'failed', 'skipped');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'post_type') THEN
    CREATE TYPE post_type AS ENUM ('gallery', 'magazine');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'popup_type') THEN
    CREATE TYPE popup_type AS ENUM ('pc', 'mobile', 'both');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'link_target') THEN
    CREATE TYPE link_target AS ENUM ('_self', '_blank');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'bottom_text') THEN
    CREATE TYPE bottom_text AS ENUM ('today', 'week', 'none');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'device_type') THEN
    CREATE TYPE device_type AS ENUM ('pc', 'mobile', 'tablet');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'review_category') THEN
    CREATE TYPE review_category AS ENUM ('before_after', 'device', 'education', 'event', 'etc');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'product_status') THEN
    CREATE TYPE product_status AS ENUM ('new', 'used', 'refurbished');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'tax_type') THEN
    CREATE TYPE tax_type AS ENUM ('taxable', 'tax_free', 'exempt');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'shipping_type') THEN
    CREATE TYPE shipping_type AS ENUM ('direct', 'warehouse', 'other');
  END IF;
  -- 기존 구 스키마 ENUM (이미 존재할 수 있음)
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'member_type') THEN
    CREATE TYPE member_type AS ENUM ('consumer', 'professional', 'membership');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'inquiry_type') THEN
    CREATE TYPE inquiry_type AS ENUM ('trial', 'introduction', 'education');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'inquiry_status') THEN
    CREATE TYPE inquiry_status AS ENUM ('received', 'contacted', 'closed');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'gallery_category') THEN
    CREATE TYPE gallery_category AS ENUM ('salon', 'education', 'japan', 'expo', 'product', 'instructor', 'etc');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'magazine_category') THEN
    CREATE TYPE magazine_category AS ENUM ('japan', 'korea', 'ai_tech', 'trend', 'etc');
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
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'product_category') THEN
    CREATE TYPE product_category AS ENUM ('cream', 'device', 'kit', 'supplement', 'etc');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'popup_device_type') THEN
    CREATE TYPE popup_device_type AS ENUM ('pc', 'mobile', 'all');
  END IF;
END $$;

-- ===========================================================================
-- SECTION 1: ★ 신규 생성 — users 테이블 (코드 기준 camelCase 컬럼)
-- ===========================================================================
-- 이 테이블이 없어서 OAuth 로그인이 전혀 작동하지 않았음
-- schema-pg.ts의 users 테이블 정의와 완전히 일치

CREATE TABLE IF NOT EXISTS users (
  id                        SERIAL PRIMARY KEY,
  "openId"                  VARCHAR(64) NOT NULL UNIQUE,
  name                      TEXT,
  email                     VARCHAR(320),
  "loginMethod"             VARCHAR(64),
  phone                     VARCHAR(30),
  role                      user_role NOT NULL DEFAULT 'user',
  "memberRole"              member_role NOT NULL DEFAULT 'consumer',
  "membershipDiscountRate"  INTEGER NOT NULL DEFAULT 0,
  "proVerificationStatus"   pro_verification_status NOT NULL DEFAULT 'none',
  "passwordHash"            VARCHAR(255),
  "emailVerified"           BOOLEAN NOT NULL DEFAULT false,
  "resetToken"              VARCHAR(128),
  "resetTokenExpiresAt"     TIMESTAMPTZ,
  "lastSignedIn"            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "createdAt"               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt"               TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_email   ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role    ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_open_id ON users("openId");

-- ===========================================================================
-- SECTION 2: ★ 신규 생성 — post_images 테이블 (코드 기준 camelCase 컬럼)
-- ===========================================================================
-- 갤러리/매거진 이미지 관리에 필요한 테이블
-- schema-pg.ts의 postImages 테이블 정의와 완전히 일치

CREATE TABLE IF NOT EXISTS post_images (
  id          SERIAL PRIMARY KEY,
  "postType"  post_type NOT NULL,
  "postId"    INTEGER NOT NULL,
  "imageUrl"  TEXT NOT NULL,
  "imageKey"  TEXT NOT NULL,
  "fileName"  VARCHAR(300),
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_post_images_post_type ON post_images("postType");
CREATE INDEX IF NOT EXISTS idx_post_images_post_id   ON post_images("postId");
CREATE INDEX IF NOT EXISTS idx_post_images_combined  ON post_images("postType", "postId");

-- ===========================================================================
-- SECTION 3: 기존 테이블 컬럼 추가 (코드에서 사용하는 camelCase 컬럼 추가)
-- ===========================================================================
-- 기존 테이블은 snake_case 컬럼으로 생성되어 있음
-- 코드는 camelCase 컬럼을 사용하므로 누락 컬럼을 추가함
-- 기존 데이터는 보존됨

-- ---------------------------------------------------------------------------
-- 3-1. gallery_posts — 코드 기준 컬럼 추가
-- 코드 사용: title, content, coverImageUrl, coverImageKey, isPublished, authorId, viewCount, createdAt, updatedAt
-- DB 현재: id, category, title, summary, cover_image_url, cover_image_key, is_published, sort_order, view_count, author_id, created_at, updated_at
-- ---------------------------------------------------------------------------
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='gallery_posts' AND column_name='content') THEN
    ALTER TABLE gallery_posts ADD COLUMN content TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='gallery_posts' AND column_name='coverImageUrl') THEN
    ALTER TABLE gallery_posts ADD COLUMN "coverImageUrl" TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='gallery_posts' AND column_name='coverImageKey') THEN
    ALTER TABLE gallery_posts ADD COLUMN "coverImageKey" TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='gallery_posts' AND column_name='isPublished') THEN
    ALTER TABLE gallery_posts ADD COLUMN "isPublished" BOOLEAN NOT NULL DEFAULT true;
    -- 기존 is_published 값을 새 컬럼에 복사
    UPDATE gallery_posts SET "isPublished" = is_published;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='gallery_posts' AND column_name='authorId') THEN
    ALTER TABLE gallery_posts ADD COLUMN "authorId" INTEGER REFERENCES users(id) ON DELETE SET NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='gallery_posts' AND column_name='viewCount') THEN
    ALTER TABLE gallery_posts ADD COLUMN "viewCount" INTEGER NOT NULL DEFAULT 0;
    UPDATE gallery_posts SET "viewCount" = COALESCE(view_count, 0);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='gallery_posts' AND column_name='createdAt') THEN
    ALTER TABLE gallery_posts ADD COLUMN "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW();
    UPDATE gallery_posts SET "createdAt" = created_at;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='gallery_posts' AND column_name='updatedAt') THEN
    ALTER TABLE gallery_posts ADD COLUMN "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW();
    UPDATE gallery_posts SET "updatedAt" = updated_at;
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 3-2. magazine_posts — 코드 기준 컬럼 추가
-- 코드 사용: title, subtitle, content, coverImageUrl, coverImageKey, isPublished, authorId, viewCount, createdAt, updatedAt
-- DB 현재: id, slug, title, subtitle, excerpt, content, cover_image_url, cover_image_key, category, is_published, published_at, view_count, author_id, seo_title, seo_description, created_at, updated_at
-- ---------------------------------------------------------------------------
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='magazine_posts' AND column_name='coverImageUrl') THEN
    ALTER TABLE magazine_posts ADD COLUMN "coverImageUrl" TEXT;
    UPDATE magazine_posts SET "coverImageUrl" = cover_image_url;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='magazine_posts' AND column_name='coverImageKey') THEN
    ALTER TABLE magazine_posts ADD COLUMN "coverImageKey" TEXT;
    UPDATE magazine_posts SET "coverImageKey" = cover_image_key;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='magazine_posts' AND column_name='isPublished') THEN
    ALTER TABLE magazine_posts ADD COLUMN "isPublished" BOOLEAN NOT NULL DEFAULT false;
    UPDATE magazine_posts SET "isPublished" = is_published;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='magazine_posts' AND column_name='authorId') THEN
    ALTER TABLE magazine_posts ADD COLUMN "authorId" INTEGER REFERENCES users(id) ON DELETE SET NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='magazine_posts' AND column_name='viewCount') THEN
    ALTER TABLE magazine_posts ADD COLUMN "viewCount" INTEGER NOT NULL DEFAULT 0;
    UPDATE magazine_posts SET "viewCount" = COALESCE(view_count, 0);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='magazine_posts' AND column_name='createdAt') THEN
    ALTER TABLE magazine_posts ADD COLUMN "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW();
    UPDATE magazine_posts SET "createdAt" = created_at;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='magazine_posts' AND column_name='updatedAt') THEN
    ALTER TABLE magazine_posts ADD COLUMN "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW();
    UPDATE magazine_posts SET "updatedAt" = updated_at;
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 3-3. certified_instructors — 코드 기준 컬럼 추가
-- 코드 사용: id, imageUrl, imageKey, name, description, sortOrder, isPublished, authorId, createdAt, updatedAt
-- DB 현재: id, name, title, bio, image_url, image_key, region, is_published, sort_order, created_at, updated_at
-- ---------------------------------------------------------------------------
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='certified_instructors' AND column_name='imageUrl') THEN
    ALTER TABLE certified_instructors ADD COLUMN "imageUrl" TEXT;
    UPDATE certified_instructors SET "imageUrl" = image_url;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='certified_instructors' AND column_name='imageKey') THEN
    ALTER TABLE certified_instructors ADD COLUMN "imageKey" VARCHAR(500);
    UPDATE certified_instructors SET "imageKey" = image_key;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='certified_instructors' AND column_name='description') THEN
    ALTER TABLE certified_instructors ADD COLUMN description TEXT;
    UPDATE certified_instructors SET description = bio;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='certified_instructors' AND column_name='sortOrder') THEN
    ALTER TABLE certified_instructors ADD COLUMN "sortOrder" INTEGER NOT NULL DEFAULT 0;
    UPDATE certified_instructors SET "sortOrder" = COALESCE(sort_order, 0);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='certified_instructors' AND column_name='isPublished') THEN
    ALTER TABLE certified_instructors ADD COLUMN "isPublished" BOOLEAN NOT NULL DEFAULT true;
    UPDATE certified_instructors SET "isPublished" = is_published;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='certified_instructors' AND column_name='authorId') THEN
    ALTER TABLE certified_instructors ADD COLUMN "authorId" INTEGER REFERENCES users(id) ON DELETE SET NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='certified_instructors' AND column_name='createdAt') THEN
    ALTER TABLE certified_instructors ADD COLUMN "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW();
    UPDATE certified_instructors SET "createdAt" = created_at;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='certified_instructors' AND column_name='updatedAt') THEN
    ALTER TABLE certified_instructors ADD COLUMN "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW();
    UPDATE certified_instructors SET "updatedAt" = updated_at;
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 3-4. reviews — 코드 기준 컬럼 추가
-- 코드 사용: id, category, categoryLabel, imageUrl, imageKey, title, description, sortOrder, isPublished, authorId, createdAt, updatedAt
-- DB 현재: id, category, title, description, image_url, image_key, reviewer_label, rating, is_published, sort_order, author_id, created_at, updated_at
-- ---------------------------------------------------------------------------
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='reviews' AND column_name='categoryLabel') THEN
    ALTER TABLE reviews ADD COLUMN "categoryLabel" VARCHAR(100);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='reviews' AND column_name='imageUrl') THEN
    ALTER TABLE reviews ADD COLUMN "imageUrl" TEXT;
    UPDATE reviews SET "imageUrl" = image_url;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='reviews' AND column_name='imageKey') THEN
    ALTER TABLE reviews ADD COLUMN "imageKey" VARCHAR(500);
    UPDATE reviews SET "imageKey" = image_key;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='reviews' AND column_name='sortOrder') THEN
    ALTER TABLE reviews ADD COLUMN "sortOrder" INTEGER NOT NULL DEFAULT 0;
    UPDATE reviews SET "sortOrder" = COALESCE(sort_order, 0);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='reviews' AND column_name='isPublished') THEN
    ALTER TABLE reviews ADD COLUMN "isPublished" BOOLEAN NOT NULL DEFAULT true;
    UPDATE reviews SET "isPublished" = is_published;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='reviews' AND column_name='authorId') THEN
    ALTER TABLE reviews ADD COLUMN "authorId" INTEGER REFERENCES users(id) ON DELETE SET NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='reviews' AND column_name='createdAt') THEN
    ALTER TABLE reviews ADD COLUMN "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW();
    UPDATE reviews SET "createdAt" = created_at;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='reviews' AND column_name='updatedAt') THEN
    ALTER TABLE reviews ADD COLUMN "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW();
    UPDATE reviews SET "updatedAt" = updated_at;
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 3-5. popups — 코드 기준 컬럼 추가
-- 코드 사용: id, title, popupType, isActive, imageUrl, imageKey, linkUrl, linkTarget, displayPosition, bottomText, startAt, endAt, clickCount, sortOrder, createdAt, updatedAt
-- DB 현재: id, title, image_url, image_key, link_url, device_type, display_position, bottom_text, is_active, starts_at, ends_at, sort_order, created_at, updated_at
-- ---------------------------------------------------------------------------
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='popups' AND column_name='popupType') THEN
    ALTER TABLE popups ADD COLUMN "popupType" popup_type NOT NULL DEFAULT 'both';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='popups' AND column_name='isActive') THEN
    ALTER TABLE popups ADD COLUMN "isActive" BOOLEAN NOT NULL DEFAULT false;
    UPDATE popups SET "isActive" = is_active;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='popups' AND column_name='imageUrl') THEN
    ALTER TABLE popups ADD COLUMN "imageUrl" TEXT;
    UPDATE popups SET "imageUrl" = image_url;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='popups' AND column_name='imageKey') THEN
    ALTER TABLE popups ADD COLUMN "imageKey" TEXT;
    UPDATE popups SET "imageKey" = image_key;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='popups' AND column_name='linkUrl') THEN
    ALTER TABLE popups ADD COLUMN "linkUrl" TEXT;
    UPDATE popups SET "linkUrl" = link_url;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='popups' AND column_name='linkTarget') THEN
    ALTER TABLE popups ADD COLUMN "linkTarget" link_target NOT NULL DEFAULT '_blank';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='popups' AND column_name='displayPosition') THEN
    ALTER TABLE popups ADD COLUMN "displayPosition" VARCHAR(100) NOT NULL DEFAULT 'main';
    UPDATE popups SET "displayPosition" = COALESCE(display_position, 'main');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='popups' AND column_name='bottomText') THEN
    ALTER TABLE popups ADD COLUMN "bottomText" bottom_text NOT NULL DEFAULT 'today';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='popups' AND column_name='startAt') THEN
    ALTER TABLE popups ADD COLUMN "startAt" TIMESTAMPTZ;
    UPDATE popups SET "startAt" = starts_at;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='popups' AND column_name='endAt') THEN
    ALTER TABLE popups ADD COLUMN "endAt" TIMESTAMPTZ;
    UPDATE popups SET "endAt" = ends_at;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='popups' AND column_name='clickCount') THEN
    ALTER TABLE popups ADD COLUMN "clickCount" INTEGER NOT NULL DEFAULT 0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='popups' AND column_name='sortOrder') THEN
    ALTER TABLE popups ADD COLUMN "sortOrder" INTEGER NOT NULL DEFAULT 0;
    UPDATE popups SET "sortOrder" = COALESCE(sort_order, 0);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='popups' AND column_name='createdAt') THEN
    ALTER TABLE popups ADD COLUMN "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW();
    UPDATE popups SET "createdAt" = created_at;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='popups' AND column_name='updatedAt') THEN
    ALTER TABLE popups ADD COLUMN "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW();
    UPDATE popups SET "updatedAt" = updated_at;
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 3-6. page_views — 코드 기준 컬럼 추가
-- 코드 사용: id, path, deviceType, sessionId, userId, referrer, userAgent, duration, createdAt
-- DB 현재: id, page_path, referrer, user_agent, ip_hash, user_id, device_type, created_at
-- ---------------------------------------------------------------------------
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='page_views' AND column_name='path') THEN
    ALTER TABLE page_views ADD COLUMN path VARCHAR(500);
    UPDATE page_views SET path = page_path;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='page_views' AND column_name='deviceType') THEN
    ALTER TABLE page_views ADD COLUMN "deviceType" device_type NOT NULL DEFAULT 'pc';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='page_views' AND column_name='sessionId') THEN
    ALTER TABLE page_views ADD COLUMN "sessionId" VARCHAR(128);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='page_views' AND column_name='userId') THEN
    ALTER TABLE page_views ADD COLUMN "userId" INTEGER REFERENCES users(id) ON DELETE SET NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='page_views' AND column_name='userAgent') THEN
    ALTER TABLE page_views ADD COLUMN "userAgent" TEXT;
    UPDATE page_views SET "userAgent" = user_agent;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='page_views' AND column_name='duration') THEN
    ALTER TABLE page_views ADD COLUMN duration INTEGER;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='page_views' AND column_name='createdAt') THEN
    ALTER TABLE page_views ADD COLUMN "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW();
    UPDATE page_views SET "createdAt" = created_at;
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 3-7. business_verifications — 코드 기준 컬럼 추가
-- 코드 사용: id, userId, businessNumber, businessName, contactPhone, fileUrl, fileKey, fileName, status, rejectReason, submittedAt, reviewedAt, createdAt, updatedAt
-- DB 현재: id, user_id, business_name, business_number, representative_name, doc_url, doc_key, status, admin_memo, reviewed_by, reviewed_at, created_at, updated_at
-- ---------------------------------------------------------------------------
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='business_verifications' AND column_name='userId') THEN
    ALTER TABLE business_verifications ADD COLUMN "userId" INTEGER REFERENCES users(id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='business_verifications' AND column_name='businessNumber') THEN
    ALTER TABLE business_verifications ADD COLUMN "businessNumber" VARCHAR(30);
    UPDATE business_verifications SET "businessNumber" = business_number;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='business_verifications' AND column_name='businessName') THEN
    ALTER TABLE business_verifications ADD COLUMN "businessName" VARCHAR(200);
    UPDATE business_verifications SET "businessName" = business_name;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='business_verifications' AND column_name='contactPhone') THEN
    ALTER TABLE business_verifications ADD COLUMN "contactPhone" VARCHAR(30);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='business_verifications' AND column_name='fileUrl') THEN
    ALTER TABLE business_verifications ADD COLUMN "fileUrl" TEXT;
    UPDATE business_verifications SET "fileUrl" = doc_url;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='business_verifications' AND column_name='fileKey') THEN
    ALTER TABLE business_verifications ADD COLUMN "fileKey" TEXT;
    UPDATE business_verifications SET "fileKey" = doc_key;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='business_verifications' AND column_name='fileName') THEN
    ALTER TABLE business_verifications ADD COLUMN "fileName" VARCHAR(300);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='business_verifications' AND column_name='rejectReason') THEN
    ALTER TABLE business_verifications ADD COLUMN "rejectReason" TEXT;
    UPDATE business_verifications SET "rejectReason" = admin_memo;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='business_verifications' AND column_name='submittedAt') THEN
    ALTER TABLE business_verifications ADD COLUMN "submittedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW();
    UPDATE business_verifications SET "submittedAt" = created_at;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='business_verifications' AND column_name='reviewedAt') THEN
    ALTER TABLE business_verifications ADD COLUMN "reviewedAt" TIMESTAMPTZ;
    UPDATE business_verifications SET "reviewedAt" = reviewed_at;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='business_verifications' AND column_name='createdAt') THEN
    ALTER TABLE business_verifications ADD COLUMN "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW();
    UPDATE business_verifications SET "createdAt" = created_at;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='business_verifications' AND column_name='updatedAt') THEN
    ALTER TABLE business_verifications ADD COLUMN "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW();
    UPDATE business_verifications SET "updatedAt" = updated_at;
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 3-8. coupons — 코드 기준 컬럼 추가 (기존 coupons는 구 스키마 기반)
-- 코드 사용: id, name, description, benefitType, benefitValue, issueType, targetMember, displayTiming, scheduledAt, startDate, endDate, periodType, validDays, totalIssued, usedCount, status, createdAt, updatedAt
-- ---------------------------------------------------------------------------
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='coupons' AND column_name='benefitType') THEN
    ALTER TABLE coupons ADD COLUMN "benefitType" VARCHAR(50) NOT NULL DEFAULT 'discount_rate';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='coupons' AND column_name='benefitValue') THEN
    ALTER TABLE coupons ADD COLUMN "benefitValue" INTEGER NOT NULL DEFAULT 0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='coupons' AND column_name='issueType') THEN
    ALTER TABLE coupons ADD COLUMN "issueType" VARCHAR(50) NOT NULL DEFAULT 'customer_download';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='coupons' AND column_name='targetMember') THEN
    ALTER TABLE coupons ADD COLUMN "targetMember" VARCHAR(20) NOT NULL DEFAULT 'all';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='coupons' AND column_name='displayTiming') THEN
    ALTER TABLE coupons ADD COLUMN "displayTiming" VARCHAR(20) NOT NULL DEFAULT 'immediate';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='coupons' AND column_name='scheduledAt') THEN
    ALTER TABLE coupons ADD COLUMN "scheduledAt" TIMESTAMPTZ;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='coupons' AND column_name='startDate') THEN
    ALTER TABLE coupons ADD COLUMN "startDate" TIMESTAMPTZ;
    UPDATE coupons SET "startDate" = starts_at;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='coupons' AND column_name='endDate') THEN
    ALTER TABLE coupons ADD COLUMN "endDate" TIMESTAMPTZ;
    UPDATE coupons SET "endDate" = ends_at;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='coupons' AND column_name='periodType') THEN
    ALTER TABLE coupons ADD COLUMN "periodType" VARCHAR(30) NOT NULL DEFAULT 'fixed';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='coupons' AND column_name='validDays') THEN
    ALTER TABLE coupons ADD COLUMN "validDays" INTEGER;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='coupons' AND column_name='totalIssued') THEN
    ALTER TABLE coupons ADD COLUMN "totalIssued" INTEGER NOT NULL DEFAULT 0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='coupons' AND column_name='usedCount') THEN
    ALTER TABLE coupons ADD COLUMN "usedCount" INTEGER NOT NULL DEFAULT 0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='coupons' AND column_name='status') THEN
    ALTER TABLE coupons ADD COLUMN status VARCHAR(20) NOT NULL DEFAULT 'active';
    UPDATE coupons SET status = CASE WHEN is_active THEN 'active' ELSE 'inactive' END;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='coupons' AND column_name='createdAt') THEN
    ALTER TABLE coupons ADD COLUMN "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW();
    UPDATE coupons SET "createdAt" = created_at;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='coupons' AND column_name='updatedAt') THEN
    ALTER TABLE coupons ADD COLUMN "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW();
    UPDATE coupons SET "updatedAt" = updated_at;
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 3-9. remind_alerts — 코드 기준 컬럼 추가
-- ---------------------------------------------------------------------------
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='remind_alerts' AND column_name='isActive') THEN
    ALTER TABLE remind_alerts ADD COLUMN "isActive" BOOLEAN NOT NULL DEFAULT true;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='remind_alerts' AND column_name='createdAt') THEN
    ALTER TABLE remind_alerts ADD COLUMN "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW();
    UPDATE remind_alerts SET "createdAt" = created_at;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='remind_alerts' AND column_name='updatedAt') THEN
    ALTER TABLE remind_alerts ADD COLUMN "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW();
    UPDATE remind_alerts SET "updatedAt" = updated_at;
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 3-10. excel_templates — 코드 기준 컬럼 추가
-- ---------------------------------------------------------------------------
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='excel_templates' AND column_name='isDefault') THEN
    ALTER TABLE excel_templates ADD COLUMN "isDefault" BOOLEAN NOT NULL DEFAULT false;
    UPDATE excel_templates SET "isDefault" = is_default;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='excel_templates' AND column_name='sortConfig') THEN
    ALTER TABLE excel_templates ADD COLUMN "sortConfig" TEXT;
    UPDATE excel_templates SET "sortConfig" = sort_config;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='excel_templates' AND column_name='authorId') THEN
    ALTER TABLE excel_templates ADD COLUMN "authorId" INTEGER REFERENCES users(id) ON DELETE SET NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='excel_templates' AND column_name='createdAt') THEN
    ALTER TABLE excel_templates ADD COLUMN "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW();
    UPDATE excel_templates SET "createdAt" = created_at;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='excel_templates' AND column_name='updatedAt') THEN
    ALTER TABLE excel_templates ADD COLUMN "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW();
    UPDATE excel_templates SET "updatedAt" = updated_at;
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 3-11. design_files — 코드 기준 컬럼 추가
-- 코드 사용: id, fileName, fileKey, fileUrl, thumbnailUrl, mediumUrl, mimeType, fileSize, folder, uploadedBy, createdAt
-- DB 현재: id, file_name, file_key, file_url, thumbnail_url, medium_url, mime_type, file_size, folder, uploaded_by, created_at
-- ---------------------------------------------------------------------------
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='design_files' AND column_name='fileName') THEN
    ALTER TABLE design_files ADD COLUMN "fileName" VARCHAR(300);
    UPDATE design_files SET "fileName" = file_name;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='design_files' AND column_name='fileKey') THEN
    ALTER TABLE design_files ADD COLUMN "fileKey" TEXT;
    UPDATE design_files SET "fileKey" = file_key;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='design_files' AND column_name='fileUrl') THEN
    ALTER TABLE design_files ADD COLUMN "fileUrl" TEXT;
    UPDATE design_files SET "fileUrl" = file_url;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='design_files' AND column_name='thumbnailUrl') THEN
    ALTER TABLE design_files ADD COLUMN "thumbnailUrl" TEXT;
    UPDATE design_files SET "thumbnailUrl" = thumbnail_url;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='design_files' AND column_name='mediumUrl') THEN
    ALTER TABLE design_files ADD COLUMN "mediumUrl" TEXT;
    UPDATE design_files SET "mediumUrl" = medium_url;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='design_files' AND column_name='mimeType') THEN
    ALTER TABLE design_files ADD COLUMN "mimeType" VARCHAR(100);
    UPDATE design_files SET "mimeType" = mime_type;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='design_files' AND column_name='fileSize') THEN
    ALTER TABLE design_files ADD COLUMN "fileSize" INTEGER;
    UPDATE design_files SET "fileSize" = file_size;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='design_files' AND column_name='uploadedBy') THEN
    ALTER TABLE design_files ADD COLUMN "uploadedBy" INTEGER REFERENCES users(id) ON DELETE SET NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='design_files' AND column_name='createdAt') THEN
    ALTER TABLE design_files ADD COLUMN "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW();
    UPDATE design_files SET "createdAt" = created_at;
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 3-12. design_folders — 코드 기준 컬럼 추가
-- ---------------------------------------------------------------------------
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='design_folders' AND column_name='parentId') THEN
    ALTER TABLE design_folders ADD COLUMN "parentId" INTEGER REFERENCES design_folders(id) ON DELETE SET NULL;
    UPDATE design_folders SET "parentId" = parent_id;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='design_folders' AND column_name='createdAt') THEN
    ALTER TABLE design_folders ADD COLUMN "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW();
    UPDATE design_folders SET "createdAt" = created_at;
  END IF;
END $$;

-- ===========================================================================
-- SECTION 4: 확인 쿼리
-- ===========================================================================

SELECT 
  'users' AS table_name,
  COUNT(*) AS row_count,
  'NEW TABLE' AS note
FROM users
UNION ALL
SELECT 
  'post_images',
  COUNT(*),
  'NEW TABLE'
FROM post_images
UNION ALL
SELECT 
  'gallery_posts',
  COUNT(*),
  'UPDATED - camelCase columns added'
FROM gallery_posts
UNION ALL
SELECT 
  'magazine_posts',
  COUNT(*),
  'UPDATED - camelCase columns added'
FROM magazine_posts
UNION ALL
SELECT 
  'certified_instructors',
  COUNT(*),
  'UPDATED - camelCase columns added'
FROM certified_instructors;

SELECT '✅ 마이그레이션 완료! users 테이블 생성 및 모든 테이블 camelCase 컬럼 추가됨' AS result;
