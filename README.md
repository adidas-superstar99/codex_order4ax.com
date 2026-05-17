# order4ax.com

사내 음료 주문을 주문목록 단위로 열고, 사용자 주문과 관리자 취합을 한 화면 흐름으로 운영하는 앱입니다.

## 현재 배포 대상

- GitHub 저장소: `https://github.com/adidas-superstar99/codex_order4ax.com.git`
- 웹 호스팅: Render
- 운영 DB: Supabase Postgres

## 로컬 실행

로컬 확인 주소:

- 주문 목록: `http://127.0.0.1:5173/`
- 관리자: `http://127.0.0.1:5173/admin`
- 기본 관리자 비밀번호: `1234`

Node.js가 설치된 환경에서는 아래처럼 실행합니다.

```powershell
cd "C:\Users\user\Documents\@CODEX\음료주문앱"
npm install
npm run dev
```

## 배포 구조

- `apps/web`: Vite + React 프론트엔드
- `apps/server`: Express API + 정적 파일 서빙
- `render.yaml`: Render 배포 설정

운영 환경에서는 Express 서버가 `apps/web/dist`를 함께 서빙하므로 프론트와 API를 같은 도메인에서 운영합니다.

## Render 배포 순서

1. 이 저장소를 GitHub `codex_order4ax.com`에 푸시합니다.
2. Supabase에서 운영용 프로젝트를 생성합니다.
3. Supabase 프로젝트의 Postgres 연결 문자열을 복사합니다.
4. Render에서 `New +` → `Blueprint` 또는 `Web Service`로 이 저장소를 연결합니다.
5. Render 환경 변수에 아래 값을 넣습니다.

```env
NODE_ENV=production
ADMIN_PASSWORD=원하는-관리자-비밀번호
DATABASE_URL=Supabase의-Postgres-연결문자열
```

6. 첫 배포가 끝나면 `/api/health` 확인 후 `/admin`으로 관리자 화면에 접속합니다.

## Render 설정 메모

- 서비스명: `order4ax-com`
- Build Command: `npm install && npm run build`
- Start Command: `npm run start`
- Health Check Path: `/api/health`
- Node 버전: `22.x`

저장소에는 `.node-version`과 `package.json` `engines`가 들어 있어 Render가 Node 22 계열로 맞춰 배포할 수 있게 해두었습니다.

## Supabase 메모

- 앱은 `DATABASE_URL` 하나만 있으면 됩니다.
- `postgresql://...` 형식의 연결 문자열을 그대로 Render에 넣으면 됩니다.
- 현재 서버 코드는 Supabase 같은 외부 Postgres 연결일 때 SSL을 켜도록 되어 있습니다.

## 환경 변수 예시

`apps/server/.env` 또는 Render 환경 변수에 아래처럼 설정합니다.

```env
PORT=3000
DATABASE_URL=postgresql://...
ADMIN_PASSWORD=1234
```

## 주의 사항

- 로컬 확인용 `tools/ui-preview-api.mjs`는 배포용이 아닙니다.
- 실제 운영 배포는 `apps/server` + `apps/web` 기준입니다.
- Supabase Free 플랜은 장시간 비활성 시 일시 정지될 수 있습니다.
