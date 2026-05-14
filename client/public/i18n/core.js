/**
 * REAGE i18n — KOR/ENG Toggle v2
 * 
 * Handles:
 * - Plain text nodes
 * - Elements with <br> split text (matches on element.textContent)
 * - Placeholder attributes
 * - Alt attributes on images
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
    "도입 상담 신청": "Request Consultation",
    "도입 상담": "Adoption Consultation",
    "홈": "Home"
  };

  /* ── Merge page-specific translations ── */
  var pageT = window.__pageTranslations || {};
  var dict = {};
  Object.keys(common).forEach(function (k) { dict[k] = common[k]; });
  Object.keys(pageT).forEach(function (k) { dict[k] = pageT[k]; });

  /* ── Auto-generate line-level entries from multi-line keys ── */
  var extraLines = {};
  Object.keys(dict).forEach(function (k) {
    if (k.indexOf('\n') !== -1) {
      var koLines = k.split('\n');
      var enLines = dict[k].split('\n');
      for (var i = 0; i < koLines.length; i++) {
        var kl = koLines[i].trim();
        var el = (enLines[i] || '').trim();
        if (kl && el && !dict[kl]) {
          extraLines[kl] = el;
        }
      }
    }
  });
  Object.keys(extraLines).forEach(function (k) { dict[k] = extraLines[k]; });

  /* ── State ── */
  var STORAGE_KEY = 'reage_lang';
  var currentLang = localStorage.getItem(STORAGE_KEY) || 'ko';

  /* ── Storage for originals ── */
  var originalTextNodes = new Map();   // textNode -> originalText
  var originalElements = new Map();    // element -> originalInnerHTML
  var originalPlaceholders = new Map();
  var processed = false;

  /* ── Normalize whitespace for matching ── */
  function norm(s) {
    return s.replace(/\s+/g, ' ').trim();
  }

  /* ── Find a translation, trying various normalizations ── */
  function findTranslation(text) {
    var trimmed = text.trim();
    if (dict[trimmed]) return dict[trimmed];
    
    var normalized = norm(text);
    if (dict[normalized]) return dict[normalized];
    
    // Try without quotes
    var noQuotes = trimmed.replace(/[""]/g, '"');
    if (dict[noQuotes]) return dict[noQuotes];
    
    return null;
  }

  /* ── Process elements that contain <br> (translate as a whole unit) ── */
  function processBrElements(root) {
    // Find elements that have <br> children and Korean text
    var allEls = root.querySelectorAll('h1, h2, h3, h4, h5, h6, p, span, a, li, td, th, label, button, div');
    
    allEls.forEach(function (el) {
      // Skip if has complex children (other than br, em, strong, span)
      var dominated = true;
      for (var i = 0; i < el.childNodes.length; i++) {
        var child = el.childNodes[i];
        if (child.nodeType === 1) { // Element
          var tag = child.tagName.toLowerCase();
          if (['br', 'em', 'strong', 'b', 'i', 'span', 'small'].indexOf(tag) === -1) {
            dominated = false;
            break;
          }
        }
      }
      if (!dominated) return;
      
      // Check if contains <br>
      if (!el.querySelector('br')) return;
      
      // Get the full text content 
      var fullText = el.textContent;
      var translation = findTranslation(fullText);
      
      if (translation) {
        if (!originalElements.has(el)) {
          originalElements.set(el, el.innerHTML);
        }
      }
    });
  }

  /* ── Apply language ── */
  function applyLanguage(lang) {
    currentLang = lang;
    localStorage.setItem(STORAGE_KEY, lang);
    document.documentElement.setAttribute('lang', lang === 'ko' ? 'ko' : 'en');

    if (!processed) {
      // First pass: scan and store originals
      processBrElements(document.body);
      
      // Walk all text nodes
      var walk = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, null, false);
      var node;
      while (node = walk.nextNode()) {
        var trimmed = node.textContent.trim();
        if (trimmed && trimmed.length > 0) {
          if (!originalTextNodes.has(node)) {
            originalTextNodes.set(node, node.textContent);
          }
        }
      }
      
      // Store placeholders
      var inputs = document.querySelectorAll('[placeholder]');
      inputs.forEach(function (el) {
        if (!originalPlaceholders.has(el)) {
          originalPlaceholders.set(el, el.getAttribute('placeholder'));
        }
      });
      
      processed = true;
    }

    if (lang === 'en') {
      // Translate elements with <br> first
      originalElements.forEach(function (origHTML, el) {
        var fullText = norm(el.textContent);
        var translation = findTranslation(el.textContent) || findTranslation(fullText);
        if (translation) {
          // Replace innerHTML: put translation lines separated by <br>
          var lines = translation.split('\n');
          el.innerHTML = lines.join('<br/>');
        }
      });

      // Translate text nodes
      originalTextNodes.forEach(function (origText, node) {
        // Skip nodes inside already-translated elements
        var parent = node.parentElement;
        if (parent && originalElements.has(parent)) return;
        
        var trimmed = origText.trim();
        var translation = findTranslation(trimmed);
        if (translation) {
          node.textContent = origText.replace(trimmed, translation);
        }
      });
      
      // Translate placeholders
      originalPlaceholders.forEach(function (origPh, el) {
        var translation = findTranslation(origPh);
        if (translation) el.setAttribute('placeholder', translation);
      });
    } else {
      // Restore Korean
      originalElements.forEach(function (origHTML, el) {
        el.innerHTML = origHTML;
      });
      
      originalTextNodes.forEach(function (origText, node) {
        node.textContent = origText;
      });
      
      originalPlaceholders.forEach(function (origPh, el) {
        el.setAttribute('placeholder', origPh);
      });
    }

    updateToggleBtn();
  }

  /* ── Toggle Button ── */
  function updateToggleBtn() {
    var btns = document.querySelectorAll('#lang-toggle-btn, #lang-toggle-btn-mobile');
    btns.forEach(function (btn) {
      btn.textContent = currentLang === 'ko' ? 'ENG' : 'KOR';
      btn.title = currentLang === 'ko' ? 'Switch to English' : '한국어로 전환';
    });
  }

  function injectToggleButton() {
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
      setTimeout(function () { applyLanguage('en'); }, 100);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
