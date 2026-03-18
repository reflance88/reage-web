# Admin Page Refactor Architecture

## 목적

현재 관리자 화면은 [AdminPage.tsx](/Users/yoo/dev/reage-web/client/src/pages/AdminPage.tsx)에 대부분의 화면, 상태, 테이블, 모달, 차트, 폼 로직이 집중되어 있다. 이 구조는 기능 추가 속도는 빠르지만, 아래 문제가 있다.

- 기능 간 결합도가 높아 수정 범위가 커진다.
- `activePage` 문자열 상태에 의존해 URL 기반 진입, deep link, 권한 분리가 어렵다.
- 주문, 상품, 고객, 콘텐츠, 프로모션, 디자인 기능이 한 파일에 섞여 테스트와 코드리뷰 비용이 크다.
- 서버는 `adminProcedure`가 있음에도 다수 endpoint가 `protectedProcedure + role check` 패턴을 반복한다.

이 문서의 목표는 관리자페이지를 “기능 단위 모듈형 백오피스”로 재구성하는 것이다.

## 목표 상태

- `/admin/*` 하위 라우트 기반 구조
- 섹션별 코드 분리
- 재사용 가능한 테이블, 필터바, 모달, 배지 컴포넌트 정리
- 관리자용 tRPC hooks 계층 분리
- 서버 admin router 모듈화
- URL 기반 필터/정렬/페이지네이션 상태
- 현재 기능을 깨지 않고 단계적으로 전환 가능

## 설계 원칙

- 기존 디자인 언어는 유지한다. 리디자인보다 구조 분리가 우선이다.
- 한 번에 전면 교체하지 않는다. 섹션별 점진 이관을 기본 전략으로 잡는다.
- 비즈니스 로직은 UI 컴포넌트 밖으로 뺀다.
- 권한 검사는 프론트와 서버 모두 유지하되, 서버를 최종 기준으로 삼는다.
- 관리자 읽기/쓰기 API는 도메인별로 묶고, 공개 API와 분리한다.

## 프론트엔드 구조

### 현재

- 라우트 엔트리: [App.tsx](/Users/yoo/dev/reage-web/client/src/App.tsx)
- 관리자 메인: [AdminPage.tsx](/Users/yoo/dev/reage-web/client/src/pages/AdminPage.tsx)
- 일부 분리된 화면:
  - `PromotionSection`
  - `ProductDetailPage`
  - `OrderDetailModal`

### 목표 디렉터리

```text
client/src/admin/
  app/
    AdminApp.tsx
    AdminGuard.tsx
    AdminLayout.tsx
    AdminSidebar.tsx
    AdminTopbar.tsx
    admin-routes.tsx
  shared/
    components/
      AdminPageHeader.tsx
      AdminSectionCard.tsx
      AdminStatusBadge.tsx
      AdminSummaryCard.tsx
      AdminTable.tsx
      AdminFilterBar.tsx
      AdminConfirmModal.tsx
      AdminEmptyState.tsx
      AdminPagination.tsx
    hooks/
      useAdminFilters.ts
      useAdminModal.ts
      useAdminNavigation.ts
    utils/
      format.ts
      export.ts
      query.ts
  features/
    dashboard/
    orders/
    products/
    customers/
    content/
    promotions/
    stats/
    popups/
    design/
```

### 라우팅 설계

현재 `/admin` 단일 페이지 구조를 아래처럼 바꾼다.

```text
/admin
/admin/dashboard
/admin/orders
/admin/orders/unpaid
/admin/orders/shipping
/admin/orders/cancellations
/admin/products
/admin/products/new
/admin/products/:id
/admin/customers
/admin/customers/verifications
/admin/content/reviews
/admin/content/gallery
/admin/content/magazine
/admin/promotions/coupons
/admin/promotions/discount-codes
/admin/stats/sales
/admin/popups
/admin/design/files
```

라우터는 기존 `wouter`를 유지해도 충분하다. 전체 프레임워크 교체는 필요 없다.

