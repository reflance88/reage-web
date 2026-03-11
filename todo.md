# REAGE 웹사이트 TODO

## 완료된 항목
- [x] 전체 페이지 도입 현황 숫자 통일 (아시아 1450+, 일본 에스테틱 400+, 일본 의료 800+, 한국 250+)
- [x] 브랜드소개(brand-intro.html) 타임라인 스토리텔링 재작성
- [x] 레아쥬테라피 페이지 숫자 1450+ 수정
- [x] 레아쥬테라피 측정데이터 이미지 영역 추가 (560×320px, 4개)
- [x] 레아쥬테라피 고객 체험예약 버튼 전면 삭제
- [x] 아카데미 교육장소 네이버 지도 위젯 삽입 (학동로20길 19-3 / 학동로20길 39)
- [x] 아카데미 현장 학습 교육장 주소 수정 (학동로20길 39, 1층)
- [x] 후기 페이지 메디컬 에스테틱 섹션 삭제
- [x] 갤러리/매거진 세부 카테고리 탭 제거
- [x] 매거진 최신 9개 표시 + 더보기 기능 구현
- [x] 레아쥬기기 페이지 누끼 이미지 적용
- [x] 풀스택 업그레이드 (web-db-user)
- [x] DB 스키마 설계 및 마이그레이션 (users, products, orders, order_items, business_verifications)
- [x] 제품 초기 데이터 시드 (6개 크림 제품)
- [x] 서버 라우터 구현 (auth, user, product, verification, order)
- [x] 마이페이지 구현 (내 정보, 주문내역, 사업자 인증)
- [x] 장바구니 페이지 구현
- [x] 결제 페이지 구현 (토스페이먼츠 연동 준비)
- [x] 결제 완료/실패 페이지 구현
- [x] 제품 상세 페이지 6개 생성 (S1, M2, F3, 신제품1~3) - 가격 차등 구매 박스 포함

## 보류 중인 항목 (나중에 한꺼번에 처리)
- [ ] 토스페이먼츠 클라이언트 키 / 시크릿 키 설정 (VITE_TOSS_CLIENT_KEY, TOSS_SECRET_KEY)

## 추후 작업 예정
- [ ] 제품 상세 페이지 실제 제품 이미지 삽입 (800×800px)
- [ ] 제품명/가격 확정 후 DB 시드 데이터 수정
- [ ] 매거진 실제 아티클 콘텐츠 업로드
- [ ] 브랜드 영상 삽입 (메인 VIDEO PLACEHOLDER)
- [ ] 갤러리 실제 사진 추가

## 완료된 항목 (헤더 + 로그인 시스템)
- [x] 전체 HTML 파일 헤더에 장바구니·로그인 버튼 추가
- [x] 로그인 페이지 구현 (이메일 + 카카오·네이버·구글 소셜 로그인)
- [x] 회원가입 페이지 구현
- [x] 아이디 찾기 페이지 구현
- [x] 비밀번호 찾기 페이지 구현
- [x] 서버 라우터 확장 (이메일 회원가입/로그인, 소셜 로그인 OAuth)

## 진행 중 (헤더 수정 + 관리자 페이지)
- [x] 전체 HTML 헤더에서 아카데미 버튼 제거
- [x] 관리자 페이지 구현 (사업자 인증 심사, 회원 관리, 주문 관리)
- [x] 서버 adminProcedure 기반 관리자 API 라우터 구현

## 관리자 페이지 전면 재구성 (기획서 v2)
- [x] DB 스키마: AdminAuditLog 테이블 추가, products.visible 컨럼 추가
- [x] DB 마이그레이션 (pnpm db:push)
- [x] 서버: 제품 가격 편집 API (AdminAuditLog 기록 포함)
- [x] 서버: 인증 검색 (이름/이메일/사업자번호), reviewed_by 저장
- [x] 서버: 주문 검색 (order_id/이메일/기간/상태), 주문 상세
- [x] 서버: 대시보드 요약 API (pending 인증 수, 오늘 주문 수, 전체 회원 수)
- [x] UI: 대시보드 탭 (요약 카드)
- [x] UI: 사업자 인증 관리 (검색/필터, 상세 모달, 승인/반려 confirm 모달)
- [x] UI: 제품 관리 (리스트 + 가격/visible/is_pro_only 편집, confirm 모달)
- [x] UI: 주문 조회 (검색/필터, 상세 모달, 읽기 전용)
- [ ] robots noindex 처리 (/admin)

