# ORDER4AX UI/UX REFACTORING PLAN
## Mobile-First Premium Beverage Ordering Experience
### For Codex Sequential Development

기존 기능은 유지하면서 UI/UX를 단계적으로 개선한다.  
목표는 “사내 업무툴” 느낌이 아닌:

> “AX팀 전용 프리미엄 음료 주문 플랫폼”

수준의 경험 제공이다.

현재 서비스:
https://order4ax.com

현재 구조는 기능적으로는 동작하지만:
- 텍스트 중심
- 관리자툴 느낌
- 모바일 앱 감성 부족
- 브랜드 경험 부족
- 실시간 인터랙션 약함

상태이므로, UI 중심 리팩토링을 우선 수행한다.

---

# 0. 핵심 개발 원칙

## 반드시 유지할 것
- 기존 주문 생성 로직
- 기존 주문 수정/취소 로직
- 관리자 기능
- CSV 다운로드 기능
- 현재 데이터 구조(DB schema)
- 기존 API endpoint

## 우선순위
```plaintext
1. UI 개선
2. UX 개선
3. 모바일 경험 개선
4. 인터랙션 개선
5. 신규 기능 추가
```

## 금지사항
```plaintext
- DB schema 대규모 변경 금지
- 기존 API breaking change 금지
- 관리자 기능 제거 금지
- 한번에 전체 구조 rewrite 금지
```

---

# 1단계 — 디자인 시스템 구축 (가장 먼저)

## 목표
전체 UI의 스타일 통일.

## 작업 내용

### 1-1. 글로벌 컬러 시스템 적용

```css
:root {
  --bg: #0B0B0F;
  --card: #15161C;
  --card-glass: rgba(255,255,255,0.06);

  --primary: #7C4DFF;
  --primary-hover: #9166FF;

  --text: #FFFFFF;
  --text-secondary: #9CA3AF;

  --success: #22C55E;
  --warning: #F59E0B;
  --danger: #EF4444;
}
```

---

### 1-2. Typography 시스템 정리

```plaintext
Title:
font-weight: 700
font-size: 28~32px

Section Title:
20~24px

Body:
15~16px

Caption:
12~13px
```

---

### 1-3. Radius 시스템 통일

```plaintext
card radius:
24px

button radius:
16px

pill radius:
999px
```

---

### 1-4. Shadow / Glow 적용

```css
box-shadow:
0 8px 30px rgba(0,0,0,0.35);

glow:
0 0 24px rgba(124,77,255,0.35);
```

---

### 1-5. Glassmorphism 적용

```css
backdrop-filter: blur(16px);
background: rgba(255,255,255,0.06);
border: 1px solid rgba(255,255,255,0.08);
```

---

# 2단계 — 전체 레이아웃 구조 개편

## 목표
“웹페이지” 느낌 제거하고
“모바일 앱” 느낌 강화.

---

## 2-1. 최대 폭 제한

```css
max-width: 480px;
margin: 0 auto;
```

---

## 2-2. Safe Area 대응

```css
padding-bottom:
env(safe-area-inset-bottom);
```

---

## 2-3. 하단 탭 네비게이션 추가

## 탭 구성
```plaintext
홈
주문내역
즐겨찾기
마이페이지
```

## 디자인 요구사항
- fixed bottom
- glass background
- active glow effect
- icon + label 구성

---

# 3단계 — 홈 화면 리디자인

## 목표
첫 화면에서:
- 감성
- 참여감
- 실시간성
- 빠른 주문

이 느껴져야 함.

---

# Home 구조

```plaintext
[ Header ]
안녕하세요 AX팀 👋

[ Hero Section ]
오늘의 추천 음료

[ 진행 중 주문 ]
현재 진행중인 공동 주문

[ 빠른 주문 ]
자주 주문하는 메뉴

[ 브랜드 선택 ]

[ 최근 주문 ]
원탭 재주문
```

---

# 3-1. Hero Card 추가

## 포함 요소
- 대표 음료 이미지
- 추천 문구
- 주문 CTA 버튼
- subtle animation

## 예시 문구
```plaintext
오늘의 추천 음료
바닐라 크림 콜드브루
```

---

# 3-2. 진행 중 주문 카드

## 현재 문제
리스트 느낌이 강함.

## 개선 방향
강조 카드 형태로 변경.

## 포함 요소
```plaintext
주문명
참여 인원
남은 시간
주문 상태
```

## 상태 표시
```plaintext
🟣 주문 수집중
🟡 관리자 주문중
🔵 제조중
🟢 도착완료
```

