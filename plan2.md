# 음료 주문 웹 상세 정리 문서

## 1. 이 문서의 목적

이 문서는 현재 진행 중인 `음료 주문 웹`이 어떤 구조로 만들어졌는지, 왜 지금 같은 폴더 구조를 갖는지, 로컬 실행 버전과 Render 배포 버전이 어떤 관계인지, 그리고 Render / Supabase가 각각 어떤 역할을 하는지를 한 번에 이해할 수 있도록 정리한 문서입니다.

이 문서를 보면 아래 내용을 바로 파악할 수 있어야 합니다.

- 이 프로젝트가 해결하려는 실제 업무 문제
- 현재 웹의 사용자 흐름과 관리자 흐름
- 로컬용 실행 구조와 배포용 구조의 차이
- Render와 Supabase가 각각 맡는 역할
- 지금까지 반영된 주요 기능
- 앞으로 수정할 때 어디를 봐야 하는지

---

## 2. 이 웹이 해결하려는 문제

이 웹은 사내에서 스타벅스, 투썸플레이스 등의 음료를 단체로 주문할 때 발생하는 번거로운 수집 과정을 단순화하기 위한 도구입니다.

핵심 문제는 다음과 같습니다.

- 관리자가 단체 주문을 받을 때 사람마다 메신저로 메뉴를 따로 보내면 취합이 번거롭다.
- 어떤 주문이 현재 진행 중인 주문인지 구분하기 어렵다.
- 누가 무엇을 주문했는지 나중에 비용 처리나 정산 시 다시 확인하기 어렵다.
- 신메뉴, 카테고리, 브랜드별 메뉴가 많아지면 주문 화면이 길어지고 사용성이 떨어진다.

이 웹은 이를 해결하기 위해 아래 구조를 목표로 합니다.

1. 관리자가 먼저 `주문묶음`을 만든다.
2. 예: `아침 회의 음료주문`, `오후 외근 커피주문`
3. 주문자는 해당 주문묶음 링크에 들어가서 자기 이름으로 음료를 선택한다.
4. 주문자는 본인 주문을 수정/취소할 수 있다.
5. 관리자는 해당 주문묶음 안의 주문들을 한 번에 확인하고 메뉴별 집계를 본다.
6. 나중에 누가 언제 무엇을 먹었는지 기록으로 남길 수 있다.

---

## 3. 현재 기능 요약

### 주문자 화면

- 주문묶음 단위로 접근
- 이름만 입력하면 주문 가능
- 스타벅스 / 투썸플레이스 브랜드 선택 가능
- 메뉴 검색 가능
- `신메뉴` 우선 노출
- 카테고리별 열기 / 닫기
- 전체 메뉴가 아닐 때 또는 검색 중일 때 카테고리 자동 열림
- 음료 담기, 수량 조절, 요청사항 입력 가능
- 내 주문 목록 확인 가능
- 본인 주문 수정 / 취소 가능

### 관리자 화면

- 관리자 비밀번호로 접근
- 주문묶음 생성 가능
- 주문묶음 선택 가능
- 주문묶음 마감 / 다시 열기 가능
- 주문묶음 삭제 가능
- 선택한 주문묶음의 주문 목록 조회 가능
- 메뉴별 집계 확인 가능
- CSV 다운로드 가능
- 개별 주문 삭제 가능

### 모바일 최적화

- 모바일에서 사이드 패널이 오른쪽 서랍형으로 열림
- 가로 스크롤이 생기지 않도록 보정 중
- 모바일에서는 큰 카드형보다 작은 썸네일 + 가로형 리스트가 더 많이 보이도록 조정
- 프리뷰 모드를 통해 배포 후 실제 주문 데이터 없이 모바일 레이아웃 확인 가능

---

## 4. 현재 폴더 구조가 이렇게 된 이유

현재 프로젝트는 사실상 두 계열의 실행 구조를 함께 가지고 있습니다.

```text
음료주문앱/
  apps/
  data/
  dist/
  scripts/
  deploy-upload-render/
  CoffeeOrderServer.exe
  plan.md
  plan2.md
```