## 대시보드 차트 시각화
- [x] 서버: 일별 주문 수 집계 쿼리 (최근 30일)
- [x] 서버: 일별 신규 가입자 수 집계 쿼리 (최근 30일)
- [x] 서버: 일별 매출 합계 집계 쿼리 (최근 30일)
- [x] 서버: 인증 상태별 현황 집계 쿼리 (pending/approved/rejected)
- [x] UI: 일별 주문 수 AreaChart
- [x] UI: 신규 가입자 수 BarChart
- [x] UI: 매출 추이 LineChart
- [x] UI: 인증 현황 PieChart

## 헤더 도입 상담 버튼 제거
- [x] 전체 HTML 파일 헤더에서 "도입 상담" 버튼 제거

## 관리자 페이지 카페24 구조 기반 재구성

### DB 스키마 확장
- [x] gallery_posts 테이블 (갤러리 게시물)
- [x] magazine_posts 테이블 (매거진 게시물)
- [x] post_images 테이블 (게시물 이미지)
- [x] popups 테이블 (팝업 관리)
- [x] page_views 테이블 (접속 통계)

### 서버 라우터 확장
- [x] 갤러리/매거진 CRUD API
- [x] 팝업 CRUD API
- [x] 통계 집계 API (매출/상품/고객/접속)
- [x] 이미지 업로드 API (S3)

### 관리자 사이드바 재구성
- [x] 주문 카테고리 (주문 대시보드, 전체 주문 조회, 입금전 관리, 배송 준비중, 배송 대기, 배송 중, 배송 완료, 취소/교환/반품/환불)
- [x] 상품 카테고리 (상품 대시보드, 상품 목록, 상품 등록, 상품 관리, 분류 관리, 재고 관리)
- [x] 고객 카테고리 (고객 대시보드, 회원 조회, 회원 관리, 사업자 인증)
- [x] 게시판 카테고리 (게시판 대시보드, 갤러리 관리, 매거진 관리, 글 작성/편집)
- [x] 통계 카테고리 (통계 대시보드, 매출분석, 상품분석, 고객분석, 접속통계)
- [x] 팝업 카테고리 (팝업 목록, 팝업 등록/수정)

### 게시판 관리 (갤러리·매거진 CMS)
- [x] 갤러리 글 목록/작성/편집/삭제
- [x] 매거진 글 목록/작성/편집/삭제
- [x] 네이버 블로그형 에디터 (텍스트 + 이미지 업로드)
- [x] 홈페이지 갤러리·매거진 페이지 DB 연동

### 통계 섹션
- [x] 매출분석 (일별/주별/월별/결제수단별/매출집계)
- [x] 상품분석 (판매순위, 취소/반품순위, 장바구니, 관심상품)
- [x] 고객분석 (요일별, 시간별, 회원등급별, 배송지역별, 적립금/예치금)
- [x] 접속분석 (전체 방문자, 많이 찾는 페이지, 체류시간 - PC/모바일 구분)

### 팝업 관리
- [x] 팝업 목록 (이미지 미리보기, 상태, 노출기간, 수정/삭제)
- [x] 팝업 등록/수정 (종류: PC/모바일/PC+모바일, 이미지 업로드, 링크 URL, 노출위치, 노출기간, 하단문구)
- [x] 홈페이지 팝업 렌더링 (메인 페이지에 활성 팝업 표시)

## 주문 관리 카페24 구조 업그레이드 (3PL 연동 포함)

- [x] orders 테이블에 배송 상태 컬럼 추가 (shippingStatus: pending_payment/ready/hold/shipping/delivered)
- [x] orders 테이블에 3PL 관련 필드 추가 (courierName, trackingNumber, externalOrderId, shippingAddress 등)
- [x] orderCancellations 테이블 (입금전취소/취소 관리)
- [x] orderExchanges 테이블 (교환 관리)
- [x] orderReturns 테이블 (반품 관리)
- [x] orderRefunds 테이블 (환불 관리)
- [x] cardCancellations 테이블 (카드 취소 조회)
- [x] thirdPartyLogs 테이블 (3PL 웹훅 로그)
- [x] 배송 상태 관리 API (ordersByShippingStatus, updateShipping)
- [x] 취소/교환/반품/환불/카드취소 CRUD API
- [x] 3PL 웹훅 엔드포인트 (POST /api/webhooks/3pl/shipping-update)
- [x] 3PL 수동 주문 등록 API (POST /api/webhooks/3pl/register-order)
- [x] 관리자 페이지 배송준비중/대기/배송중/완료 관리 페이지
- [x] 관리자 페이지 취소/교환/반품/환불/카드취소/관리자환불 관리 페이지
- [x] 주문 대시보드 실시간 매출현황 테이블
- [x] 주문 대시보드 오늘의 할 일 (입금전/배송준비중/취소신청/교환신청/반품신청/환불전)
- [x] 주문 대시보드 오늘 처리한 일 (배송완료/취소완료/교환완료/반품완료/환불완료)

