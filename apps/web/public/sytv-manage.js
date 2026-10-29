const form = document.querySelector("#admin-form");
const passwordInput = document.querySelector("#admin-password");
const message = document.querySelector("#admin-message");
const dashboard = document.querySelector("#dashboard");
const dayInput = document.querySelector("#stats-day");
const commentsContainer = document.querySelector("#admin-comments");
const gameNames = {
  minekart: "마인크래프트 카트", familycraft: "패밀리크래프트", animalhospital: "동물병원",
  marioslug: "마리오슬러그", prophunt: "변신숨바꼭질", koopaworld: "쿠파월드", rival: "라이벌",
  dungeon: "시영 던전", doors: "도어즈", tower: "타워오브헬", anisoccer: "애니사커",
  monsterisle: "몬스터아일", toonheroes: "툰히어로즈", quizquiz: "퀴즈퀴즈"
};
let password = "";

dayInput.value = new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Seoul", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());

async function adminRequest(path, options = {}) {
  const response = await fetch(path, {
    ...options,
    headers: { "Content-Type": "application/json", "x-admin-password": password, ...options.headers },
    cache: "no-store"
  });
  if (response.status === 401) throw new Error("관리자 비밀번호를 확인해 주세요.");
  if (!response.ok) throw new Error("정보를 불러오지 못했습니다.");
  return response.json();
}

function renderComments(comments) {
  commentsContainer.replaceChildren();
  if (!comments.length) {
    const empty = document.createElement("p");
    empty.className = "empty";
    empty.textContent = "아직 댓글이 없습니다.";
    commentsContainer.append(empty);
    return;
  }
  const dateFormat = new Intl.DateTimeFormat("ko-KR", { timeZone: "Asia/Seoul", year: "numeric", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
  const labels = { published: "공개", pending: "검토 대기", hidden: "숨김" };
  for (const comment of comments) {
    const item = document.createElement("article");
    item.className = "admin-comment";
    const head = document.createElement("div");
    head.className = "admin-comment-head";
    const name = document.createElement("strong");
    name.textContent = comment.nickname;
    const kind = document.createElement("span");
    kind.className = "comment-kind";
    kind.textContent = comment.category === "bug" ? `오류 제보 · ${gameNames[comment.gameId] || comment.gameId || "게임 미지정"}` : "응원 댓글";
    const time = document.createElement("time");
    time.dateTime = comment.createdAt;
    time.textContent = dateFormat.format(new Date(comment.createdAt));
    const status = document.createElement("span");
    status.className = "comment-status";
    status.textContent = labels[comment.status] || comment.status;
    head.append(kind, name, time, status);
    const body = document.createElement("p");
    body.textContent = comment.body;
    const actions = document.createElement("div");
    actions.className = "admin-comment-actions";
    for (const [nextStatus, label] of [["published", "공개하기"], ["hidden", "숨기기"]]) {
      const button = document.createElement("button");
      button.type = "button";
      button.textContent = label;
      button.className = nextStatus === "hidden" ? "hide" : "";
      button.disabled = comment.status === nextStatus;
      button.addEventListener("click", async () => {
        button.disabled = true;
        try {
          await adminRequest(`/api/admin/sytv/comments/${encodeURIComponent(comment.id)}`, {
            method: "PATCH", body: JSON.stringify({ status: nextStatus })
          });
          await loadDashboard();
        } catch (error) {
          message.textContent = error.message;
          button.disabled = false;
        }
      });
      actions.append(button);
    }
    item.append(head, body, actions);
    commentsContainer.append(item);
  }
}

async function loadDashboard() {
  const [stats, comments] = await Promise.all([
    adminRequest(`/api/admin/sytv/stats?day=${encodeURIComponent(dayInput.value)}`),
    adminRequest("/api/admin/sytv/comments")
  ]);
  document.querySelector("#visitor-count").textContent = stats.visitors.toLocaleString("ko-KR");
  document.querySelector("#published-count").textContent = (stats.comments.published || 0).toLocaleString("ko-KR");
  document.querySelector("#pending-count").textContent = (stats.comments.pending || 0).toLocaleString("ko-KR");
  renderComments(comments);
  dashboard.hidden = false;
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  password = passwordInput.value;
  message.textContent = "";
  try {
    await loadDashboard();
    passwordInput.value = "";
  } catch (error) {
    dashboard.hidden = true;
    message.textContent = error.message;
  }
});

document.querySelector("#refresh-stats").addEventListener("click", async () => {
  try {
    message.textContent = "";
    await loadDashboard();
  } catch (error) {
    message.textContent = error.message;
  }
});
