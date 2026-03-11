-- ============================================================
-- Manus OAuth 기반 users 테이블 생성
-- Supabase SQL Editor에서 실행하세요
-- ============================================================

-- ENUM 타입 (이미 존재하면 무시)
DO $$ BEGIN
  CREATE TYPE user_role AS ENUM ('user', 'admin');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE member_role AS ENUM ('consumer', 'professional', 'membership');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE pro_verification_status AS ENUM ('none', 'pending', 'approved', 'rejected');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- users 테이블
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

-- updated_at 자동 갱신 트리거 (함수가 없으면 생성)
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW."updatedAt" = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS users_updated_at ON users;
CREATE TRIGGER users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
