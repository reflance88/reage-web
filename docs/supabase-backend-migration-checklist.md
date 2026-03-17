# REAGE — Express 제거 및 Supabase 백엔드 일원화 체크리스트

> 작성일: 2026-03-17  
> 목표: `Node/Express + tRPC + 서버 쿠키 처리` 구조를 `Supabase Auth + Postgres/RLS + RPC + Edge Functions` 구조로 전환  
> 전제: 프론트는 Vercel 배포, 서버 런타임은 장기적으로 제거

## 1. 목표 구조

최종 구조는 아래를 기준으로 잡는다.

- 프론트엔드: `Vercel` 정적/SPA 배포
- 인증: `Supabase Auth`
- 데이터 접근: `Supabase PostgREST + RLS + SQL RPC`
- 서버 비밀키 작업: `Supabase Edge Functions`
- 파일 저장: 가능하면 `Supabase Storage`
- 배치/후처리: `Supabase Cron`, `Database Webhooks`

핵심 원칙은 간단하다.

- 브라우저에서 가능한 CRUD는 `RLS`로 직접 처리
- 비밀키가 필요한 작업만 `Edge Function`
- `Express`는 최종적으로 제거

## 2. 현재 Express가 맡는 역할

현재 메인 Express 엔트리는 [server/_core/index.ts](/Users/yoo/dev/reage-web/server/_core/index.ts)다.

현재 Express 책임은 아래 네 가지다.

1. 인증 REST 엔드포인트
2. tRPC API 라우팅
3. Toss/3PL/알림 등 외부 연동
4. 개발/운영 정적 파일 서빙

이 중 `4`는 Vercel로 바로 대체 가능하고, `1~3`은 Supabase 계층으로 나눠 옮기면 된다.

## 3. 파일별 분류

### A. 최종 삭제 대상

- [server/_core/index.ts](/Users/yoo/dev/reage-web/server/_core/index.ts)
- [server/index.ts](/Users/yoo/dev/reage-web/server/index.ts)
- [server/_core/vite.ts](/Users/yoo/dev/reage-web/server/_core/vite.ts)
- [server/_core/trpc.ts](/Users/yoo/dev/reage-web/server/_core/trpc.ts)
- [server/_core/context.ts](/Users/yoo/dev/reage-web/server/_core/context.ts)
- [server/routers.ts](/Users/yoo/dev/reage-web/server/routers.ts)
- [server/routers/supabase.ts](/Users/yoo/dev/reage-web/server/routers/supabase.ts)

### B. Supabase Auth / 브라우저 직결로 대체

- [server/_core/emailAuth.ts](/Users/yoo/dev/reage-web/server/_core/emailAuth.ts)
- [server/_core/authSession.ts](/Users/yoo/dev/reage-web/server/_core/authSession.ts)
- [server/_core/requestProtection.ts](/Users/yoo/dev/reage-web/server/_core/requestProtection.ts)
- [server/_core/oauth.ts](/Users/yoo/dev/reage-web/server/_core/oauth.ts)
- [server/_core/socialOAuth.ts](/Users/yoo/dev/reage-web/server/_core/socialOAuth.ts)
- [server/_core/sdk.ts](/Users/yoo/dev/reage-web/server/_core/sdk.ts)

### C. SQL/RPC/RLS로 이관

- [server/db.ts](/Users/yoo/dev/reage-web/server/db.ts)
- [server/supabase-db.ts](/Users/yoo/dev/reage-web/server/supabase-db.ts)
- [server/checkout.ts](/Users/yoo/dev/reage-web/server/checkout.ts)

### D. Edge Function으로 이관

- [server/webhooks/3pl.ts](/Users/yoo/dev/reage-web/server/webhooks/3pl.ts)
- `Toss 승인/취소` 로직이 들어 있는 [server/routers.ts](/Users/yoo/dev/reage-web/server/routers.ts)
- [server/_core/mailer.ts](/Users/yoo/dev/reage-web/server/_core/mailer.ts)
- [server/_core/kakao.ts](/Users/yoo/dev/reage-web/server/_core/kakao.ts)
- [server/_core/sms.ts](/Users/yoo/dev/reage-web/server/_core/sms.ts)
- [server/_core/imageGeneration.ts](/Users/yoo/dev/reage-web/server/_core/imageGeneration.ts)
- [server/storage.ts](/Users/yoo/dev/reage-web/server/storage.ts)
- [server/_core/dataApi.ts](/Users/yoo/dev/reage-web/server/_core/dataApi.ts)
- [server/_core/voiceTranscription.ts](/Users/yoo/dev/reage-web/server/_core/voiceTranscription.ts)

### E. 유지하되 위치만 재조정