## 주문 상세 페이지 구현 (카페24 스타일)

- [x] 주문 상세 API 확장 (주문자/수령자/결제/취소/교환/반품/환불 정보 포함)
- [x] 주문 상세 모달 컴포넌트 - 9개 탭 (주문/CS, 결제정보, 결제수단, 환불정보, 현금영수증, 세금계산서, 주문자정보, 수령자정보, 관리자메모)
- [x] 전체 주문 조회에서 주문번호 클릭 시 상세 모달 연결

## 토스페이먼츠 결제 연동

- [x] VITE_TOSS_CLIENT_KEY 환경변수 등록
- [x] TOSS_SECRET_KEY 환경변수 등록
- [x] 결제 흐름 코드 점검 (CheckoutPage, PaymentSuccessPage, 서버 confirmPayment)

## 결제 시스템 고도화

### 배송지 입력 필드
- [x] CheckoutPage에 수령인 이름·연락처·주소·상세주소·우편번호 입력 필드 추가
- [x] 주문 생성 시 배송지 정보를 orders 테이블에 저장
- [x] 배송지 미입력 시 결제 버튼 비활성화 처리

### 라이브 API 키 전환
- [x] 라이브 VITE_TOSS_CLIENT_KEY 등록
- [x] 라이브 TOSS_SECRET_KEY 등록

### 결제 취소 기능
- [x] 서버: cancelTossPayment 함수 구현 (토스 취소 API 호출)
- [x] 서버: order.cancel tRPC 프로시저 구현 (관리자 전용)
- [x] 관리자 페이지: 전체 주문 조회에서 결제완료 주문 취소 버튼 연결
- [x] 관리자 페이지: 취소 확인 다이얼로그 구현

## UX 및 알림 고도화

### 카카오 주소 검색 API 연동
- [x] CheckoutPage에 Daum Postcode 스크립트 로드
- [x] 우편번호 찾기 버튼 클릭 시 카카오 주소 검색 팝업 오픈
- [x] 검색 결과로 우편번호·주소 자동 입력

### 마이페이지 주문 취소 (24시간 이내)
- [x] 서버: order.cancelByUser 프로시저 구현 (결제 후 24시간 이내 본인만 가능)
- [x] 마이페이지: 주문 목록에서 취소 가능 주문에 취소 버튼 표시
- [x] 취소 확인 다이얼로그 및 토스 취소 API 연동

### 주문 완료 문자 발송
- [x] 알리고 SMS API 조사 및 헬퍼 구현 (server/_core/sms.ts)
- [x] 주문 완료 시 고객에게 주문 내역 문자 발송 (order.verify 후 비동기)
- [x] 주문 완료 시 관리자에게 새 주문 알림 문자 발송 (ADMIN_PHONE 환경변수 필요)

## 갤러리·매거진·후기 관리 고도화

### 갤러리 상세 연결
- [x] 일반 홈페이지 갤러리 사진 클릭 시 gallery-detail.html 상세 페이지 이동
- [x] 관리자 갤러리 새 글 작성 시 커버 이미지가 홈페이지 갤러리 왼쪽 상단에 표시 (기존 DB 연동 방식)

### 매거진 상세 연결
- [x] 일반 홈페이지 매거진 클릭 시 magazine-detail.html 상세 페이지 이동 (제목·초반 글 표시)

### 후기 관리 (관리자)
- [x] DB: reviews 테이블 추가 (카테고리, 이미지 URL, 설명 등)
- [x] 서버: review tRPC 프로시저 구현 (목록 조회, 생성, 삭제)
- [x] 관리자 페이지: 게시판 카테고리 안 갤러리 관리 위에 후기 관리 추가
- [x] 후기 관리: 카테고리별 사진 업로드 기능
- [x] 후기 관리: 기존 업로드 사진 목록 표시

### 관리자 사이드바 초기 닫힘 상태
- [x] 관리자 페이지 모든 카테고리 세부 항목 초기 닫힘(collapsed) 상태로 변경

## 후기·갤러리·SMS 고도화