### 4-1. 로컬 전용 실행 계열

- `CoffeeOrderServer.exe`
- `scripts/standalone-server.ps1`
- `data/orders.json`, `data/batches.json`

이쪽은 사용자가 Node.js / npm 없이도 바로 실행할 수 있게 만든 로컬 실행 구조입니다.

특징:

- Windows에서 바로 실행 가능
- JSON 파일 기반 저장
- 빠르게 기능 확인하기 쉬움
- 로컬 테스트나 즉시 시연용으로 적합

이 버전은 초기에 사용자가 `npm`, `node`를 실행할 수 없는 상황이어서 만들어졌습니다.

### 4-2. 배포용 계열

- `deploy-upload-render/`

이쪽은 Render에 올리기 위한 배포용 코드 묶음입니다.

특징:

- GitHub에 업로드하기 쉽게 필요한 파일만 묶음
- Render가 이 폴더를 기준으로 빌드
- DB는 SQLite 또는 Supabase Postgres 중 하나를 사용
- 실제 온라인 운영에 적합

즉, 현재는

- 로컬에서 빠르게 쓰는 버전
- 온라인 배포용 버전

이 둘이 공존하고 있습니다.

---

## 5. 배포용 구조 설명

배포용 핵심은 `deploy-upload-render/` 입니다.

```text
deploy-upload-render/
  package.json
  render.yaml
  apps/
    server/
      package.json
      src/
        index.ts
        db.ts
        config.ts
        serverPages.ts
        routes/
        services/
        templates/
        data/
```

### 5-1. `render.yaml`

Render가 어떤 명령으로 빌드하고 실행할지 적혀 있습니다.

현재 핵심 설정은 다음과 같습니다.

- `type: web`
- `runtime: node`
- `rootDir: deploy-upload-render`
- `buildCommand: npm install --include=dev && npm run build`
- `startCommand: npm run start`
- `healthCheckPath: /api/health`

즉 Render는:

1. `deploy-upload-render` 폴더로 들어간다.
2. npm 패키지를 설치한다.
3. TypeScript 서버를 빌드한다.
4. Node 서버를 띄운다.
5. `/api/health`가 살아 있으면 정상 배포로 본다.

### 5-2. `apps/server/src/index.ts`

이 파일은 Express 서버의 진입점입니다.

여기서 하는 일:

- CORS 설정
- JSON body 파싱
- API 라우터 연결
- `/`, `/order/:id`, `/admin` 페이지 응답
- 서버 시작 전 DB migration 실행

즉 이 프로젝트는 프론트와 백이 완전히 분리된 SPA가 아니라,
Express가 직접 HTML 페이지를 내려주는 구조가 꽤 큽니다.

### 5-3. `serverPages.ts`

이 파일은 `templates` 폴더의 HTML 파일을 읽어서 렌더링합니다.

역할:

- `batch-list.html`
- `order.html`
- `admin.html`
- `shared-styles.html`

를 읽고, 공통 스타일을 주입해서 페이지 문자열로 만들어 반환합니다.

즉 현재 주문 화면과 관리자 화면은 React 컴포넌트가 아니라
**서버에서 내려주는 HTML 템플릿 기반 UI**라고 이해하면 됩니다.

### 5-4. `templates/`

실제 화면 마크업과 JS가 들어 있는 폴더입니다.

- `batch-list.html`: 주문묶음 목록 페이지
- `order.html`: 주문자용 페이지
- `admin.html`: 관리자용 페이지
- `shared-styles.html`: 공통 CSS

실제 UI 변경 작업은 대부분 여기서 일어납니다.

---

## 6. DB 구조와 Render / Supabase 역할

이 프로젝트의 DB 계층은 `apps/server/src/db.ts` 에서 관리합니다.

핵심 개념은 다음과 같습니다.

### 6-1. SQLite

로컬 또는 단순 환경에서는 SQLite를 사용할 수 있습니다.

장점:

- 설정이 쉬움
- 파일 하나로 저장 가능
- 개인 테스트에 유리함