### 레이아웃 설계

`AdminLayout`

- 좌측 사이드바
- 상단 breadcrumb / page title / 빠른 액션 영역
- 우측 메인 콘텐츠
- 모바일에서는 drawer sidebar

`AdminGuard`

- `trpc.auth.me.useQuery()`를 단 한 곳에서 호출
- `loading`, `unauthorized`, `forbidden`, `success` 상태를 통합 처리
- 이후 하위 feature는 `me` 재조회 대신 context 사용

### 상태 설계

상태는 세 종류로 나눈다.

- URL 상태
  - `page`, `search`, `status`, `sort`, `dateFrom`, `dateTo`, `viewType`
- 서버 상태
  - tRPC query/mutation 결과
- UI 상태
  - 모달 열림, 선택 row, 임시 입력값

원칙은 다음과 같다.

- 새로고침 후 유지되어야 하는 값은 URL query string에 둔다.
- API 응답은 React Query가 관리한다.
- 모달 open/close나 폼 dirty state만 component state로 둔다.

### 공통 컴포넌트 추출 기준

아래는 즉시 공통화 대상이다.

- `StatusBadge`
- `SummaryCard`
- `SectionHeader`
- `ConfirmModal`
- `TableShell`
- `FilterBar`
- `SearchInput`
- `DateRangeFilter`
- `ExportButton`

특히 `OrderSection`, `CustomerSection`, `StatsSection` 내부에 반복되는 표, 배지, 액션 버튼 패턴은 공통화 효과가 크다.

## 기능 모듈 설계

### 1. Dashboard

책임:

- 관리자 홈 KPI
- 최근 주문/최근 가입/인증 현황
- 운영 quick links

구성:

```text
features/dashboard/
  routes/DashboardPage.tsx
  components/KpiGrid.tsx
  components/OrderTrendChart.tsx
  components/SignupTrendChart.tsx
  hooks/useDashboardData.ts
```

### 2. Orders

책임:

- 전체 주문 조회
- 입금전/배송/완료/취소/환불/교환/반품
- 배송정보 수정
- 주문 상세 모달

구성:

```text
features/orders/
  routes/
    OrdersPage.tsx
    OrderUnpaidPage.tsx
    OrderShippingPage.tsx
    OrderCsPage.tsx
  components/
    OrderFilters.tsx
    OrderTable.tsx
    OrderItemTable.tsx
    ShippingEditorModal.tsx
    OrderStatusActions.tsx
  hooks/
    useOrderFilters.ts
    useOrderMutations.ts
```

핵심 개선:

- 지금처럼 `subPage` 조건문으로 모든 주문 화면을 분기하지 않는다.
- `배송`, `취소/교환/반품/환불`, `일반 주문목록`을 별도 page로 분리한다.

### 3. Products

책임:

- 상품 목록
- 상품 등록/수정
- 재고/노출/추천 관리
- 상세 편집 SEO 포함

구성:

```text
features/products/
  routes/
    ProductListPage.tsx
    ProductCreatePage.tsx
    ProductEditPage.tsx
    ProductStockPage.tsx
  components/
    ProductTable.tsx
    ProductFilters.tsx
    ProductForm.tsx
    ProductSeoForm.tsx
    ProductPricingForm.tsx
```

핵심 개선:

- 등록 form과 수정 form을 하나의 `ProductForm`으로 통합
- 가격/SEO/노출/상세설명을 서브폼으로 나눠 책임 분리

### 4. Customers

책임:

- 회원 조회/수정
- 사업자 인증 승인/반려
- 멤버십 등급 설정
- 문의 관리

구성:

```text
features/customers/
  routes/
    CustomerListPage.tsx
    VerificationPage.tsx
    MembershipPage.tsx
    InquiryPage.tsx
  components/
    CustomerTable.tsx
    VerificationTable.tsx
    InquiryTable.tsx
    MembershipEditorModal.tsx
```

핵심 개선:

- 일반 회원 관리와 문의 관리를 한 그룹에 두되, 라우트는 분리
- `sbContact` 기반 문의 기능은 별도 hook 레이어로 감싼다

### 5. Content

책임:

- 후기
- 갤러리
- 매거진
- 공인강사

구성:

```text
features/content/
  reviews/
  gallery/
  magazine/
  instructors/
```

핵심 개선:

- `board-*` 조건문 묶음을 도메인별 page로 분리
- 에디터, 이미지 업로드, publish 상태 변경은 공통 post editor로 일부 통합 가능

### 6. Promotions

책임:

- 쿠폰
- 할인코드
- 리마인드 알림

현재 [PromotionSection.tsx](/Users/yoo/dev/reage-web/client/src/pages/PromotionSection.tsx)를 기준으로 독립 feature로 승격한다.

```text
features/promotions/
  routes/
    PromotionDashboardPage.tsx
    CouponListPage.tsx
    CouponCreatePage.tsx
    DiscountCodePage.tsx
    RemindAlertPage.tsx
```

### 7. Stats

책임:

- 문의 통계
- 매출 분석
- 상품 분석
- 고객 분석
- 접속 통계

구성:

```text
features/stats/
  routes/
    InquiryStatsPage.tsx
    SalesStatsPage.tsx
    ProductStatsPage.tsx
    CustomerStatsPage.tsx
    AccessStatsPage.tsx
  components/
    ChartCard.tsx
    StatGrid.tsx
```

핵심 개선:

- 차트 렌더는 데이터 fetch와 분리
- KPI card와 chart card를 공통화

### 8. Popups

책임:

- 팝업 등록/수정/삭제
- 노출 기기/기간/링크/이미지 관리

구성:

```text
features/popups/
  routes/
    PopupListPage.tsx
    PopupCreatePage.tsx
    PopupEditPage.tsx
  components/
    PopupForm.tsx
    PopupCard.tsx
```

### 9. Design

책임:

- 디자인 파일 업로드
- 폴더 관리
- 썸네일/중간 이미지 파생본 관리
- 엑셀 템플릿 관리

구성:

```text
features/design/
  routes/
    DesignDashboardPage.tsx
    FileLibraryPage.tsx
    FileUploadPage.tsx
    ExcelTemplatePage.tsx
```

## 프론트 API 계층 설계

지금은 UI 컴포넌트가 `trpc.admin.*`, `trpc.adminExt.*`, `trpc.sbContact.*`를 직접 호출한다. 이를 feature hook 계층으로 한 번 감싼다.

예시:

```text
client/src/admin/features/orders/api.ts
client/src/admin/features/orders/hooks/useOrders.ts
client/src/admin/features/orders/hooks/useOrderMutations.ts
```

원칙:

- page 컴포넌트는 hook만 호출
- hook이 query key, invalidate, toast, optimistic update를 관리
- mutation success 후 refetch/invalidate 규칙을 일관되게 유지

## 서버 구조 설계

### 현재 문제

- [routers.ts](/Users/yoo/dev/reage-web/server/routers.ts)에 admin 라우트가 매우 크게 누적돼 있다.
- `adminProcedure`가 존재하지만 다수 endpoint가 `protectedProcedure` 후 수동 role check를 반복한다.
- `admin`과 `adminExt`로 경계가 나뉘어 있어 호출 지점이 직관적이지 않다.

### 목표 디렉터리

```text
server/routers/admin/
  index.ts
  dashboard.ts
  orders.ts
  products.ts
  customers.ts
  content.ts
  promotions.ts
  stats.ts
  popups.ts
  design.ts
```

### 목표 라우터 구성

```ts
export const adminRouter = router({
  dashboard: adminDashboardRouter,
  orders: adminOrdersRouter,
  products: adminProductsRouter,
  customers: adminCustomersRouter,
  content: adminContentRouter,
  promotions: adminPromotionsRouter,
  stats: adminStatsRouter,
  popups: adminPopupsRouter,
  design: adminDesignRouter,
});
```

