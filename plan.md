# 음료 주문 취합 웹앱 실행계획

## 1. 목표

스타벅스와 투썸플레이스 음료 주문을 사내 또는 팀 단위로 빠르게 취합할 수 있는 웹앱을 만든다.

사용자는 브랜드, 메뉴, 사이즈, 수량, 개인 요청사항을 선택해 주문을 제출한다. 관리자는 제출된 주문을 날짜별로 조회하고, 브랜드별·메뉴별·사이즈별로 취합한 뒤 CSV로 내려받을 수 있다.

초기 MVP는 크롤링에 의존하지 않고 샘플 `menu-data.json`으로 주문 흐름을 완성한다. 공식 사이트 메뉴 수집과 Playwright scraper는 MVP 이후 2차 작업으로 붙인다.

## 2. MVP 범위

### 포함 기능

- 사용자 주문 화면
  - 주문자 이름 필수 입력
  - 팀, 연락처 또는 메신저 ID, 수령 메모 선택 입력
  - 스타벅스와 투썸플레이스 브랜드 선택
  - 브랜드, 카테고리, 메뉴명 기준 메뉴 필터와 검색
  - 이미지가 포함된 메뉴 카드 표시
  - 메뉴 선택 후 사이즈, 수량, 개인 요청사항 입력
  - 여러 음료를 담을 수 있는 장바구니
  - 주문 제출 후 SQLite DB 저장

- 관리자 주문 취합 화면
  - 주문 목록 조회
  - 날짜, 브랜드, 주문 상태 필터
  - 주문 상태 변경
  - 브랜드별, 메뉴별, 사이즈별 자동 집계
  - 개인 요청사항 포함 상세 주문 목록 표시
  - CSV 다운로드

- 메뉴 데이터
  - MVP에서는 샘플 `menu-data.json`을 사용
  - 스타벅스 샘플 메뉴 최소 10개
  - 투썸플레이스 샘플 메뉴 최소 10개
  - 메뉴 이미지는 원격 이미지 URL을 직접 참조

- 관리자 보호
  - MVP에서는 단순 `ADMIN_PASSWORD` 기반 인증으로 시작
  - 보호 대상은 `/admin`, 관리자 주문 조회, 주문 상태 변경, CSV 다운로드 API

### MVP 제외 기능

- Playwright 기반 자동 메뉴 수집
- 관리자 메뉴 새로고침 버튼
- 메뉴별 정확한 사이즈 매핑
- 주문 마감 시간 설정
- 카카오톡, Slack 공유와 알림
- 반복 주문, 자주 주문하는 메뉴 저장
- Google 로그인, 사내 SSO, 세분화된 관리자 권한

## 3. 기술 스택

- Frontend: React + Vite + TypeScript
- Backend: Node.js + Express + TypeScript
- Database: SQLite
- SQLite 접근 방식: `better-sqlite3`
- Menu data: `apps/server/src/data/menu-data.json`
- Deployment: 단일 VPS 또는 사내 서버

### 폴더 구조

```text
coffee-order-app/
  plan.md
  package.json
  README.md

  apps/
    web/
      index.html
      src/
        main.tsx
        App.tsx
        pages/
          OrderPage.tsx
          AdminPage.tsx
        components/
          BrandTabs.tsx
          MenuCard.tsx
          MenuGrid.tsx
          OrderCart.tsx
          SizeSelector.tsx
          CustomRequestInput.tsx
          OrderSummaryTable.tsx
        styles/
          globals.css

    server/
      src/
        index.ts
        db.ts
        routes/
          menus.ts
          orders.ts
          admin.ts
        services/
          menuService.ts
          orderService.ts
          exportService.ts
        data/
          menu-data.json
          fallback-menu-data.json
```

### 환경변수

```env
PORT=3000
DATABASE_URL=./coffee-orders.sqlite
ADMIN_PASSWORD=change-me
```

## 4. 데이터 모델

브랜드 값은 전체 코드와 데이터에서 `"STARBUCKS" | "TWOSOME"`으로 통일한다.

### Menu

```ts
type Menu = {
  id: string;
  brand: "STARBUCKS" | "TWOSOME";
  category: string;
  name: string;
  imageUrl: string;
  sourceUrl: string;
  isNew?: boolean;
  isSeasonal?: boolean;
  availableSizes: string[];
  createdAt: string;
  updatedAt: string;
};
```

### Order

```ts
type Order = {
  id: string;
  orderedAt: string;
  ordererName: string;
  team?: string;
  contact?: string;
  memo?: string;
  status: "submitted" | "confirmed" | "ordered" | "completed" | "cancelled";
  items: OrderItem[];
};
```