이 경우 `DATABASE_URL`은 로컬 파일 경로 형태입니다.

예:

```env
DATABASE_URL=./coffee-orders.sqlite
```

### 6-2. Supabase Postgres

온라인 운영에서는 SQLite보다 Postgres가 더 적합합니다.
그래서 Supabase의 무료 Postgres를 붙이는 방향으로 구성했습니다.

Supabase의 역할:

- 실제 주문 데이터 저장
- 주문묶음, 주문, 주문 아이템 테이블 보관
- Render 웹서버가 읽고 쓰는 데이터 저장소

이 프로젝트에서 Supabase는 **앱 호스팅을 하는 곳이 아니라 DB 제공자**입니다.

### 6-3. Render의 역할

Render의 역할은 매우 단순합니다.

- GitHub 저장소에서 코드 가져오기
- Node 앱 빌드하기
- 서버 실행하기
- 외부 URL로 공개하기

즉 Render는 **웹서버 운영 담당**입니다.

### 6-4. 둘의 관계

정리하면:

- Render = 앱 서버
- Supabase = 데이터베이스

사용자가 사이트에 접속하면 흐름은 보통 이렇습니다.

1. 사용자가 Render URL 접속
2. Render에서 Express 서버 응답
3. Express 서버가 주문/주문묶음 데이터를 DB에서 읽음
4. DB는 Supabase Postgres가 담당
5. 결과를 HTML/JSON으로 다시 사용자에게 전달

---

## 7. DB 스키마 개요

`db.ts` 기준으로 핵심 테이블은 3개입니다.

### 7-1. `order_batches`

주문묶음 테이블입니다.

필드 예시:

- `id`
- `title`
- `memo`
- `status`
- `created_at`
- `closed_at`

예:

- `아침회의`
- `오늘 외근 전 커피`

이런 단위가 한 레코드입니다.

### 7-2. `orders`

실제 주문자 1명의 주문 묶음입니다.

필드 예시:

- `id`
- `batch_id`
- `batch_title`
- `ordered_at`
- `orderer_name`
- `status`

중요한 점:

한 사람이 한 번 제출하면 그것이 한 `order`가 됩니다.

### 7-3. `order_items`

한 주문 안에 포함된 음료 개별 항목들입니다.

필드 예시:

- `id`
- `order_id`
- `brand`
- `menu_id`
- `menu_name`
- `category`
- `size`
- `quantity`
- `custom_request`

즉

- 주문 = 큰 묶음
- 주문 아이템 = 그 안의 음료 줄

구조입니다.

---

## 8. API 구조

### 8-1. 메뉴 API

- `GET /api/menus`

브랜드별 메뉴 목록을 불러옵니다.

### 8-2. 주문묶음 API

- `GET /api/order-batches`
- `GET /api/order-batches/:id`
- `GET /api/order-batches/:id/orders`
- 관리자용 생성 / 수정 / 삭제 API

주문묶음 목록, 상세, 해당 주문묶음에 포함된 주문을 조회할 수 있습니다.

### 8-3. 주문 API

- `POST /api/orders`
- `PUT /api/orders/:id`
- `DELETE /api/orders/:id`
- 관리자용 주문 삭제 / 조회 / CSV 관련 API

주문 생성, 수정, 취소를 담당합니다.

### 8-4. 관리자 보호

관리자용 API는 `x-admin-password` 헤더를 사용합니다.

즉 현재 인증은:

- 간단한 비밀번호 기반
- 완전한 사용자 계정 체계는 아님

형태입니다.

---

## 9. 메뉴 데이터는 어떻게 관리되는가

현재 메뉴는 배포용 기준으로 `apps/server/src/data/menu-data.json` 에 들어 있습니다.

이 데이터는:

- 스타벅스
- 투썸플레이스
- 카테고리
- 신메뉴 여부
- 이미지 URL
- 사이즈 목록

같은 정보를 담고 있습니다.

또한 JSON 로딩 실패에 대비해 `fallback-menu-data.json` 도 존재합니다.

즉 서버는:

1. 기본 메뉴 JSON을 읽고
2. 문제가 있으면 fallback JSON으로 복구 시도

하도록 방어 로직이 들어 있습니다.

---

## 10. 지금까지 UI에서 중요하게 바뀐 내용

이 프로젝트는 처음의 단순한 주문폼에서, 지금은 `주문묶음 중심 구조`로 바뀌었습니다.

주요 변경 사항:

### 주문자 화면 쪽

- 팀 / 연락처 / 수령메모 제거
- 이름만으로 주문
- 본인 주문 수정 / 취소
- 현재 주문 목록 공개
- 신메뉴 우선 노출
- 카테고리별 열기 / 닫기
- 검색 중 / 전체 메뉴 외 상태에서 자동 펼침
- 모바일용 `내 주문` 사이드 패널

### 관리자 화면 쪽

- 주문묶음 생성
- 주문묶음 선택
- 주문묶음 마감 / 재오픈
- 주문묶음 삭제
- 주문별 삭제
- CSV 다운로드
- 메뉴별 집계

### 디자인 쪽

- `Beverage order` -> `SAMOO AX팀 BEVERAGE ORDER`
- 새로고침 / CSV 버튼 스타일 개선
- 숫자 표기(`22개`)를 더 읽기 좋은 pill 형태로 개선
- 모바일에서 카드가 너무 커지지 않도록 조정

---

## 11. 모바일 이슈와 해결 방향

모바일에서 가장 중요한 이슈는 두 가지였습니다.

### 11-1. 가로로 화면이 늘어나는 문제

원인 후보:

- 탭/칩 줄
- 툴바 내부 요소 최소 폭
- 메뉴 섹션 헤더 레이아웃

해결 방향:

- `html`, `body`, `main` 최대 폭 제한
- 툴바 자식 `min-width: 0`
- 탭/카테고리 strip을 안전한 overflow 영역으로 처리
- 모바일에서 헤더를 2줄 구조로 재배치

### 11-2. 모바일에서 음료 카드가 너무 커서 한 화면에 적게 보이는 문제

해결 방향:

- 세로형 큰 카드 대신
- 작은 썸네일 + 가로형 리스트 구조
- 모바일에서는 이미지 약 `84x84`
- 메뉴명 2줄 제한
- 메타 텍스트 축소

즉 모바일에서는 “예쁜 카드”보다 “많이 보이고 빨리 고르는 화면”을 더 우선합니다.

---

## 12. 프리뷰 모드를 왜 넣었는가

지금까지 가장 큰 문제 중 하나는:

- Render 배포가 불안정했고
- 사용자가 배포 전 화면을 확인하기 어려웠다는 점입니다.

그래서 주문자 화면에는 `preview=1` 모드를 넣었습니다.

예:

```text
/order/preview?preview=1
```

이 모드에서는:

- 실제 DB 주문이 없어도
- 샘플 주문묶음 / 샘플 메뉴 / 샘플 주문을 사용해서
- 모바일 레이아웃을 먼저 볼 수 있습니다.

즉 배포 후 검수 순서는 앞으로 이렇게 잡을 수 있습니다.

1. 프리뷰 주문 화면 확인
2. 모바일 레이아웃 확인
3. 실제 주문묶음 화면 확인

이 방식은 “실제 운영 데이터에 영향 없이 UI를 확인”하기 위한 장치입니다.

---

## 13. Render 배포 시 중요한 점

### 13-1. GitHub 최신본이 기준

Render는 GitHub 저장소의 최신 커밋을 기준으로 배포합니다.

따라서 로컬 파일만 수정하고 GitHub에 반영하지 않으면 Render에는 적용되지 않습니다.

### 13-2. 현재 Render 배포 절차

1. GitHub `main`에 최신 수정 반영
2. Render에서 `Manual Deploy`
3. `Deploy latest commit`

### 13-3. 환경변수

중요 환경변수:

- `NODE_ENV=production`
- `ADMIN_PASSWORD=원하는비밀번호`
- `DATABASE_URL=Supabase 세션 풀러 URI`

