/**
 * REAGE 공통 헤더 제품소개 드롭다운 DB 연동 스크립트
 * 모든 정적 HTML 페이지에서 로드하여 product.list API 기반으로
 * 제품소개 드롭다운 메뉴를 동적으로 렌더링합니다.
 *
 * 사용법: 각 HTML 파일의 </body> 직전에 아래 스크립트 태그를 추가하세요.
 *   <script src="header-products.js"></script>
 *
 * 드롭다운 컨테이너에 id="product-nav-dropdown" 속성이 있어야 합니다.
 * 현재 페이지가 레아쥬기기 페이지인 경우 class="active"가 자동 적용됩니다.
 */
(function () {
  // product.list API 호출 (publicProcedure - 인증 불필요)
  async function fetchProducts() {
    try {
      const res = await fetch('/api/trpc/product.list?input=%7B%22json%22%3Anull%7D', {
        credentials: 'include',
      });
      const data = await res.json();
      // tRPC v11 응답 구조: result.data.json
      const products = data?.result?.data?.json ?? data?.result?.data ?? [];
      return Array.isArray(products) ? products : [];
    } catch (e) {
      console.warn('[header-products] API 호출 실패:', e);
      return [];
    }
  }

  async function renderProductDropdown() {
    const dropdown = document.getElementById('product-nav-dropdown');
    if (!dropdown) return;

    const products = await fetchProducts();
    if (!products.length) return; // API 실패 시 기존 정적 메뉴 유지

    // 현재 페이지 경로 (active 클래스 적용용)
    const currentPath = window.location.pathname.split('/').pop() || '';
    const isDevicePage = currentPath === 'reage-device.html';

    // 레아쥬기기 고정 항목 + DB 제품 목록
    const deviceLink = `<a href="reage-device.html"${isDevicePage ? ' class="active"' : ''}>레아쥬기기</a>`;

    const productLinks = products
      .filter(function (p) { return p.visible !== false && p.isActive !== false; })
      .map(function (p) {
        // 동적 상세페이지 경로: /product/:slug (React Router)
        const href = '/product/' + p.slug;
        const isActive = currentPath === ('product-' + p.slug + '.html') ? ' class="active"' : '';
        return '<a href="' + href + '"' + isActive + '>' + (p.name || p.slug) + '</a>';
      })
      .join('');

    dropdown.innerHTML = deviceLink + productLinks;
  }

  // DOM 준비 후 실행
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', renderProductDropdown);
  } else {
    renderProductDropdown();
  }
})();
