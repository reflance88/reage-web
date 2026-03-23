# 레아쥬(REAGE) - 올핸드 미세전류 테라피 공식 웹사이트

## 🌟 프로젝트 개요

**레아쥬(REAGE)**는 올핸드 미세전류 테라피 전문 브랜드의 공식 웹사이트입니다. 이 프로젝트는 [Manus](https://manus.so)로 제작되었으며, 최신 웹 기술을 활용하여 구축된 모던한 플랫폼입니다.

## 📱 주요 기능

- **레아쥬 스토리(Story)**: 브랜드 이야기 및 철학 소개
- **레아쥬 기기(Devices)**: 제품 및 기기 정보 제시
- **아카데미(Academy)**: 교육 및 교육 프로그램
- **체험 예약(Experience Booking)**: 온라인 예약 시스템
- **갤러리(Gallery)**: 이미지 및 영상 콘텐츠
- **매거진(Magazine)**: 최신 뉴스 및 아티클

## 🛠 기술 스택

### 프론트엔드
- **TypeScript** (65.6%) - 타입 안전성 및 개발 생산성
- **HTML** (25.3%) - 구조화된 마크업
- **JavaScript** (2.8%) - 인터랙티브 기능

### 백엔드 & 데이터베이스
- **Node.js / Express** - 서버 런타임
- **PLpgSQL** (5.8%) - PostgreSQL 스토어드 프로시저
- **Supabase** - 클라우드 데이터베이스 및 인증

### 빌드 & 개발 도구
- **Vite** - 고속 빌드 도구
- **pnpm** - 패키지 매니저
- **Drizzle ORM** - 타입 안전한 데이터베이스 접근
- **Vercel** - 배포 플랫폼

## 📁 프로젝트 구조

```
reage-web/
├── client/           # 클라이언트 (프론트엔드) 코드
├── server/           # 서버 (백엔드) 코드
├── shared/           # 클라이언트와 서버 공유 코드
├── api/              # API 엔드포인트
├── scripts/          # 유틸리티 스크립트
├── drizzle/          # Drizzle ORM 설정 및 마이그레이션
├── supabase/         # Supabase 관련 설정
├── docs/             # 문서
├── agents/           # AI 에이전트 (선택사항)
├── vite.config.ts    # Vite 설정
├── tsconfig.json     # TypeScript 설정
└── package.json      # 프로젝트 의존성
```

## 🚀 시작하기

### 사전 요구사항
- Node.js 18+ 또는 최신 버전
- pnpm 패키지 매니저
- Supabase 계정 및 프로젝트

### 설치 및 실행

1. **리포지토리 클론**
   ```bash
   git clone https://github.com/reflance88/reage-web.git
   cd reage-web
   ```

2. **의존성 설치**
   ```bash
   pnpm install
   ```

3. **환경 변수 설정**
   - `.env` 파일을 생성하고 Supabase 크레덴셜 등 필요한 환경 변수를 설정합니다.

4. **개발 서버 실행**
   ```bash
   pnpm dev
   ```

5. **프로덕션 빌드**
   ```bash
   pnpm build
   ```

## 📊 데이터베이스 스키마

프로젝트는 PostgreSQL 기반의 Supabase를 사용합니다. 주요 테이블:
- **users** - 사용자 정보 및 인증
- **products** - 제품 및 기기 정보
- **bookings** - 체험 예약 정보
- **gallery** - 갤러리 이미지 및 영상
- **magazine** - 매거진 콘텐츠

마이그레이션 파일은 `drizzle/` 디렉토리에서 확인할 수 있습니다.

## 🔧 Drizzle ORM

이 프로젝트는 **Drizzle ORM**을 사용하여 타입 안전한 데이터베이스 접근을 제공합니다.

### 마이그레이션 실행
```bash
pnpm drizzle-kit push
```

### 마이그레이션 생성
```bash
pnpm drizzle-kit generate
```

## 📦 배포

프로젝트는 **Vercel**을 통해 배포됩니다.

- **자동 배포**: `main` 브랜치에 푸시되면 자동으로 배포
- **환경별 배포**: Staging 및 Production 환경 분리

## 📝 개발 가이드

### 코드 스타일
- **Prettier** - 코드 포맷팅 (`pnpm format`)
- **TypeScript** - 엄격한 타입 체크

### 테스트
```bash
pnpm test      # 단위 테스트 실행
pnpm test:ui   # 테스트 UI 실행
```

### 린팅
```bash
pnpm lint      # 린팅 검사
```

## 🤝 기여 가이드

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 라이선스

이 프로젝트의 라이선스 정보는 LICENSE 파일을 참조하세요.

## 📞 연락처

- 📧 이메일: [레아쥬 공식 웹사이트](https://reage.co.kr)
- 🌐 웹사이트: https://reage.co.kr

---

**Made with ❤️ using [Manus](https://manus.so)**