### 후기 페이지 DB 연동
- [x] review.html 전체 탭: DB에서 최신순으로 후기 사진 표시
- [x] review.html 카테고리 탭: 비포&애프터·디바이스·교육·이벤트·기타 각각 DB 연동
- [x] 정적 더미 콘텐츠 제거 후 DB 데이터로 대체

### 갤러리 상세 이미지 슬라이더
- [x] gallery-detail.html에 이미지 슬라이더 추가 (여러 장 업로드 시 슬라이드 형태, 터치·키보드 지원)
- [x] gallery.byId API에 postImages 포함하여 다중 이미지 지원

### SMS 문자 내용 수정
- [x] 주문 완료 시 고객 문자 내용 실제 운영에 맞게 수정
- [x] 배송 운송장번호 등록 시 고객 문자 발송 함수 구현 및 내용 수정
- [x] 전체 SMS 발송 시나리오 및 내용 리스트업

## 카카오 알림톡 연동

- [x] 알림톡 템플릿 초안 8개 작성 (docs/kakao-alimtalk-templates.md)
- [x] server/_core/kakao.ts 알림톡 발송 헬퍼 구현 (알리고 API 기반)
- [x] routers.ts SMS 코드 → 알림톡으로 전체 교체 (주문완료·배송시작·취소 시나리오)
- [x] TypeScript 에러 0개 확인

## 라이트박스 및 헤더 복구

- [x] 후기 페이지(review.html) 이미지 클릭 시 라이트박스 확대 보기 구현
- [x] 제품소개 상세 페이지 헤더 복구 (레아쥬기기 제외한 나머지 상세 페이지)

## 메인 히어로 영상 교체

- [x] index-main.html VIDEO PLACEHOLDER를 유튜브 임베드(LY5Wwt3vfi0)로 교체
- [x] 영상 비율 및 주변 디자인 조정

## 유튜브 영상 자동재생

- [x] 유튜브 임베드 URL에 autoplay=1&mute=1&loop=1 파라미터 추가

## 유튜브 영상 UI 오버레이

- [x] 유튜브 iframe 위 투명 오버레이로 제목/공유 버튼 숨기기

## 헤더 로그인 버튼 + 영상 소리 제어

- [x] 헤더 마이페이지 버튼 오른쪽에 로그인 버튼 추가
- [x] 영상 위 소리 끄기/켜기 토글 버튼 추가
- [x] 영상 초기 소리 켜짐 상태로 시작 (mute=0)

## 대규모 업데이트 (2026-03-03)

- [x] 영상 소리 끄기 버튼 제거 (소리 자동 켜짐 유지)
- [x] 레아쥬기기 상단 이미지 교체 (240502_signaturemz(visual)2955.jpg)
- [x] 브랜드스토리 낙 원인 분석 및 성능 개선
- [x] 갤러리 인증강사 카테고리 추가 (4열 정사각형 그리드)
- [x] 관리자 페이지 인증강사 사진 업로드 기능 추가
- [x] DB 스키마 멤버십 등급 추가 (membership)
- [x] 멤버십 등급 할인 로직 구현 (전문가보다 더 높은 할인율)
- [x] 관리자 페이지 멤버십 등급 관리 기능 추가

## 갤러리 드롭다운 인증강사 메뉴 추가

- [x] 전체 HTML 헤더 갤러리 드롭다운에 인증강사 세부 카테고리 링크 추가

## 인증강사 페이지 재구현 (별도 페이지)

- [x] gallery.html에서 인증강사 탭/섹션/JS 완전 제거
- [x] instructor.html 목록 페이지 신규 구현 (4열 정사각형 그리드, 클릭 시 상세 이동)
- [x] instructor-detail.html 상세 페이지 신규 구현 (갤러리 상세 스타일)
- [x] 전체 HTML 헤더 갤러리 드롭다운 링크를 instructor.html로 교체

## 프로모션 카테고리 구현 (2026-03-03)

- [x] DB 스키마: coupons, discountCodes, remindAlerts 테이블 추가
- [x] DB 마이그레이션 실행
- [x] server/db.ts: 쿠폰/할인코드/리마인드 CRUD 함수 추가
- [x] server/routers.ts: 쿠폰/할인코드/리마인드 admin API 추가
- [x] 관리자 사이드바에 프로모션 카테고리 추가 (게시판 아래, 통계 위)
- [x] 프로모션 대시보드 구현
- [x] 쿠폰 만들기 페이지 구현 (카페24 스타일)
- [x] 쿠폰 발급/조회 페이지 구현
- [x] 할인코드 등록 페이지 구현
- [x] 할인코드 조회 페이지 구현
- [x] 리마인드 Me 알림 등록 페이지 구현
- [x] 리마인드 Me 알림 관리 페이지 구현
- [x] TypeScript 오류 0개 확인

