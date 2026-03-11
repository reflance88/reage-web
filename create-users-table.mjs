/**
 * Supabase에 users 테이블 생성 스크립트
 * Supabase는 포트 5432가 샌드박스에서 차단되어 있으므로
 * Supabase REST API를 통해 SQL을 실행합니다.
 * 
 * 실행: node create-users-table.mjs
 */

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('SUPABASE_URL 또는 SUPABASE_SERVICE_ROLE_KEY 환경변수가 없습니다.');
  process.exit(1);
}

// Supabase REST API를 통해 테이블 생성은 불가능 (DDL 불가)
// 대신 Supabase SQL Editor에서 실행할 SQL을 출력합니다.

const sql = `
-- ============================================================
-- Manus OAuth 기반 users 테이블 생성 SQL
-- Supabase Dashboard > SQL Editor에서 실행하세요
-- ============================================================

-- ENUM 타입 생성 (이미 존재하면 무시)
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

-- users 테이블 생성
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

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_open_id ON users("openId");

-- updated_at 자동 갱신 함수 (이미 존재하면 교체)
CREATE OR REPLACE FUNCTION update_users_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW."updatedAt" = NOW();
  RETURN NEW;
END;
$$;

-- 트리거 생성
DROP TRIGGER IF EXISTS users_updated_at ON users;
CREATE TRIGGER users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_users_updated_at();

-- 확인
SELECT 'users 테이블 생성 완료' AS result;
`;

console.log('='.repeat(60));
console.log('아래 SQL을 Supabase Dashboard > SQL Editor에서 실행하세요:');
console.log('URL: https://supabase.com/dashboard/project/pblsxhfghmcqpcefzvfd/sql/new');
console.log('='.repeat(60));
console.log(sql);
