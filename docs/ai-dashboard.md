# 비공개 서버 상태판 (`/ai`)

`game.order4ax.com/ai`는 이 Render 앱에서 제공하는 비공개 상태판입니다. Hostinger 서버가 상태 데이터를 이 앱으로 **전송**하므로 Hostinger에 외부 포트를 열 필요가 없습니다.

## 인증

Render 소스에는 **비밀번호의 scrypt 검증값과 전송 공개키**만 들어 있습니다. 비밀번호 원문과 서명 개인키는 Hostinger 서버의 비공개 `notes` 폴더에 있으며 GitHub·Drive 산출물에 넣지 않습니다. 별도의 Render 환경 변수 입력 없이 배포할 수 있습니다. 향후 비밀번호를 바꾸려면 `AI_DASHBOARD_PASSWORD` 또는 `AI_DASHBOARD_PASSWORD_HASH` 환경 변수로 교체할 수 있습니다.

운영 DB에 최신 스냅샷 한 건을 저장하며, Hostinger 원본 로그는 Hostinger 서버에 남습니다.

## Hostinger 설정

서버 상태판 앱의 비공개 실행 환경에 수신 주소를 설정하고 앱을 다시 시작합니다. 개인키는 프로젝트 `notes/ai-ingest-private.pem`에서 자동으로 읽습니다.

```text
AI_PUSH_URL=https://game.order4ax.com/api/ai/ingest
```

전송 기본 간격은 60초입니다. 웹 화면은 15초마다 최신 스냅샷을 확인하고, 마지막 수신이 3분 넘게 지나면 전송 지연으로 표시합니다.

## 확인 순서

1. Render 배포의 `/api/health`가 200인지 확인합니다.
2. 비밀번호 없이 `/ai`에 접속하면 로그인 창이 나와야 합니다.
3. Hostinger 앱에서 Render 전송 연결 로그를 확인합니다.
4. 비밀번호로 `/ai`를 열어 측정 시각과 최근 로그가 표시되는지 확인합니다.

`/ai.html`도 같은 비밀번호로 보호합니다. 주문·게임 라우트는 기존 Express 라우팅을 사용합니다.