## 자체 서버용 소셜 OAuth 연동 코드 작성

- [x] server/_core/socialOAuth.ts: 카카오/네이버/구글 OAuth 헬퍼 작성
- [x] server/_core/index.ts: registerSocialOAuthRoutes 조건부 등록 (환경변수 있을 때만 활성화)
- [x] client/src/const.ts: getSocialLoginUrl() 함수 추가
- [x] TypeScript 에러 0개 확인

## 이메일 비밀번호 찾기 실제 발송 구현

- [x] nodemailer 패키지 설치
- [x] server/_core/mailer.ts: SMTP 이메일 발송 헬퍼 작성
- [x] server/routers.ts: requestPasswordReset에 실제 이메일 발송 로직 추가
- [x] 비밀번호 재설정 이메일 HTML 템플릿 작성
- [x] SMTP 환경변수 설정 안내 (SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM)
- [x] TypeScript 에러 0개 확인

## 크림 누끼 이미지 적용 및 Supabase 연결 테스트

- [x] S1크림 누끼 이미지를 product-s1 상세페이지에 적용
- [x] M2크림 누끼 이미지를 product-m2 상세페이지에 적용
- [x] F3크림 누끼 이미지를 product-f3 상세페이지에 적용
- [x] Supabase 연결 테스트 및 23개 테이블 생성 확인 (REST API 연결 성공, SQL 마이그레이션 파일 생성 완료)

## 모바일 렌더링 수정

- [x] 모바일에서 IntersectionObserver 미작동으로 텍스트/이미지 opacity:0 고정 문제 수정 (index-main.html) - CSS 폴백 + DOMContentLoaded 래핑

## Supabase 전체 연동

- [x] @supabase/supabase-js 패키지 설치
- [x] server/_core/supabase.ts 서버 클라이언트 모듈 생성
- [x] server/supabase-db.ts DB 헬퍼 모듈 생성 (contact_inquiries, reviews, gallery, magazine, logs)
- [x] server/routers/supabase.ts tRPC 라우터 생성 (sbContact, sbReview, sbGallery, sbMagazine, sbLog)
- [x] server/routers.ts에 Supabase 라우터 등록
- [x] contact.html 문의 폼 → sbContact.create API 연동
- [x] review.html → sbReview.list API 연동
- [x] gallery.html → sbGallery.list API 연동
- [x] magazine.html → sbMagazine.list API 연동
- [x] index-main.html 수익 시뮬레이터 → sbLog.revenueSimulator API 연동
- [x] TypeScript 에러 0개 확인
- [x] 전체 vitest 테스트 9/9 통과

## 문의 폼 오류 수정 및 관리자 문의 관리 기능

- [x] inquiry_type ENUM 불일치 수정 (DB: trial/introduction/education, 코드: experience_booking/business_consultation/education_inquiry/general)
- [x] inquiry_status ENUM 불일치 수정 (DB: received/contacted/closed, 코드: pending/in_progress/resolved/closed)
- [x] contact.html 폼 inquiry_type 값 DB ENUM에 맞게 수정
- [x] supabase-db.ts 타입 정의 DB ENUM에 맞게 수정
- [x] server/routers/supabase.ts zod 스키마 DB ENUM에 맞게 수정
- [x] Supabase 문의 저장 실제 테스트 (성공 확인)
- [x] 관리자 페이지에 Supabase 문의 목록 조회 기능 추가
- [x] 관리자 페이지에 문의 상태 변경 기능 추가 (received/contacted/closed)
- [x] 관리자 페이지에 문의 상세 모달 추가

## 문의 알림 이메일 / 엑셀 내보내기 / 개인정보 동의 연동

- [x] 이메일 발송 라이브러리 선택 및 설치 (Resend 또는 Nodemailer)
- [x] 이메일 발송 서버 헬퍼 구현 (server/email.ts)
- [x] sbContact.submit 뮤테이션에 이메일 알림 발송 연동 (reflance88@gmail.com)
- [x] 이메일 템플릿 작성 (문의 유형, 이름, 연락잘, 내용 포함)
- [x] 관리자 페이지 문의 목록 엑셀 내보내기 버튼 추가
- [x] 엑셀 내보내기 tRPC 엔드포인트 구현 (sbContact.export)
- [x] contact.html 개인정보 동의 체크박스 값 payload에 포함 (privacy_agreed)
- [x] supabase-db.ts InsertContactInquiry에 privacy_agreed 필드 추가
- [x] server/routers/supabase.ts zod 스키마에 privacy_agreed 추가
- [x] 이메일 발송 vitest 테스트 작성

