/**
 * REAGE 공통 헤더 인증 스크립트
 * 모든 정적 HTML 페이지에서 로드하여 로그인 상태에 따라 헤더 버튼을 동적으로 렌더링합니다.
 */
(function () {
  var LEGACY_ROUTE_MAP = {
    'index.html': '/',
    '/index.html': '/',
    'index.html#empathy': '/reage-story.html',
    '/index.html#empathy': '/reage-story.html',
    'index.html#brand-story': '/brand-story.html',
    '/index.html#brand-story': '/brand-story.html',
    'index.html#why-hands': '/therapy.html',
    '/index.html#why-hands': '/therapy.html',
    'index.html#device': '/reage-device.html',
    '/index.html#device': '/reage-device.html',
    'index.html#curriculum': '/academy.html',
    '/index.html#curriculum': '/academy.html',
    'index.html#testimonials': '/review.html',
    '/index.html#testimonials': '/review.html',
    'index.html#gallery': '/gallery.html',
    '/index.html#gallery': '/gallery.html',
    'index.html#magazine': '/magazine.html',
    '/index.html#magazine': '/magazine.html',
    'index.html#final-cta': '/contact.html?tab=intro',
    '/index.html#final-cta': '/contact.html?tab=intro'
  };

  function getLoginUrl() {
    try {
      var url = new URL('/login', window.location.origin);
      var returnTo = window.location.pathname + window.location.search + window.location.hash;
      if (returnTo && returnTo !== '/login') {
        url.searchParams.set('returnTo', returnTo);
      }
      return url.toString();
    } catch (e) {
      return '/login';
    }
  }

  function normalizeAnchorHref(anchor) {
    var rawHref = anchor.getAttribute('href');
    if (!rawHref) return;

    var nextHref = LEGACY_ROUTE_MAP[rawHref] || rawHref;
    var text = (anchor.textContent || '').replace(/\s+/g, ' ').trim();

    if ((rawHref === 'contact.html' || rawHref === '/contact.html') && /(도입 상담|도입문의|도입 문의)/.test(text)) {
      nextHref = '/contact.html?tab=intro';
    }

    if (nextHref !== rawHref) {
      anchor.setAttribute('href', nextHref);
    }
  }

  function normalizeStaticNavigation() {
    document.querySelectorAll('a[href]').forEach(normalizeAnchorHref);

    document.querySelectorAll('.logo').forEach(function (logo) {
      if (logo.tagName === 'A') {
        var currentHref = logo.getAttribute('href');
        if (!currentHref || currentHref === 'index.html' || currentHref === '/index.html') {
          logo.setAttribute('href', '/');
        }
        return;
      }

      var goHome = function () {
        window.location.href = '/';
      };

      logo.setAttribute('role', 'link');
      logo.setAttribute('tabindex', '0');
      logo.style.cursor = 'pointer';
      logo.addEventListener('click', goHome);
      logo.addEventListener('keydown', function (event) {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          goHome();
        }
      });
    });
  }

  // 장바구니 카운트
  function getCartCount() {
    try {
      const cart = JSON.parse(localStorage.getItem('reage_cart') || '[]');
      return cart.reduce(function (s, i) { return s + (i.quantity || 0); }, 0);
    } catch (e) { return 0; }
  }

  // 사용자 정보 조회 (tRPC publicProcedure)
  async function fetchUser() {
    try {
      const res = await fetch('/api/auth/me', { credentials: 'include' });
      if (!res.ok) return null;
      const data = await res.json();
      return data?.user ?? null;
    } catch (e) { return null; }
  }

  async function renderHeaderAuth() {
    const container = document.getElementById('header-auth-area');
    if (!container) return;

    const user = await fetchUser();
    const cartCount = getCartCount();
    const cartBadge = cartCount > 0
      ? `<span style="position:absolute;top:-6px;right:-6px;background:#6B0F1A;color:#fff;font-size:10px;font-weight:700;width:18px;height:18px;border-radius:50%;display:flex;align-items:center;justify-content:center;">${cartCount}</span>`
      : '';

    const cartBtn = `
      <a href="/cart" style="position:relative;display:inline-flex;align-items:center;gap:6px;padding:9px 16px;border-radius:8px;border:1.5px solid #E8E6E3;background:#fff;font-size:13px;font-weight:600;color:#1A1412;text-decoration:none;transition:all .2s;" onmouseover="this.style.borderColor='#6B0F1A'" onmouseout="this.style.borderColor='#E8E6E3'">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>
        장바구니
        ${cartBadge}
      </a>`;

    const loginBtn = `<a href="${getLoginUrl()}" style="padding:9px 18px;border-radius:8px;border:1.5px solid #6B0F1A;background:transparent;color:#6B0F1A;font-size:13px;font-weight:600;text-decoration:none;transition:all .2s;" onmouseover="this.style.background='#6B0F1A';this.style.color='#fff'" onmouseout="this.style.background='transparent';this.style.color='#6B0F1A'">로그인</a>`;
    const mypageBtn = `<a href="/mypage" style="padding:9px 18px;border-radius:8px;background:#6B0F1A;color:#fff;font-size:13px;font-weight:600;text-decoration:none;transition:background .2s;" onmouseover="this.style.background='#8B1525'" onmouseout="this.style.background='#6B0F1A'">마이페이지</a>`;

    if (user) {
      // 로그인 상태: 장바구니 + 마이페이지 (로그인 버튼 숨김)
      container.innerHTML = `${cartBtn}${mypageBtn}`;
    } else {
      // 비로그인 상태: 장바구니 + 로그인
      container.innerHTML = `${cartBtn}${loginBtn}`;
    }
  }

  // DOM 준비 후 실행
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
      normalizeStaticNavigation();
      renderHeaderAuth();
    });
  } else {
    normalizeStaticNavigation();
    renderHeaderAuth();
  }

  // 장바구니 변경 이벤트 수신
  window.addEventListener('storage', function (e) {
    if (e.key === 'reage_cart') renderHeaderAuth();
  });
  // 커스텀 이벤트: 장바구니 추가 후 즉시 업데이트
  window.addEventListener('reage:cart-updated', renderHeaderAuth);
})();