그리고 최상위는 이렇게 단순화한다.

```ts
export const appRouter = router({
  auth: authRouter,
  user: userRouter,
  product: productRouter,
  order: orderRouter,
  admin: adminRouter,
  contact: sbContactRouter,
  review: sbReviewRouter,
  gallery: sbGalleryRouter,
  magazine: sbMagazineRouter,
  popup: sbPopupRouter,
});
```

### 권한 정책

서버는 아래 원칙으로 통일한다.

- 관리자 전용 API는 기본적으로 `adminProcedure`
- 단순 로그인 필요 API만 `protectedProcedure`
- 핸들러 내부의 반복 `if (ctx.user.role !== "admin")` 제거

예외:

- “로그인 필요하지만 관리자 전용은 아닌” API
- 사용자 본인 데이터 접근 API

## URL 상태 설계

관리자 화면에서 다음 값은 URL query로 옮기는 것이 맞다.

- 주문 목록:
  - `status`
  - `page`
  - `limit`
  - `search`
  - `searchType`
  - `sortCol`
  - `sortDir`
  - `viewType`
- 통계:
  - `days`
  - `months`
  - `dateFrom`
  - `dateTo`
- 상품:
  - `visible`
  - `category`
  - `stock`
  - `keyword`

이렇게 하면 링크 공유와 새로고침 복원이 쉬워진다.

## 테스트 전략

관리자 영역은 최소한 아래를 자동화한다.

- 권한 없음 사용자 `/admin/*` 접근 차단
- 관리자 계정 `/admin/*` 진입 성공
- 주문 검색/필터 query param 반영
- 상품 수정 mutation 성공 후 목록 invalidate
- 문의 상태 변경 성공
- 팝업 등록/수정/삭제 성공

우선순위:

- `server`: admin router unit/integration test
- `client`: 관리자 핵심 흐름 smoke test

## 단계별 이관 계획

### Phase 1

- `AdminGuard`, `AdminLayout`, `AdminSidebar` 추출
- `/admin` 진입만 새 구조로 감싼다
- 기존 [AdminPage.tsx](/Users/yoo/dev/reage-web/client/src/pages/AdminPage.tsx)는 그대로 내부 렌더 유지

### Phase 2

- `DashboardSection`, `OrderSection`, `ProductSection` 분리
- 공통 컴포넌트 추출
- 주문 관련 URL query 상태 도입

### Phase 3

- `Customer`, `Board`, `Stats`, `Popup`, `Design` 분리
- `PromotionSection`을 admin feature 구조로 승격

### Phase 4

- 서버 `admin` / `adminExt` 라우터 재정리
- `adminProcedure` 기준으로 권한 검사 통일
- feature별 라우터 파일 분리

### Phase 5

- `/admin/*` 하위 route 전환 완료
- 기존 `activePage` 문자열 분기 제거
- 남은 레거시 섹션 제거

## 추천 구현 순서

리스크가 가장 낮고 효과가 큰 순서는 아래다.

1. `AdminGuard` + `AdminLayout`
2. `OrderSection` 분리
3. `ProductSection` 분리
4. 공통 테이블/모달/배지 추출
5. 서버 admin router 도메인 분리
6. URL query state 도입

## 결론

이 관리자페이지는 “기능 부족” 문제가 아니라 “구조 집중” 문제가 핵심이다.

따라서 다음 리팩터링의 방향은 이렇다.

- 단일 파일 백오피스에서 도메인별 모듈형 백오피스로 이동
- 상태 기반 분기에서 라우트 기반 진입으로 이동
- UI에서 tRPC 직접 호출하는 구조에서 feature hook 계층으로 이동
- 반복 role check에서 `adminProcedure` 중심 구조로 이동

가장 먼저 손댈 추천 시작점은 `OrderSection`이다. 현재 기능 밀도와 복잡도가 가장 높아서, 여기만 분리해도 유지보수성이 크게 좋아진다.