## 문의 통계 대시보드

- [x] supabase-db.ts에 통계 쿼리 함수 추가 (월별, 유형별, 상태별)
- [x] sbContact.stats tRPC 엔드포인트 구현
- [x] 관리자 사이드바에 '문의 통계' 메뉴 추가
- [x] 월별 문의 건수 막대 차트 구현 (최근 12개월)
- [x] 유형별 비율 파이 차트 구현 (체험예약/도입상담/교육문의)
- [x] 처리율 현황 카드 구현 (접수/연락완료/종료 건수 및 비율)
- [x] 요약 KPI 카드 구현 (전체 문의, 이번 달, 미처리, 처리율)- [x] 통계 vitest 테스트 작성

## 통계/대시보드 기간 필터 + 퍼널/지역 차트 + 상품 관리

- [x] 문의 통계 대시보드 기간 필터 추가 (3개월/6개월/1년/전체)
- [x] 주문 대시보드 기간 필터 추가 (3개월/6개월/1년/전체)
- [x] 도입상담 전환 퍼널 차트 추가 (체험예약→도입상담→교육문의 전환율)
- [x] 지역별 문의 분포 막대 차트 추가
- [x] Supabase products 테이블 스키마 설계 및 생성
- [x] 상품 관리 tRPC 엔드포인트 구현 (목록/상세/생성/수정/삭제)
- [x] 관리자 사이드바에 상품 관리 메뉴 추가
- [x] 상품 목록 페이지 구현 (카페24 스타일, 상품코드/상품명/판매가/할인가/URL 복사)
- [x] 상품 상세/수정 페이지 구현 (탭 구조: 기본정보/판매정보/이미지정보/제작정보/배송정보/SEO/메모)
- [x] 상품 등록 페이지 구현
- [x] 상품 URL 복사 기능 구현

## 상품 등록 S3 이미지 업로드 + 퍼널 차트 실제 데이터 연동

- [x] 서버 이미지 업로드 tRPC 엔드포인트 구현 (S3 storagePut 연동)
- [x] 상품 등록 페이지에 이미지 업로드 UI 추가 (클릭 업로드 + 미리보기)
- [x] 업로드된 이미지 URL DB 저장 연동
- [x] 퍼널 차트 전환 로직 구현 (phone/email 기반 동일 고객 매칭)
- [x] getInquiryStats에 실제 전환 데이터 추가 (trial→introduction→education 전환 건수 + 전환율)
- [x] 퍼널 차트 UI 실제 전환율 표시로 업데이트
- [x] 상품 삭제 기능 추가 (deleteProduct 엔드포인트 + 삭제 버튼)
- [ ] 이미지 업로드 vitest 테스트 작성

## 2026-03-11 대규모 업데이트

- [x] 사업자 인증 신청 시 이메일 알림 발송 (신청자 + 관리자 동시 발송)
- [x] 홈페이지 헤더 버튼: 비로그인=장바구니+로그인, 로그인=장바구니+마이페이지 (header-auth.js 전담)
- [x] 멤버십 등급 필터 버그 수정 (membershipGrade → memberRole 필드명 수정)
- [x] 상품 가격 구조 변경: 공급가 제외, 판매가(일반)/판매가(전문가)/판매가(멤버십) 3개로 분리
- [x] 상품 상세 내용 홈페이지 상세페이지 DB 연동 (이름/설명/가격 동적 렌더링)
- [x] 상품코드 자동생성 R00000AA~R00000ZZ 형식
- [x] 관리자 페이지 상품 추가/삭제 기능 (새 상품 추가 시 동적 상세페이지 연동)
- [x] 상품 목록 체크박스 일괄 노출 상태 변경
- [x] 디자인 카테고리 추가 (디자인 대시보드, 디자인 보관함, 디자인 추가, 파일업로더)
- [x] 파일업로더 팝업 구현 (S3 연동, 폴더 관리, 파일 목록/검색/삭제)
- [x] 디자인/파일 DB 테이블 설계 + Supabase SQL 생성 (docs/supabase-schema.sql)
- [x] 상품 DB Supabase 확인 (priceMembership 필드 추가, DB 마이그레이션 완료)
- [x] 장바구니 '제품 정보를 불러오는 중' 오류 수정 (tRPC v11 json 래핑 방식 수정)