- [drizzle/schema-pg.ts](/Users/yoo/dev/reage-web/drizzle/schema-pg.ts)
- [drizzle/migrations-pg/0005_checkout_and_reviews.sql](/Users/yoo/dev/reage-web/drizzle/migrations-pg/0005_checkout_and_reviews.sql)
- [drizzle/migrations-pg/0006_saved_addresses_rls.sql](/Users/yoo/dev/reage-web/drizzle/migrations-pg/0006_saved_addresses_rls.sql)
- [shared/commerce.ts](/Users/yoo/dev/reage-web/shared/commerce.ts)

## 4. 단계별 이관 순서

## Phase 0. 선행 정리

- `Supabase Auth`를 기준 세션 모델로 확정한다.
- `Manus OAuth fallback`은 제거 대상으로 표시만 하고, 당장은 로그인 장애 방지용으로 유지한다.
- `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` 외의 레거시 인증 env를 정리한다.
- `APP_BASE_URL`는 프론트 URL 기준으로만 유지하고, 서버 origin 검증 용도는 점진 제거한다.

완료 기준:

- 신규 로그인은 모두 Supabase 세션만 사용
- `server/_core/sdk.ts` 의존도 축소 시작

## Phase 1. 인증 완전 Supabase화

### 해야 할 일

- 프론트는 `supabase.auth`만 사용하도록 고정
- `/api/auth/*` 경로 의존 제거
- 프로필 생성/동기화는 `DB trigger` 또는 `Auth Hook`으로 이동
- 관리자 유저 생성만 `Edge Function` 또는 제한된 서버 경로로 남김

### 우선 대상 파일

- [server/_core/emailAuth.ts](/Users/yoo/dev/reage-web/server/_core/emailAuth.ts)
- [server/_core/authSession.ts](/Users/yoo/dev/reage-web/server/_core/authSession.ts)
- [server/_core/context.ts](/Users/yoo/dev/reage-web/server/_core/context.ts)
- [client/src/lib/supabase-browser.ts](/Users/yoo/dev/reage-web/client/src/lib/supabase-browser.ts)

### 체크포인트

- `Google`, `Kakao`는 Supabase provider 사용
- `Naver`는 native provider가 아니므로 별도 Edge Function OAuth로 남기거나 제거
- `profiles` 자동 생성은 서버 코드가 아니라 DB 레벨로 옮김

완료 기준:

- [server/_core/emailAuth.ts](/Users/yoo/dev/reage-web/server/_core/emailAuth.ts) 삭제 가능
- [server/_core/context.ts](/Users/yoo/dev/reage-web/server/_core/context.ts) 삭제 가능

## Phase 2. 읽기/쓰기 API를 RLS + RPC로 이관

### 해야 할 일

- `public read`는 브라우저에서 직접 `select`
- `user-scoped write`는 RLS 정책으로 직접 `insert/update`
- `복잡한 주문 계산`, `재고 차감`, `쿠폰 사용 처리`는 SQL 함수(RPC)로 이동

### 우선 대상 도메인

1. 상품 조회
2. 리뷰 조회/작성
3. 마이페이지 주문 조회
4. 저장 배송지 CRUD
5. 쿠폰/할인코드 조회

### SQL 함수로 옮길 후보

- 주문 생성 전 `checkout quote`
- 쿠폰/할인코드 검증
- 주문 생성과 재고 차감
- 주문 취소와 재고 복구

### 우선 대상 파일

- [server/db.ts](/Users/yoo/dev/reage-web/server/db.ts)
- [server/checkout.ts](/Users/yoo/dev/reage-web/server/checkout.ts)
- [server/supabase-db.ts](/Users/yoo/dev/reage-web/server/supabase-db.ts)
- [shared/commerce.ts](/Users/yoo/dev/reage-web/shared/commerce.ts)

완료 기준:

- 상품/리뷰/주소/쿠폰 조회를 위해 서버 API가 더 이상 필요하지 않음
- `checkout quote`가 `rpc('build_checkout_quote')` 같은 형태로 대체됨

## Phase 3. 결제/외부 연동을 Edge Functions로 이관

Express를 없앨 때 가장 중요한 단계다. 이 단계가 끝나야 실제 서버 런타임을 없앨 수 있다.

### Edge Function 후보

1. `payment-confirm`
2. `payment-cancel`
3. `payment-fail-cleanup`
4. `3pl-shipping-webhook`
5. `3pl-order-collected`
6. `send-order-mail`
7. `send-kakao-alimtalk`
8. `send-sms`
9. `admin-create-user`
10. `upload-image-variants`

### 우선 대상 파일

