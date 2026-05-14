/**
 * REAGE i18n — KOR/ENG Toggle
 * 
 * Usage: Each page sets window.__pageTranslations = { "한국어텍스트": "English text", ... }
 * then includes this script. The toggle button is auto-injected into the header.
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
    "로그인": "Login",
    "회원가입": "Sign Up",
    "마이페이지": "My Page",
    "로그아웃": "Logout",
    "장바구니": "Cart",
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
    // Common buttons & labels
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
    "도입 상담 신청": "Request Consultation"
  };

  /* ── Merge page-specific translations ── */
  var pageT = window.__pageTranslations || {};
  var dict = {};
  Object.keys(common).forEach(function (k) { dict[k] = common[k]; });
  Object.keys(pageT).forEach(function (k) { dict[k] = pageT[k]; });

  /* ── State ── */
  var STORAGE_KEY = 'reage_lang';
  var currentLang = localStorage.getItem(STORAGE_KEY) || 'ko';
  var originalTexts = new Map(); // node -> original text

  /* ── DOM Walker ── */
  function getTextElements(root) {
    var els = [];
    var walk = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null, false);
    var node;
    while (node = walk.nextNode()) {
      var trimmed = node.textContent.trim();
      if (trimmed && trimmed.length > 0) {
        els.push(node);
      }
    }
    return els;
  }

  function applyLanguage(lang) {
    currentLang = lang;
    localStorage.setItem(STORAGE_KEY, lang);
    document.documentElement.setAttribute('lang', lang === 'ko' ? 'ko' : 'en');

    var textNodes = getTextElements(document.body);
    textNodes.forEach(function (node) {
      // Save original on first encounter
      if (!originalTexts.has(node)) {
        originalTexts.set(node, node.textContent);
      }

      if (lang === 'en') {
        var original = originalTexts.get(node);
        var trimmed = original.trim();
        if (dict[trimmed]) {
          // Preserve leading/trailing whitespace
          node.textContent = original.replace(trimmed, dict[trimmed]);
        }
      } else {
        // Restore Korean
        if (originalTexts.has(node)) {
          node.textContent = originalTexts.get(node);
        }
      }
    });

    // Also translate placeholder attributes
    var inputs = document.querySelectorAll('[placeholder]');
    inputs.forEach(function (el) {
      if (!el._origPlaceholder) {
        el._origPlaceholder = el.getAttribute('placeholder');
      }
      if (lang === 'en') {
        var ph = el._origPlaceholder.trim();
        if (dict[ph]) el.setAttribute('placeholder', dict[ph]);
      } else {
        el.setAttribute('placeholder', el._origPlaceholder);
      }
    });

    // Update toggle button
    updateToggleBtn();
  }

  /* ── Toggle Button ── */
  function updateToggleBtn() {
    var btn = document.getElementById('lang-toggle-btn');
    if (btn) {
      btn.textContent = currentLang === 'ko' ? 'ENG' : 'KOR';
      btn.title = currentLang === 'ko' ? 'Switch to English' : '한국어로 전환';
    }
  }

  function injectToggleButton() {
    // Find header-cta area or create button near header
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
      // Fallback: fixed button at top-right
      btn.style.position = 'fixed';
      btn.style.top = '16px';
      btn.style.right = '16px';
      btn.style.zIndex = '10000';
      document.body.appendChild(btn);
    }

    // Also add to mobile menu if it exists
    var mobileMenu = document.querySelector('.mobile-menu, .mobile-nav, #mobile-menu');
    if (mobileMenu) {
      var mBtn = btn.cloneNode(true);
      mBtn.id = 'lang-toggle-btn-mobile';
      mBtn.style.margin = '12px auto';
      mBtn.style.display = 'block';
      mBtn.addEventListener('click', function () {
        applyLanguage(currentLang === 'ko' ? 'en' : 'ko');
        mBtn.textContent = currentLang === 'ko' ? 'ENG' : 'KOR';
      });
      mobileMenu.appendChild(mBtn);
    }
  }

  /* ── Init ── */
  function init() {
    injectToggleButton();
    if (currentLang === 'en') {
      // Small delay to let DOM settle
      setTimeout(function () { applyLanguage('en'); }, 50);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