## 2026-03-11 동적 상품 상세페이지 + 등급별 가격 + 이미지 연동

- [x] DB 스키마 확장: features(JSON), howToUse(text), ingredients(text) 필드 추가
- [x] DB 마이그레이션 실행
- [x] product.bySlug API 전체 필드 반환 (features, howToUse, ingredients, priceMembership 포함)
- [x] 동적 상품 상세페이지 React 컴포넌트 구현 (/product/:slug)
- [x] 등급별 가격 표시 (일반/전문가/멤버십 등급에 따라 해당 가격 표시 + 등급 배지)
- [x] 관리자 상품 등록/수정에 디자인 보관함 이미지 선택 팝업 연동 (Dialog 컴포넌트)
- [x] S1/M2/F3 크림 콘텐츠 DB 시드 입력 (이름/요약설명/상세설명/특징/사용법/성분)
- [x] 기존 product-s1.html, product-m2.html, product-f3.html → /product/:slug 리다이렉트
- [x] ProductDetailPage.tsx에 features/howToUse/ingredients 편집 UI 추가

## 2026-03-11 상품 특징 구조화 폼 + shop.html DB 연동 + 이미지 리사이징

- [x] ProductDetailPage.tsx features 편집을 구조화된 폼으로 개선 (아이콘/제목/설명 각각 입력 필드) - 이미 구현되어 있음
- [x] reage-device.html 크림 제품 목록 DB 연동 (product.list API 호출하여 동적 렌더링, 등급별 가격 표시)
- [x] 디자인 보관함 이미지 업로드 시 자동 리사이징 (썸네일 300px/중간 800px/원본 3가지 사이즈) + DB 저장
- [x] sharp 패키지 설치 및 서버 이미지 리사이징 로직 구현 (이미 설치되어 있음, 사이즈 업그레이드 완료)

## 2026-03-11 이미지 리사이징 + shop DB 연동 + 헤더 드롭다운 DB 연동

- [x] 이미지 자동 리사이징 사이즈 업그레이드 (썸네일 300px crop, 중간 800px 비율유지) + DB에 thumbnailUrl/mediumUrl 저장
- [x] drizzle/schema.ts designFiles 테이블에 thumbnailUrl/mediumUrl 컨럼 추가 + DB 마이그레이션 (0013)
- [x] reage-device.html 제품소개 드롭다운 DB 연동 (product-nav-dropdown id 추가)
- [x] 전체 HTML 헤더 제품소개 드롭다운 DB 연동 (header-products.js 공통 스크립트 13개 파일 적용)
- [x] reage-device.html 크림 제품 목록 DB 연동 - 이미 완료되어 있음 (등급별 가격 표시 포함)

## 2026-03-11 관리자 페이지 7가지 개선

- [x] 디자인 보관함 파일 목록에 thumbnailUrl 우선 사용 (48px 썸네일 표시, 원본 폴백)
- [x] 드래그앤드롭 업로더 확인 - 이미 구현되어 있음 (Drag & Drop 영역 + Add Files 버튼)
- [x] 레아주→레아쥬 텍스트 수정 (product-s1.html.bak 4건 수정, 실제 HTML 파일에는 이미 레아쥬 사용 중)
- [x] 주문 팝업(OrderDetailModal) 크기 확장 (max-w-5xl → w-[95vw] max-w-[1400px])
- [x] 주문 대시보드 실시간 매출현황 개선 (총 실결제금액, 총 환불금액 행 추가, 이번달 데이터 연동)
- [x] getDashboardSummary에 monthOrders/monthRevenue/todayNetRevenue/monthNetRevenue/환불금액 추가
- [x] 입금전 관리 - 입금확인 버튼 추가 (클릭 시 created→paid 상태 변경, confirm 다이얼로그)
- [x] 전체 주문조회 컬럼 추가 (주문일, 총 상품 구매금액, 총 실결제금액, 결제수단)
- [x] 관리자 대시보드 데이터 연동 확인 (이미 trpc.admin.dashboard.useQuery()로 연동됨)

## 2026-03-11 주문관리 고도화