- [server/webhooks/3pl.ts](/Users/yoo/dev/reage-web/server/webhooks/3pl.ts)
- [server/_core/mailer.ts](/Users/yoo/dev/reage-web/server/_core/mailer.ts)
- [server/_core/kakao.ts](/Users/yoo/dev/reage-web/server/_core/kakao.ts)
- [server/_core/sms.ts](/Users/yoo/dev/reage-web/server/_core/sms.ts)
- [server/_core/imageGeneration.ts](/Users/yoo/dev/reage-web/server/_core/imageGeneration.ts)
- [server/storage.ts](/Users/yoo/dev/reage-web/server/storage.ts)
- [server/routers.ts](/Users/yoo/dev/reage-web/server/routers.ts)

### 이관 원칙

- `secret key` 필요한 작업은 브라우저에서 직접 호출하지 않는다
- `service_role` 필요한 작업은 Edge Function 내부로 한정한다
- 3PL/Toss는 서명 검증과 idempotency를 Edge Function에서 처리한다

완료 기준:

- `/api/webhooks/*` 와 `/api/trpc`에서 외부 연동 로직이 사라짐
- 결제 완료/취소/배송 상태 변경이 모두 Edge Function 기반

## Phase 4. 관리자 기능 재구성

현재 관리자 기능은 서버 의존도가 높다. 전부 브라우저 직결로 가기보다는 `혼합 구조`가 현실적이다.

### 브라우저 직결 가능

- 상품/리뷰/쿠폰/할인코드 조회
- 단순 CRUD

### Edge Function 유지 권장

- 관리자 사용자 생성
- 대량 업로드
- 이미지 리사이즈
- 대량 상태 변경
- 감사 로그 강제 기록

### 우선 대상 파일

- [client/src/pages/AdminPage.tsx](/Users/yoo/dev/reage-web/client/src/pages/AdminPage.tsx)
- [server/routers.ts](/Users/yoo/dev/reage-web/server/routers.ts)
- [server/supabase-db.ts](/Users/yoo/dev/reage-web/server/supabase-db.ts)

완료 기준:

- 관리자 화면의 데이터 소스가 `tRPC`가 아니라 `Supabase client + Edge Functions` 조합이 됨

## Phase 5. Express 제거

아래 조건이 만족되면 Express를 제거한다.

- 인증 REST 제거 완료
- tRPC 제거 완료
- 결제/웹훅/메일/알림 이관 완료
- 관리자 기능이 Supabase 기반으로 동작

제거 대상:

- [server/_core/index.ts](/Users/yoo/dev/reage-web/server/_core/index.ts)
- [server/index.ts](/Users/yoo/dev/reage-web/server/index.ts)
- [server/_core/vite.ts](/Users/yoo/dev/reage-web/server/_core/vite.ts)
- [server/routers.ts](/Users/yoo/dev/reage-web/server/routers.ts)
- [server/_core/trpc.ts](/Users/yoo/dev/reage-web/server/_core/trpc.ts)

최종 배포 구조:

- `Vercel`: 프론트 SPA
- `Supabase`: DB/Auth/Storage/RPC
- `Supabase Edge Functions`: 서버성 작업

## 5. 바로 시작할 1차 작업

우선순위는 아래 순서가 맞다.

1. `주문/결제 quote`를 SQL RPC로 설계
2. `Toss confirm/cancel`을 Edge Function으로 분리
3. `3PL webhook`을 Edge Function으로 분리
4. `products/reviews/addresses`를 RLS 직결로 바꾸기
5. `tRPC auth/session` 제거

이 다섯 개가 끝나면 Express 제거 난이도가 급격히 낮아진다.

## 6. 주의사항

- `Naver login`은 Supabase native provider가 아니다. 별도 OAuth 구현이 필요하다.
- `sharp`, `smtp`, `알림톡`, `sms`는 브라우저 직결 대상이 아니다.
- `service_role` 키는 브라우저에 절대 노출하면 안 된다.
- 주문/결제/재고 로직은 `RLS만으로 해결`하려 하지 말고 `RPC + transaction`으로 묶어야 한다.
- 기존 `drizzle`은 마이그레이션 도구로는 유지해도 된다. 앱 런타임에서 Node 서버 의존은 제거 대상이다.

## 7. 완료 판정

아래가 가능하면 Express 제거가 끝난 것이다.

- 프론트 배포가 `Vercel`만으로 끝남
- `/api/trpc`와 `/api/auth`에 의존하는 코드가 없음
- 모든 비밀키 작업이 `Supabase Edge Functions`에 있음
- 일반 사용자 CRUD는 `RLS`로 보호됨
- 관리자/결제/웹훅만 `Edge Functions`를 통함
