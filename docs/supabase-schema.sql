-- ============================================================
-- REAGE Supabase SQL Schema
-- 이 파일을 Supabase SQL Editor에서 실행하세요.
-- ============================================================

-- ─── Products (상품) ──────────────────────────────────────────
-- Supabase에서 상품 데이터를 관리하려면 아래 테이블을 생성하세요.
-- 현재 REAGE는 MySQL(TiDB)에 상품 테이블이 존재하므로
-- Supabase에 별도 상품 테이블이 필요한 경우에만 실행하세요.

CREATE TABLE IF NOT EXISTS products (
  id BIGSERIAL PRIMARY KEY,
  slug VARCHAR(100) NOT NULL UNIQUE,
  name VARCHAR(200) NOT NULL,
  description TEXT,
  price_consumer NUMERIC(12, 0) NOT NULL DEFAULT 0,
  price_pro NUMERIC(12, 0) NOT NULL DEFAULT 0,
  price_membership NUMERIC(12, 0),
  is_pro_only BOOLEAN DEFAULT FALSE NOT NULL,
  stock INTEGER DEFAULT 999 NOT NULL,
  image_url TEXT,
  is_active BOOLEAN DEFAULT TRUE NOT NULL,
  visible BOOLEAN DEFAULT TRUE NOT NULL,
  product_code VARCHAR(50),
  product_status VARCHAR(20) DEFAULT 'new',
  summary_description VARCHAR(255),
  short_description TEXT,
  tax_type VARCHAR(20) DEFAULT 'taxable',
  tax_rate NUMERIC(5, 2) DEFAULT 10.00,
  shipping_type VARCHAR(20) DEFAULT 'direct',
  weight NUMERIC(8, 2) DEFAULT 1.00,
  manufacturer VARCHAR(100),
  brand VARCHAR(100),
  origin VARCHAR(100),
  seo_title VARCHAR(200),
  seo_description TEXT,
  seo_keywords VARCHAR(500),
  seo_image_alt VARCHAR(200),
  admin_memo TEXT,
  thumbnail_url TEXT,
  detail_page_url VARCHAR(500),
  sort_order INTEGER DEFAULT 0,
  is_recommended BOOLEAN DEFAULT FALSE NOT NULL,
  is_new BOOLEAN DEFAULT FALSE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- updated_at 자동 갱신 트리거
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER products_updated_at
  BEFORE UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ─── Design Files (파일업로더) ────────────────────────────────
CREATE TABLE IF NOT EXISTS design_files (
  id BIGSERIAL PRIMARY KEY,
  file_name VARCHAR(300) NOT NULL,
  file_key TEXT NOT NULL,
  file_url TEXT NOT NULL,
  mime_type VARCHAR(100),
  file_size INTEGER,
  folder VARCHAR(200) DEFAULT 'ROOT',
  uploaded_by INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 파일명/폴더 검색 인덱스
CREATE INDEX IF NOT EXISTS idx_design_files_folder ON design_files(folder);
CREATE INDEX IF NOT EXISTS idx_design_files_file_name ON design_files(file_name);

-- ─── Design Folders (폴더 관리) ──────────────────────────────
CREATE TABLE IF NOT EXISTS design_folders (
  id BIGSERIAL PRIMARY KEY,
  name VARCHAR(200) NOT NULL,
  parent_id BIGINT REFERENCES design_folders(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- ─── RLS (Row Level Security) 설정 ───────────────────────────
-- 필요에 따라 RLS 정책을 추가하세요.
-- 현재는 서버사이드 service_role key로만 접근하므로 기본 비활성화 상태입니다.

-- ALTER TABLE design_files ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE design_folders ENABLE ROW LEVEL SECURITY;

-- ─── 샘플 데이터 (선택사항) ──────────────────────────────────
-- INSERT INTO design_folders (name) VALUES ('상품이미지'), ('배너'), ('갤러리');
