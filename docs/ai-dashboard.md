# 비공개 서버 상태판 (`/ai`)

`game.order4ax.com/ai`는 이 Render 앱에서 제공하는 비공개 상태판입니다. Hostinger 서버가 상태 데이터를 이 앱으로 **전송**하므로 Hostinger에 외부 포트를 열 필요가 없습니다.

## Render 설정

Render 서비스 환경 변수에 다음 두 값을 각각 설정합니다. 실제 값은 저장소·채팅·문서에 적지 마세요.

- `AI_DASHBOARD_PASSWORD`: 웹 상태판에 로그인할 긴 비밀번호
- `AI_DASHBOARD_INGEST_TOKEN`: Hostinger 전송을 인증할 별도의 긴 무작위 토큰

두 값이 설정되지 않으면 각각 화면 조회와 데이터 수신은 503으로 닫힙니다. 운영 DB에 최신 스냅샷 한 건을 저장하며, Hostinger 원본 로그는 Hostinger 서버에 남습니다.

## Hostinger 설정

서버 상태판 앱의 비공개 실행 환경에 다음 값을 설정하고 앱을 다시 시작합니다.

```text
AI_PUSH_URL=https://game.order4ax.com/api/ai/ingest
AI_PUSH_TOKEN=<Render의 AI_DASHBOARD_INGEST_TOKEN과 같은 값>
```

전송 기본 간격은 60초입니다. 웹 화면은 15초마다 최신 스냅샷을 확인하고, 마지막 수신이 3분 넘게 지나면 전송 지연으로 표시합니다.

## 확인 순서

1. Render 배포의 `/api/health`가 200인지 확인합니다.
2. 비밀번호 없이 `/ai`에 접속하면 로그인 창이 나와야 합니다.
3. Hostinger 앱에서 Render 전송 연결 로그를 확인합니다.
4. 비밀번호로 `/ai`를 열어 측정 시각과 최근 로그가 표시되는지 확인합니다.

`/ai.html`도 같은 비밀번호로 보호합니다. 주문·게임 라우트는 기존 Express 라우팅을 사용합니다.