---

# 3-3. 빠른 주문 영역

## 핵심 UX
사내 주문은 반복 주문 비율이 높음.

## 반드시 추가
```plaintext
최근 주문 메뉴
원탭 재주문 버튼
```

---

# 4단계 — 메뉴 화면 리디자인

## 목표
“텍스트 리스트” 느낌 제거.

---

# 4-1. 메뉴 카드화

## 변경 전
텍스트 리스트

## 변경 후
이미지 중심 카드 UI

---

## 카드 구성

```plaintext
음료 이미지
음료명
가격
HOT/ICED
인기 뱃지
```

---

## 카드 스타일

```css
background: var(--card);
border-radius: 24px;
overflow: hidden;
transition: 0.25s ease;
```

---

## Hover Animation

```css
transform: translateY(-4px);
```

---

# 4-2. 브랜드 탭 UI 개선

## 현재 문제
브랜드 존재감 약함.

## 개선 방향
브랜드 카드형 탭.

## 포함 브랜드
```plaintext
스타벅스
투썸플레이스
이디야
```

## 요구사항
- 브랜드별 CI 느낌 반영
- active 상태 glow 적용

---

# 4-3. 옵션 선택 UI 개선

## 기존
단순 select 느낌

## 변경
pill button 형태.

## 옵션
```plaintext
HOT / ICED
Tall / Grande / Venti
샷추가
시럽추가
```

---

# 4-4. 하단 고정 CTA

## 추가
```plaintext
주문 담기
```

## 스타일
- fixed bottom
- full width
- strong glow
- rounded pill

---

# 5단계 — 주문 상태 화면 개선

## 목표
실시간 서비스 느낌 강화.

---

# 5-1. 상태 Progress UI

## 단계
```plaintext
주문수집
관리자주문
제조중
수령완료
```

## 표현
step progress 형태.

---

# 5-2. 실시간 통계 표시

## 추가 항목
```plaintext
총 주문 수
총 음료 수
참여 인원
예상 도착 시간
```

---

# 6단계 — 마이페이지 추가

## 포함 기능

```plaintext
최근 주문
즐겨찾기
자주 주문하는 메뉴
주문 통계
```

---

# 7단계 — 애니메이션 추가

## 필수 애니메이션

### 버튼
```plaintext
hover glow
tap scale
```

---

### 카드
```plaintext
hover lift
fade in
```

---

### 로딩
```plaintext
skeleton loading
```

---

### 성공 액션
```plaintext
주문 완료 confetti/light animation
```

---

# 8단계 — 모바일 UX 최적화

## 필수 적용

### Thumb Zone 고려
CTA는 하단 배치.

---

### Sticky Action 사용
중요 버튼은 고정.

---

### 스크롤 자연화
```css
-webkit-overflow-scrolling: touch;
```

---

# 9단계 — 기술 구현 가이드

## 권장 기술

### UI
```plaintext
TailwindCSS
```

---

### Animation
```plaintext
Framer Motion
```

---

### Icon
```plaintext
Lucide React
```

---

### 상태관리
기존 구조 유지.

필요 시:
```plaintext
Zustand
```

---

# 10단계 — 개발 순서 (매우 중요)

## STEP 1
디자인 토큰 구축

```plaintext
컬러
폰트
radius
shadow
spacing
```

---

## STEP 2
공통 컴포넌트 생성

```plaintext
Button
Card
BottomNav
SectionTitle
PillOption
```

---

## STEP 3
홈 화면 리디자인

---

## STEP 4
메뉴 카드 UI 변경

---

## STEP 5
주문 상태 UI 변경

---

## STEP 6
마이페이지 추가

---

## STEP 7
애니메이션 추가

---

# 11단계 — 테스트 체크리스트

## 반드시 테스트

### 주문 플로우
```plaintext
주문 생성
메뉴 선택
옵션 선택
주문 제출
수정
취소
```

---

### 관리자 기능
```plaintext
주문 확인
CSV 다운로드
상태 변경
```

---

### 모바일 테스트
```plaintext
iPhone
Galaxy
Chrome
Safari
```

---

# 최종 목표 UX

현재:
```plaintext
사내 주문 게시판
```

목표:
```plaintext
AX팀 전용 프리미엄 모바일 주문 플랫폼
```

---

# 디자인 레퍼런스 키워드

```plaintext
Toss
Linear
Starbucks Reserve
Glassmorphism
Premium Beverage App
Dark Mobile UI
Minimal SaaS
```