### OrderItem

```ts
type OrderItem = {
  id: string;
  orderId: string;
  brand: "STARBUCKS" | "TWOSOME";
  menuId: string;
  menuName: string;
  category: string;
  size: string;
  quantity: number;
  customRequest?: string;
};
```

### 기본 사이즈

- 스타벅스: `Short`, `Tall`, `Grande`, `Venti`
- 투썸플레이스: `Regular`, `Large`, `One Size`

MVP에서는 메뉴별 실제 판매 사이즈를 자동 판별하지 않고 브랜드별 기본 사이즈를 제공한다.

## 5. API

### 메뉴 API

- `GET /api/menus`
- `GET /api/menus?brand=STARBUCKS`
- `GET /api/menus?brand=TWOSOME`

응답은 `Menu[]` 형태다. 서버는 우선 DB 또는 `menu-data.json`에서 메뉴를 읽고, 브랜드 쿼리가 있으면 해당 브랜드만 반환한다.

### 주문 API

- `POST /api/orders`
- `GET /api/orders`
- `GET /api/orders?date=2026-05-01`
- `PATCH /api/orders/:id/status`

`POST /api/orders`는 주문자 정보와 `OrderItem[]`을 받아 SQLite에 저장한다. 기본 상태는 `submitted`다.

`PATCH /api/orders/:id/status`는 관리자 보호 API이며 상태값은 `submitted`, `confirmed`, `ordered`, `completed`, `cancelled`만 허용한다.

### 집계 및 CSV API

- `GET /api/orders/summary?date=2026-05-01`
- `GET /api/orders/export.csv?date=2026-05-01`

집계 API는 날짜 기준 주문을 브랜드, 메뉴, 사이즈 단위로 묶고 수량 합계를 반환한다. 개인 요청사항은 같은 메뉴 묶음 안에서 주문자별 상세 항목으로 보존한다.

CSV 컬럼은 다음 순서를 사용한다.

```text
주문일시,주문자,팀,브랜드,카테고리,메뉴명,사이즈,수량,개인요청사항,상태
```

## 6. 화면

### 사용자 주문 화면: `/`

- 상단에 서비스명과 주문자 정보 입력 영역을 둔다.
- 브랜드 탭은 스타벅스와 투썸플레이스 두 개만 제공한다.
- 검색 영역에는 메뉴명 검색 입력과 카테고리 필터를 둔다.
- 메뉴는 카드형 UI로 표시하며 이미지, 브랜드명, 카테고리, 메뉴명을 보여준다.
- 메뉴 선택 시 사이즈, 수량, 개인 요청사항을 입력할 수 있는 선택 패널을 표시한다.
- 장바구니에는 브랜드, 메뉴명, 사이즈, 수량, 개인 요청사항을 표시한다.
- 주문 제출 성공 후 장바구니를 비우고 성공 메시지를 보여준다.

### 관리자 주문 취합 화면: `/admin`

- `ADMIN_PASSWORD` 입력 후 관리자 화면을 볼 수 있게 한다.
- 날짜, 브랜드, 상태 필터를 제공한다.
- 전체 주문 목록에는 주문시간, 주문자, 브랜드, 메뉴명, 사이즈, 수량, 개인 요청사항, 상태를 표시한다.
- 취합 영역에는 브랜드별, 메뉴별, 사이즈별 합계를 표시한다.
- 같은 메뉴와 사이즈 안에 개인 요청사항이 있으면 주문자명과 함께 하위 상세로 표시한다.
- CSV 다운로드 버튼을 제공한다.
- 주문 상태 변경 버튼 또는 선택 컨트롤을 제공한다.

## 7. 개발 단계

### Phase 1. 프로젝트 초기 세팅

목표: React + Express + SQLite 기본 구조를 만든다.

작업:

- 루트 `package.json`과 앱 폴더 구조 생성
- Vite React TypeScript 프론트엔드 생성
- Express TypeScript 서버 생성
- SQLite DB 연결
- `/api/health` 구현
- 환경변수 로딩 구성

완료 기준:

- 웹 화면 접속 가능
- `/api/health` 응답 가능
- 서버 실행 시 SQLite DB 파일 생성 가능

### Phase 2. 메뉴 데이터 모델 및 샘플 메뉴 구현

목표: 크롤링 없이 UI와 API 개발이 가능하도록 샘플 메뉴 데이터를 만든다.

작업:

- `Menu` 타입 정의
- 스타벅스 샘플 메뉴 10개 이상 입력
- 투썸플레이스 샘플 메뉴 10개 이상 입력
- `GET /api/menus` 구현
- 브랜드와 카테고리 필터 구현
- 메뉴 카드 UI 구현