- [ ] 입금확인 버튼 클릭 시 카카오 알림톡 발송 (입금 확인 안내문자)
- [ ] 전체 주문조회 주문번호별/품목주문별 탭 전환
- [ ] 전체 주문조회 기간 필터 (오늘/1주/1개월/3개월/직접입력)
- [ ] 전체 주문조회 검색어 필터 (주문번호/주문자명/이메일/상품명)
- [ ] 엑셀 다운로드 팝업 구현 (양식 선택, 데이터 옵션, 다운로드 이력)
- [ ] 엑셀 양식 관리 팝업 구현 (양식 선택/편집/새 양식 추가, 항목 커스터마이징)
- [ ] DB 스키마: excelTemplates 테이블 추가 (양식명, 컬럼 목록, 정렬 기준)
- [ ] 서버: 엑셀 다운로드 API (선택한 양식 기준으로 실제 xlsx 파일 생성)

## 2026-03-11 주문관리 고도화

- [x] 입금확인 시 카카오 알림톡 발송 (sendBankTransferConfirmAlimtalk 함수 추가, updateOrderStatus created→paid 시 자동 발송)
- [x] 전체 주문조회 주문번호별/품목주문별 탭 구현
- [x] 전체 주문조회 기간 필터 (시작일/종료일) 및 검색 타입 셀렉트 추가
- [x] 엑셀 다운로드 모달 구현 (양식 선택, 데이터 옵션, 다운로드 이력)
- [x] 엑셀 양식관리 모달 구현 (양식 CRUD, 항목 커스터마이징, 순서 조정)
- [x] excelTemplates DB 테이블 추가 및 마이그레이션
- [x] exportOrders API 구현 (xlsx 패키지 사용, base64 반환)

## 2026-03-11 주문관리 추가 개선

- [ ] 주문 대시보드 실시간 매출현황 바로가기 버튼 연결 (주문조회/결제조회/환불조회 탭 이동)
- [ ] 관리자 페이지 이미지 업로더 드래그앤드롭 구현 (상품 대표이미지, 팝업 이미지, 후기 이미지 등)
- [ ] 전체 주문조회 페이지네이션 추가 (이전/다음 페이지 버튼)
- [ ] 전체 주문조회 컬럼 헤더 클릭 정렬 기능
- [ ] 전체 주문조회 표시 개수 선택 (20/50/100개)
- [ ] 엑셀 기본양식(주문번호기준) 초기 데이터 삽입
- [ ] 엑셀 기본양식(품목주문기준) 초기 데이터 삽입
- [ ] Supabase SQL 생성 (이전 SQL 요청 이후 추가된 모든 테이블)

## 헤더 드롭다운 버그 수정 + 리치 에디터 + 갤러리/매거진 연동 (2026-03-11)

- [x] 헤더 갤러리 드롭다운 버그 수정 (gallery.html, magazine.html에서 인증강사 세부카테고리 누락 수정)
- [x] 관리자 페이지 갤러리/매거진 글 작성 리치 텍스트 에디터 구현 (Tiptap 기반, 이미지 업로드/글씨체/크기/굵기/색상/정렬 등)
- [x] 관리자 갤러리/매거진 CRUD를 Supabase gallery_posts/magazine_posts 테이블로 통합
- [x] gallery.html DB 데이터 있을 때 정적 더미 아이템 숨기기
- [x] magazine.html DB 데이터 있을 때 정적 더미 아이템 숨기기
- [x] 주문 대시보드 바로가기 버튼 연결 (주문조회→전체, 결제조회→결제완료 필터, 환불조회→환불관리)
- [x] 전체 주문조회 헤더 클릭 정렬 기능 추가 (주문일/주문번호/금액/상태 등)
- [x] searchOrders db 함수 및 라우터에 sortCol/sortDir 파라미터 추가
- [x] Supabase PostgreSQL 연결 전환 (drizzle-orm/node-postgres, schema-pg.ts)
- [x] TypeScript 오류 0개, vitest 33 passed / 1 skipped

## 드래그앤드롭 업로더 + 상세 페이지 HTML 렌더링 (2026-03-11)

- [x] 드래그앤드롭 이미지 업로더 컴포넌트(DropzoneUploader) 구현
- [x] 상품 등록 폼에 드래그앤드롭 업로더 적용
- [x] 갤러리 글 작성 폼에 드래그앤드롭 업로더 적용
- [x] 매거진 글 작성 폼에 드래그앤드롭 업로더 적용
- [x] 인증강사 등록 폼에 드래그앤드롭 업로더 적용
- [x] gallery-detail.html 리치 에디터 HTML 콘텐츠 렌더링 구현
- [x] magazine-detail.html 리치 에디터 HTML 콘텐츠 렌더링 구현
