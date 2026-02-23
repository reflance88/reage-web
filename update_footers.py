#!/usr/bin/env python3
import re
import os

NEW_FOOTER = '''<footer id="footer">
  <div class="container">
    <div class="footer-inner">
      <div>
        <div class="footer-logo">RE<span>A</span>GE</div>
        <div class="footer-info">
          <strong>COMPANY</strong>
          (주)리플런스<br/>
          대표자 &#124; 조예나<br/>
          주소 &#124; 06112 서울 강남구 학동로20길 19-3, 3층<br/>
          대표 전화 &#124; <a href="tel:01096799498" style="color:rgba(247,245,242,.5);">010-9679-9498</a><br/>
          사업자등록번호 &#124; 872-86-01179<br/>
          개인정보보호책임자 &#124; 조예나
        </div>
      </div>
      <div class="footer-col">
        <h5>CUSTOMER CENTER</h5>
        <p><a href="tel:01096799498" style="color:rgba(247,245,242,.7);font-size:15px;font-weight:600;">010-9679-9498</a><br/>
        운영시간 &#124; 10:00 - 18:00<br/>
        (토·일·공휴일 휴무)<br/><br/>
        계좌정보 &#124; 100-033-276522<br/>
        예금주 &#124; 주식회사리플런스</p>
      </div>
      <div class="footer-col">
        <h5>SNS</h5>
        <a href="https://www.instagram.com/reage_official" target="_blank" rel="noopener">INSTAGRAM<br/>@reage_official</a>
      </div>
      <div class="footer-col">
        <h5>SITE MAP</h5>
        <a href="brand-intro.html">브랜드소개</a>
        <a href="brand-story.html">브랜드스토리</a>
        <a href="therapy.html">레아쥬테라피</a>
        <a href="reage-device.html">레아쥬기기</a>
        <a href="academy.html">아카데미</a>
        <a href="review.html">후기</a>
        <a href="gallery.html">갤러리</a>
        <a href="magazine.html">매거진</a>
        <a href="contact.html">체험 예약</a>
        <a href="contact.html?tab=intro">도입 상담</a>
      </div>
    </div>
    <div class="footer-bottom">
      <div class="footer-disclaimer">
        본 홈페이지의 모든 내용은 테라피·관리 정보를 목적으로 하며, 의료행위·질병 치료·의학적 효능을 주장하지 않습니다. 개인에 따라 체감 효과는 다를 수 있습니다.
      </div>
      <div>© 2025 REAGE. All rights reserved.</div>
    </div>
  </div>
</footer>'''

FOOTER_CSS = '''
    .footer-inner {
      display: grid;
      grid-template-columns: 1.4fr 1fr 1fr 1fr;
      gap: 40px;
      align-items: flex-start;
    }
    @media(max-width:900px){ .footer-inner { grid-template-columns: 1fr 1fr; } }
    @media(max-width:560px){ .footer-inner { grid-template-columns: 1fr; } }
    .footer-logo { font-size: 18px; font-weight: 700; color: var(--offwhite); letter-spacing: .18em; margin-bottom: 10px; }
    .footer-logo span { color: var(--gold); }
    .footer-info { line-height: 1.9; font-size: 12px; color: rgba(247,245,242,.5); }
    .footer-info strong { color: rgba(247,245,242,.8); font-size: 11px; letter-spacing: .1em; display: block; margin-bottom: 6px; }
    .footer-col h5 { font-size: 11px; letter-spacing: .12em; color: var(--gold); margin-bottom: 12px; font-weight: 600; }
    .footer-col a { display: block; color: rgba(247,245,242,.45); font-size: 12px; margin-bottom: 7px; transition: color .2s; text-decoration: none; }
    .footer-col a:hover { color: var(--gold); }
    .footer-col p { font-size: 12px; color: rgba(247,245,242,.45); line-height: 1.8; margin: 0; }
    .footer-nav { display: flex; flex-direction: column; gap: 8px; }
    .footer-nav a { color: rgba(247,245,242,.45); transition: color .2s; }
    .footer-nav a:hover { color: var(--gold); }
    .footer-bottom {
      margin-top: 32px; padding-top: 20px;
      border-top: 1px solid rgba(247,245,242,.08);
      display: flex; justify-content: space-between; align-items: center;
      flex-wrap: wrap; gap: 12px;
    }
    .footer-disclaimer {
      font-size: 11px; color: rgba(247,245,242,.3);
      max-width: 640px; line-height: 1.6;
    }'''

files = [
    'academy.html', 'brand-intro.html', 'brand-story.html',
    'contact.html', 'gallery.html', 'magazine.html',
    'reage-device.html', 'reage-story.html', 'review.html', 'therapy.html'
]

pub_dir = '/home/ubuntu/reage-web/client/public'

for fname in files:
    fpath = os.path.join(pub_dir, fname)
    with open(fpath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # 기존 footer 전체 교체
    content = re.sub(r'<footer id="footer">.*?</footer>', NEW_FOOTER, content, flags=re.DOTALL)
    
    # CSS: .footer-inner 관련 기존 스타일 교체 또는 추가
    # footer 관련 CSS가 있으면 교체, 없으면 </style> 앞에 추가
    if '.footer-inner' in content:
        content = re.sub(
            r'\.footer-inner\s*\{[^}]*\}',
            '.footer-inner {\n      display: grid;\n      grid-template-columns: 1.4fr 1fr 1fr 1fr;\n      gap: 40px;\n      align-items: flex-start;\n    }',
            content
        )
    
    # footer-col CSS가 없으면 </style> 앞에 추가
    if '.footer-col' not in content:
        content = content.replace('</style>', FOOTER_CSS + '\n  </style>', 1)
    
    with open(fpath, 'w', encoding='utf-8') as f:
        f.write(content)
    
    print(f"✓ {fname} 업데이트 완료")

print("\n모든 파일 푸터 업데이트 완료!")