완료 기준:

- 사용자 화면에서 브랜드별 메뉴 카드가 표시됨
- 메뉴명 검색 가능
- 메뉴 이미지 표시 가능

### Phase 3. 주문 기능 구현

목표: 사용자가 음료를 선택하고 주문을 제출할 수 있게 한다.

작업:

- 주문자 정보 입력 구현
- 메뉴 선택, 사이즈 선택, 수량 선택 구현
- 개인 요청사항 자유 텍스트 입력 구현
- 장바구니 추가, 삭제, 수량 변경 구현
- `POST /api/orders` 구현
- 주문과 주문 항목을 SQLite에 저장

완료 기준:

- 주문 제출 후 DB에 주문이 저장됨
- 새로고침 후에도 주문 이력이 남음
- 한 사람이 여러 음료를 한 번에 제출할 수 있음

### Phase 4. 관리자 취합 화면 구현

목표: 주문 담당자가 주문 내역과 취합 결과를 한 화면에서 확인할 수 있게 한다.

작업:

- 관리자 비밀번호 입력 흐름 구현
- `GET /api/orders` 구현
- `PATCH /api/orders/:id/status` 구현
- `GET /api/orders/summary` 구현
- `GET /api/orders/export.csv` 구현
- 날짜, 브랜드, 상태 필터 구현
- 주문 목록 테이블 구현
- 브랜드별, 메뉴별, 사이즈별 취합 UI 구현
- CSV 다운로드 구현

완료 기준:

- 관리자가 당일 주문을 한 화면에서 확인 가능
- 브랜드별, 메뉴별, 사이즈별 취합 가능
- 주문 상태 변경 가능
- CSV 다운로드 가능

## 8. 검증 기준

### 문서 검증

- `plan.md`가 UTF-8 한국어 Markdown으로 정상 표시된다.
- MVP 범위에 사용자 주문, 장바구니, DB 저장, 관리자 취합, CSV 다운로드가 모두 포함되어 있다.
- scraper와 메뉴 새로고침은 MVP 필수 작업에서 제외되어 있다.
- API, 데이터 모델, 화면 구성이 서로 충돌하지 않는다.

### 기능 검증

- 사용자가 이름을 입력하지 않으면 주문 제출을 막는다.
- 메뉴 검색과 브랜드 필터가 동시에 동작한다.
- 장바구니에 여러 브랜드와 여러 메뉴를 담을 수 있다.
- 주문 제출 후 `orders`와 `order_items` 데이터가 함께 저장된다.
- 관리자 화면에서 날짜별 주문 조회가 가능하다.
- 취합 결과는 같은 브랜드, 메뉴, 사이즈의 수량을 합산한다.
- CSV에는 개인 요청사항이 누락되지 않는다.
- 관리자 보호 API는 비밀번호 없이 접근할 수 없다.

## 9. 후속 단계

### Phase 5. 스타벅스 메뉴 수집기

- Playwright 설치
- `starbucksScraper.ts` 작성
- `https://www.starbucks.co.kr/menu/drink_list.do` 접속
- 카테고리, 메뉴명, 이미지 URL, 상세 URL 수집
- `Menu` 모델로 정규화
- DB upsert와 `menu-data.json` 갱신
- 수집 실패 시 기존 데이터 유지

### Phase 6. 투썸플레이스 메뉴 수집기

- `twosomeScraper.ts` 작성
- `https://mo.twosome.co.kr/mn/menuInfoList.do` 접속
- NEW 탭과 커피/음료 탭 우선 수집
- 하위 카테고리가 있으면 순회
- 메뉴명, 이미지 URL, 카테고리 수집
- `Menu` 모델로 정규화
- DB upsert와 `menu-data.json` 갱신
- 수집 실패 시 기존 데이터 유지

### Phase 7. 운영 개선

- 관리자 메뉴 새로고침 화면 `/admin/menus` 추가
- 메뉴별 정확한 사이즈 매핑 테이블 추가
- 주문 마감 시간 설정
- Slack 또는 카카오톡 공유
- 주문 마감 알림
- 반복 주문과 자주 주문하는 메뉴 저장
- Google 로그인 또는 사내 SSO 적용

### 배포 방향

- 프론트엔드는 Vite build 결과물을 정적 파일로 배포한다.
- 백엔드는 Express 서버를 PM2로 실행한다.
- SQLite DB 파일은 서버 내 영속 볼륨에 보관한다.
- Nginx reverse proxy로 `/api`는 백엔드, 나머지는 프론트엔드 정적 파일로 라우팅한다.
