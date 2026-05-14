/**
 * REAGE i18n — KOR/ENG Toggle v3
 * 
 * Handles:
 * - Plain text nodes
 * - Elements with <br> split text (matches on element.textContent)
 * - Dynamically injected content (MutationObserver)
 * - Placeholder / alt attributes
 * - Header nav, dropdown menus, auth buttons
 */
(function () {
  'use strict';

  /* ── Common translations (nav, footer, buttons shared across pages) ── */
  var common = {
    // Navigation
    "브랜드": "Brand",
    "브랜드소개": "About",
    "브랜드스토리": "Brand Story",
    "레아쥬테라피": "REAGE Therapy",
    "제품소개": "Products",
    "레아쥬기기": "REAGE Device",
    "S1크림": "S1 Cream",
    "M2크림": "M2 Cream",
    "F3크림": "F3 Cream",
    "신제품1": "New Product 1",
    "신제품2": "New Product 2",
    "신제품3": "New Product 3",
    "후기": "Reviews",
    "갤러리": "Gallery",
    "매거진": "Magazine",
    "인증강사": "Certified Instructors",
    "아카데미": "Academy",
    "도입문의": "Contact",
    "도입 상담": "Adoption Consultation",
    "홈": "Home",
    // Auth / header buttons
    "로그인": "Login",
    "회원가입": "Sign Up",
    "마이페이지": "My Page",
    "로그아웃": "Logout",
    "장바구니": "Cart",
    // Breadcrumb
    "레아쥬": "REAGE",
    "레아쥬 기기": "REAGE Device",
    "레아쥬 스토리": "REAGE Story",
    "브랜드 스토리": "Brand Story",
    "레아쥬 테라피": "REAGE Therapy",
    // Product cards (dynamic)
    "장바구니 담기": "Add to Cart",
    "구매하기": "Buy Now",
    "일반 판매가": "Regular Price",
    "품절": "Sold Out",
    "인증 필요": "Certification Required",
    "인증 후 구매": "Purchase After Certification",
    "장바구니에 담았습니다.": "Added to cart.",
    // Footer
    "회사명": "Company",
    "대표": "CEO",
    "사업자등록번호": "Business No.",
    "통신판매업신고": "E-commerce License",
    "주소": "Address",
    "고객센터": "Customer Center",
    "이용약관": "Terms of Service",
    "개인정보처리방침": "Privacy Policy",
    "이메일": "Email",
    "(주)리플런스": "Rephlens Co., Ltd.",
    "대표자 │ 조예나": "CEO │ Cho Yena",
    "주소 │ 06112 서울 강남구 학동로20길 19-3, 3층": "Address │ 06112 3F, 19-3 Hakdong-ro 20-gil, Gangnam-gu, Seoul",
    "대표 전화": "Main Phone",
    "사업자등록번호 │ 872-86-01179": "Business Registration No. │ 872-86-01179",
    "개인정보보호책임자 │ 조예나": "Privacy Officer │ Cho Yena",
    "운영시간 │ 10:00 - 18:00": "Operating Hours │ 10:00 - 18:00",
    "(토·일·공휴일 휴무)": "(Closed on Sat, Sun & Public Holidays)",
    "계좌정보 │ 100-033-276522": "Account Info │ 100-033-276522",
    "예금주 │ 주식회사리플런스": "Account Holder │ Rephlens Co., Ltd.",
    "본 홈페이지의 모든 내용은 테라피·관리 정보를 목적으로 하며, 의료행위·질병 치료·의학적 효능을 주장하지 않습니다. 개인에 따라 체감 효과는 다를 수 있습니다.": "All content on this website is for therapy and care information purposes only and does not claim medical treatment, disease cure, or medical efficacy. Results may vary by individual.",
    // Common buttons
    "자세히 보기": "Learn More",
    "더 알아보기": "Learn More",
    "문의하기": "Contact Us",
    "지금 문의하기": "Contact Now",
    "지금 시작하기": "Get Started",
    "전화 상담": "Call Us",
    "카카오톡 상담": "KakaoTalk",
    "온라인 문의": "Online Inquiry",
    "이름": "Name",
    "연락처": "Phone",
    "이메일 주소": "Email Address",
    "문의 내용": "Message",
    "보내기": "Submit",
    "닫기": "Close",
    "전체보기": "View All",
    "상담 신청": "Request Consultation",
    "도입 상담 신청": "Request Consultation",
    "오늘 하루 보지 않기": "Don't show again today",
    "일주일 동안 보지 않기": "Don't show for one week"
  };

  /* ── Merge page-specific translations ── */
  var pageT = window.__pageTranslations || {};
  var dict = {};
  Object.keys(common).forEach(function (k) { dict[k] = common[k]; });
  Object.keys(pageT).forEach(function (k) { dict[k] = pageT[k]; });

  /* ── Auto-generate line-level entries from multi-line keys ── */
  Object.keys(dict).forEach(function (k) {
    if (k.indexOf('\n') !== -1) {
      var koLines = k.split('\n');
      var enLines = dict[k].split('\n');
      for (var i = 0; i < koLines.length; i++) {
        var kl = koLines[i].trim();
        var el = (enLines[i] || '').trim();
        if (kl && el && !dict[kl]) {
          dict[kl] = el;
        }
      }
    }
  });

  /* ── Regex-based translations for patterns like "재고 999개", "132,000원" ── */
  var regexTranslations = [
    { pattern: /재고\s*(\d[\d,]*)\s*개/, replace: 'Stock: $1' },
    { pattern: /([\d,]+)\s*원/, replace: '₩$1' }
  ];

  /* ── State ── */
  var STORAGE_KEY = 'reage_lang';
  var currentLang = localStorage.getItem(STORAGE_KEY) || 'ko';

  /* ── Find a translation ── */
  function findTranslation(text) {
    if (!text) return null;
    var trimmed = text.trim();
    if (dict[trimmed]) return dict[trimmed];
    var normalized = trimmed.replace(/\s+/g, ' ');
    if (dict[normalized]) return dict[normalized];
    return null;
  }

  /* ── Translate a single text node ── */
  function translateTextNode(node) {
    var text = node.textContent;
    var trimmed = text.trim();
    if (!trimmed) return;

    var trans = findTranslation(trimmed);
    if (trans) {
      node.textContent = text.replace(trimmed, trans);
      return;
    }

    // Try regex patterns
    for (var i = 0; i < regexTranslations.length; i++) {
      var r = regexTranslations[i];
      if (r.pattern.test(trimmed)) {
        node.textContent = text.replace(r.pattern, r.replace);
        return;
      }
    }
  }

  /* ── Translate an element (handles <br> children) ── */
  function translateElement(el) {
    // Check if element has <br> and simple children only
    if (!el.querySelector('br')) return false;

    var dominated = true;
    for (var i = 0; i < el.childNodes.length; i++) {
      var child = el.childNodes[i];
      if (child.nodeType === 1) {
        var tag = child.tagName.toLowerCase();
        if (['br', 'em', 'strong', 'b', 'i', 'span', 'small'].indexOf(tag) === -1) {
          dominated = false;
          break;
        }
      }
    }
    if (!dominated) return false;

    var fullText = el.textContent;
    var trans = findTranslation(fullText);
    if (trans) {
      el._origHTML = el.innerHTML;
      el.innerHTML = trans.split('\n').join('<br/>');
      return true;
    }
    return false;
  }

  /* ── Translate a DOM subtree ── */
  function translateSubtree(root) {
    if (currentLang !== 'en') return;

    // 1. Elements with <br>
    var brEls = root.querySelectorAll('h1,h2,h3,h4,h5,h6,p,span,a,li,td,th,label,button,div');
    brEls.forEach(function (el) {
      if (el.id === 'lang-toggle-btn' || el.id === 'lang-toggle-btn-mobile') return;
      translateElement(el);
    });

    // 2. Text nodes
    var walk = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null, false);
    var node;
    while (node = walk.nextNode()) {
      if (node.textContent.trim()) {
        translateTextNode(node);
      }
    }

    // 3. Placeholders
    root.querySelectorAll('[placeholder]').forEach(function (el) {
      var ph = el.getAttribute('placeholder').trim();
      var trans = findTranslation(ph);
      if (trans) el.setAttribute('placeholder', trans);
    });
  }

  /* ── Full page translate/restore ── */
  var savedHTML = null;

  function applyLanguage(lang) {
    currentLang = lang;
    localStorage.setItem(STORAGE_KEY, lang);
    document.documentElement.setAttribute('lang', lang === 'ko' ? 'ko' : 'en');

    if (lang === 'en') {
      // Save original body for clean restore
      if (!savedHTML) {
        savedHTML = document.body.innerHTML;
      }
      translateSubtree(document.body);
      startObserver();
    } else {
      // Restore original
      stopObserver();
      if (savedHTML) {
        document.body.innerHTML = savedHTML;
        savedHTML = null;
      }
      // Re-inject toggle button since body was replaced
      injectToggleButton();
      // Re-run any page scripts that build dynamic content
      // (the observer will catch those when they switch back to EN)
    }

    updateToggleBtn();
  }

  /* ── MutationObserver for dynamic content ── */
  var observer = null;
  var observerTimeout = null;

  function startObserver() {
    if (observer) return;
    observer = new MutationObserver(function (mutations) {
      // Debounce: batch mutations
      clearTimeout(observerTimeout);
      observerTimeout = setTimeout(function () {
        mutations.forEach(function (m) {
          m.addedNodes.forEach(function (node) {
            if (node.nodeType === 1) {
              translateSubtree(node);
            } else if (node.nodeType === 3 && node.textContent.trim()) {
              translateTextNode(node);
            }
          });
        });
      }, 50);
    });
    observer.observe(document.body, { childList: true, subtree: true });
  }

  function stopObserver() {
    if (observer) {
      observer.disconnect();
      observer = null;
    }
  }

  /* ── Toggle Button ── */
  function updateToggleBtn() {
    document.querySelectorAll('#lang-toggle-btn, #lang-toggle-btn-mobile').forEach(function (btn) {
      btn.textContent = currentLang === 'ko' ? 'ENG' : 'KOR';
      btn.title = currentLang === 'ko' ? 'Switch to English' : '한국어로 전환';
    });
  }

  function injectToggleButton() {
    if (document.getElementById('lang-toggle-btn')) return;

    var headerCta = document.querySelector('.header-cta');
    var btn = document.createElement('button');
    btn.id = 'lang-toggle-btn';
    btn.textContent = currentLang === 'ko' ? 'ENG' : 'KOR';
    btn.title = currentLang === 'ko' ? 'Switch to English' : '한국어로 전환';
    btn.style.cssText = [
      'padding: 7px 16px',
      'font-size: 12px',
      'font-weight: 600',
      'letter-spacing: 1px',
      'border: 1.5px solid #6B0F1A',
      'background: transparent',
      'color: #6B0F1A',
      'border-radius: 4px',
      'cursor: pointer',
      'transition: all .25s ease',
      'white-space: nowrap',
      'font-family: inherit'
    ].join(';');

    btn.addEventListener('mouseenter', function () {
      btn.style.background = '#6B0F1A';
      btn.style.color = '#fff';
    });
    btn.addEventListener('mouseleave', function () {
      btn.style.background = 'transparent';
      btn.style.color = '#6B0F1A';
    });
    btn.addEventListener('click', function () {
      applyLanguage(currentLang === 'ko' ? 'en' : 'ko');
    });

    if (headerCta) {
      headerCta.insertBefore(btn, headerCta.firstChild);
    } else {
      btn.style.position = 'fixed';
      btn.style.top = '16px';
      btn.style.right = '16px';
      btn.style.zIndex = '10000';
      document.body.appendChild(btn);
    }
  }

  /* ── Init ── */
  function init() {
    injectToggleButton();
    if (currentLang === 'en') {
      setTimeout(function () { applyLanguage('en'); }, 150);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