### 13-4. Supabase 연결에서 가장 중요했던 점

Render에서 Supabase를 붙일 때는 direct DB 주소가 아니라
**session pooler URI** 를 써야 했습니다.

즉 아래처럼 `pooler.supabase.com` 이 들어간 주소를 써야 합니다.

```text
postgresql://...@aws-1-ap-northeast-2.pooler.supabase.com:5432/postgres
```

`db.프로젝트id.supabase.co` 형태의 direct URL을 쓰면 Render에서 접속 실패가 날 수 있습니다.

---

## 14. URL 관련 정리

현재 Render 기본 URL은 예를 들면 이런 형태입니다.

```text
https://coffee-order-app-0hmv.onrender.com
```

이 주소를 더 짧고 예쁘게 만들려면 가장 좋은 방법은:

- 별도 도메인 또는 서브도메인 연결

예:

- `order.samooax.com`
- `beverage.samooax.com`

즉 “구글 같은 곳에서 우회”하는 것보다,
정식으로 커스텀 도메인을 붙이는 것이 가장 깔끔한 방식입니다.

짧은 링크 서비스는 가능하지만, 실제 주소창을 완전히 대체하진 못합니다.

---

## 15. 앞으로 수정할 때 우선 봐야 할 파일

### 화면 수정

- [shared-styles.html](/C:/Users/user/Documents/@CODEX/음료주문앱/deploy-upload-render/apps/server/src/templates/shared-styles.html)
- [order.html](/C:/Users/user/Documents/@CODEX/음료주문앱/deploy-upload-render/apps/server/src/templates/order.html)
- [admin.html](/C:/Users/user/Documents/@CODEX/음료주문앱/deploy-upload-render/apps/server/src/templates/admin.html)
- [batch-list.html](/C:/Users/user/Documents/@CODEX/음료주문앱/deploy-upload-render/apps/server/src/templates/batch-list.html)

### 서버 진입점 / 라우팅

- [index.ts](/C:/Users/user/Documents/@CODEX/음료주문앱/deploy-upload-render/apps/server/src/index.ts)
- [serverPages.ts](/C:/Users/user/Documents/@CODEX/음료주문앱/deploy-upload-render/apps/server/src/serverPages.ts)

### DB / 마이그레이션

- [db.ts](/C:/Users/user/Documents/@CODEX/음료주문앱/deploy-upload-render/apps/server/src/db.ts)

### 주문 / 주문묶음 로직

- `routes/orderBatches.ts`
- `routes/orders.ts`
- `services/orderService.ts`

### 메뉴 데이터

- `data/menu-data.json`
- `data/fallback-menu-data.json`

---

## 16. 현재 상태 요약

현재 이 프로젝트는 단순한 주문폼 수준은 이미 넘었습니다.

지금 상태를 한 줄로 정리하면:

> 관리자 중심의 주문묶음 생성 -> 주문자별 주문 입력/수정/취소 -> 관리자 집계/CSV 확인까지 이어지는 음료 주문 취합 웹의 구조가 갖춰진 상태이며, 현재는 Render 배포 안정화와 모바일 UX 미세조정이 마지막 큰 과제입니다.

남은 과제를 실무적으로 다시 정리하면:

1. Render 최신 배포 성공 여부 확인
2. 프리뷰 모드에서 모바일 화면 검수
3. 실제 주문묶음 페이지 검수
4. 필요 시 관리자 집계 / CSV UI 추가 정리
5. 커스텀 도메인 연결

---

## 17. 추천 작업 순서

다음 작업자는 아래 순서로 진행하는 것이 가장 안전합니다.

1. GitHub 최신본 기준으로 Render 재배포
2. `/order/preview?preview=1` 로 모바일 화면 먼저 점검
3. 실제 주문묶음에서 주문 생성 / 수정 / 취소 테스트
4. `/admin` 에서 집계 / 삭제 / 마감 / 재오픈 테스트
5. 이상 없으면 커스텀 도메인 연결

이 순서를 지키면 실데이터를 건드리기 전에 화면 품질을 먼저 확인할 수 있습니다.

