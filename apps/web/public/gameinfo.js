const videoThumbnails = {
  "1jTYEKNJHahATnsJPTvvXXf2wAKnnHs3o": "/gameinfo-assets/minekart-thumbnail.jpg",
  "1WjXW0Pj-fWl9N_n9CBTrWwnkP1F527EC": "/gameinfo-assets/marioslug-thumbnail.jpg",
  "15zcKVVe9fJiEiE6qhmXWS985-6Fqj5Jf": "/gameinfo-assets/animalhospital-thumbnail.jpg",
  "1ekZGzVqd2Qf12FWe_Z1U32uI-8uZKlk9": "/gameinfo-assets/familycraft-thumbnail.jpg",
  "15_HEi_vkdHntdyQ3OccNdzWAhKWyvp9F": "/gameinfo-assets/prophunt-thumbnail.jpg",
  "1CUY6CuLLzPrm7UzRZ05dgKnUEUQSYAyr": "/gameinfo-assets/superdrako-thumbnail.jpg",
  "12CEBMV9IDZioAunbx3OtdtdWDFwTsoZn": "/gameinfo-assets/rivalarena-thumbnail.jpg",
  "1zM96WjE50-BmXdsLfBQBqudWUQOXRHkb": "/gameinfo-assets/siyoung-dungeon-thumbnail.jpg",
  "1TeuK0679FmWNSwbqdfKIKf0QBKhrjI_L": "/gameinfo-assets/doors-thumbnail.jpg",
  "1NCn5Y26XR0V-_W-7k_cVmK3-CvWHyAKE": "/gameinfo-assets/tower-thumbnail.jpg",
  "13Lx_5kxmsadPSzDPqIuvra1K4b9GgvUp": "/gameinfo-assets/anisoccer-thumbnail.jpg",
  "13-WpJunzCGLE_5DWj6ULpn3xNLRhM5qO": "/gameinfo-assets/monsterisle-thumbnail.jpg"
};
const siteVideos = {
  "1jTYEKNJHahATnsJPTvvXXf2wAKnnHs3o": "/gameinfo-assets/minekart-promo.mp4",
  "1WjXW0Pj-fWl9N_n9CBTrWwnkP1F527EC": "/gameinfo-assets/marioslug-promo.mp4",
  "15zcKVVe9fJiEiE6qhmXWS985-6Fqj5Jf": "/gameinfo-assets/animalhospital-promo.mp4",
  "1ekZGzVqd2Qf12FWe_Z1U32uI-8uZKlk9": "/gameinfo-assets/familycraft-promo.mp4",
  "15_HEi_vkdHntdyQ3OccNdzWAhKWyvp9F": "/gameinfo-assets/prophunt-promo.mp4",
  "1CUY6CuLLzPrm7UzRZ05dgKnUEUQSYAyr": "/gameinfo-assets/superdrako-promo.mp4",
  "12CEBMV9IDZioAunbx3OtdtdWDFwTsoZn": "/gameinfo-assets/rivalarena-promo.mp4",
  "1zM96WjE50-BmXdsLfBQBqudWUQOXRHkb": "/gameinfo-assets/siyoung-dungeon-promo.mp4",
  "1TeuK0679FmWNSwbqdfKIKf0QBKhrjI_L": "/gameinfo-assets/doors-promo.mp4",
  "1NCn5Y26XR0V-_W-7k_cVmK3-CvWHyAKE": "/gameinfo-assets/tower-promo.mp4",
  "13Lx_5kxmsadPSzDPqIuvra1K4b9GgvUp": "/gameinfo-assets/anisoccer-promo.mp4",
  "13-WpJunzCGLE_5DWj6ULpn3xNLRhM5qO": "/gameinfo-assets/monsterisle-promo.mp4"
};

// Stills come from the games' own promotional videos, so each description has a visible example.
const gameScenes = {
  minekart: {
    still: "minekart",
    captions: ["드리프트로 트랙의 코너를 공략해요.", "점프 구간에서는 카트가 하늘로 날아오릅니다."],
    tags: ["#레이싱", "#멀티플레이", "#아이템대전", "#드리프트"]
  },
  familycraft: {
    still: "familycraft",
    captions: ["블록으로 펼쳐진 세계를 자유롭게 둘러보세요.", "가족 캐릭터와 함께 모험을 이어가요."],
    tags: ["#크래프트", "#블록탐험", "#가족협동", "#모험"]
  },
  animalhospital: {
    still: "animalhospital",
    captions: ["병원에 찾아온 오늘의 손님들을 살펴보세요.", "단서를 살펴 동물 속에 숨은 괴물을 찾아내요."],
    tags: ["#미스터리", "#추리", "#동물찾기", "#가족협동"]
  },
  marioslug: {
    still: "marioslug",
    captions: ["10개 미션의 여러 지역을 돌파해요.", "탈것에 올라 적을 향해 화력을 쏟아부어요."],
    tags: ["#픽셀액션", "#횡스크롤슈팅", "#2인협동", "#미션"]
  },
  prophunt: {
    still: "prophunt",
    captions: ["나무 등 사물로 변신해 숨어요.", "맵을 돌아다니며 숨어 있는 친구를 찾아보세요."],
    tags: ["#숨바꼭질", "#변신게임", "#멀티플레이", "#파티게임"]
  },
  koopaworld: {
    still: "superdrako",
    captions: ["사막 지형에서 적과 장애물을 넘어가요.", "성을 향해 나아가며 새로운 구간에 도전해요."],
    tags: ["#픽셀플랫포머", "#모험", "#액션", "#보스전"]
  },
  rival: {
    still: "rivalarena",
    captions: ["여러 맵에서 상대를 겨냥하는 슈팅 대전.", "좀비 모드에서 가족과 함께 버텨보세요."],
    tags: ["#아레나슈팅", "#좀비모드", "#가족대전", "#멀티플레이"]
  },
  dungeon: {
    still: "siyoung-dungeon",
    captions: ["넓은 블록 월드의 탐험 경로를 살펴보세요.", "장비를 고르고 던전의 적과 맞서요."],
    tags: ["#던전탐험", "#RPG", "#협동", "#전투"]
  },
  doors: {
    still: "doors",
    captions: ["어두운 복도를 따라 다음 문을 찾아 나아가요.", "숨어 있는 괴물을 피해 살아남아야 해요."],
    tags: ["#호러어드벤처", "#탈출", "#생존", "#협동"]
  },
  tower: {
    still: "tower",
    captions: ["장애물을 피해 점프하며 위로 올라가요.", "친구와 누가 먼저 꼭대기에 닿는지 겨뤄요."],
    tags: ["#파쿠르", "#점프액션", "#장애물", "#멀티플레이"]
  },
  anisoccer: {
    still: "anisoccer",
    captions: ["캐릭터들이 경기장에서 축구 대결을 펼쳐요.", "필살기로 경기 흐름을 뒤집어 보세요."],
    tags: ["#축구", "#스포츠대전", "#필살기", "#멀티플레이"]
  },
  monsterisle: {
    still: "monsterisle",
    captions: ["괴수 섬의 숲을 탐험하며 목표를 찾아요.", "약점을 겨냥해 거대한 보스와 싸워요."],
    tags: ["#협동건슈팅", "#보스전", "#괴수섬", "#탐험"]
  }
};

document.querySelectorAll(".game-card").forEach((card) => {
  const slug = card.querySelector(".download-button")?.getAttribute("href")?.split("/").pop();
  const scene = gameScenes[slug];
  const name = card.querySelector("h3")?.textContent?.trim();
  const videoWrap = card.querySelector(".video-wrap");
  if (!scene || !name || !videoWrap) return;

  const gallery = document.createElement("section");
  gallery.className = "scene-gallery";
  gallery.setAttribute("aria-label", `${name} 플레이 장면`);
  const heading = document.createElement("h4");
  heading.textContent = "게임 속 장면";
  const list = document.createElement("div");
  list.className = "scene-list";
  scene.captions.forEach((caption, index) => {
    const figure = document.createElement("figure");
    const image = document.createElement("img");
    image.src = `/gameinfo-assets/stills/${scene.still}-${index + 1}.webp`;
    image.alt = `${name} 플레이 장면 ${index + 1}`;
    image.width = 960;
    image.height = 540;
    image.loading = "lazy";
    image.decoding = "async";
    const description = document.createElement("figcaption");
    description.textContent = caption;
    figure.append(image, description);
    list.append(figure);
  });
  gallery.append(heading, list);
  videoWrap.after(gallery);

  const tags = card.querySelector(".feature-tags") || document.createElement("div");
  tags.className = "feature-tags";
  tags.setAttribute("aria-label", `${name} 장르와 특징`);
  const label = document.createElement("span");
  label.className = "feature-tags-label";
  label.textContent = "장르 · 특징";
  tags.replaceChildren(label, ...scene.tags.map((tag) => {
    const span = document.createElement("span");
    span.textContent = tag;
    return span;
  }));
  card.append(tags);
});

const videoDialog = document.createElement("dialog");
videoDialog.className = "video-modal";
videoDialog.setAttribute("aria-labelledby", "video-modal-title");
videoDialog.innerHTML = `
  <div class="video-modal-panel">
    <div class="video-modal-bar">
      <strong id="video-modal-title"></strong>
      <button class="video-modal-close" type="button" aria-label="영상 닫기">×</button>
    </div>
    <div class="video-modal-screen"></div>
    <div class="video-modal-footer">
      <button class="video-modal-fullscreen" type="button">전체 화면으로 보기</button>
      <a class="video-modal-drive" target="_blank" rel="noopener noreferrer">재생이 안 되나요? 원본 파일 열기 ↗</a>
    </div>
  </div>`;
document.body.append(videoDialog);

const videoScreen = videoDialog.querySelector(".video-modal-screen");
const videoTitle = videoDialog.querySelector("#video-modal-title");
const driveLink = videoDialog.querySelector(".video-modal-drive");
let lastVideoButton;

videoDialog.querySelector(".video-modal-close").addEventListener("click", () => videoDialog.close());
videoDialog.querySelector(".video-modal-fullscreen").addEventListener("click", () => {
  const player = videoScreen.querySelector("video, iframe");
  if (player?.requestFullscreen) player.requestFullscreen();
  else if (player?.webkitEnterFullscreen) player.webkitEnterFullscreen();
});
videoDialog.addEventListener("click", (event) => {
  if (event.target === videoDialog) videoDialog.close();
});
videoDialog.addEventListener("close", () => {
  videoScreen.querySelector("video")?.pause();
  videoScreen.replaceChildren(); // Removing the player stops playback.
  document.body.classList.remove("video-modal-open");
  lastVideoButton?.focus();
});

function createLoadingCover(player, thumbnail) {
  const cover = document.createElement("div");
  cover.className = "video-modal-loading";

  const image = document.createElement("img");
  image.src = thumbnail;
  image.alt = "";

  const content = document.createElement("div");
  content.className = "video-modal-loading-content";
  const message = document.createElement("span");
  message.textContent = "영상 준비 중…";
  const retry = document.createElement("button");
  retry.type = "button";
  retry.textContent = "▶ 재생";
  retry.addEventListener("click", () => {
    player.play().catch(() => {
      message.textContent = "재생이 안 되면 아래 원본 파일 링크를 이용해 주세요.";
    });
  });

  content.append(message, retry);
  cover.append(image, content);
  player.addEventListener("playing", () => cover.remove(), { once: true });
  player.addEventListener("error", () => {
    message.textContent = "영상을 불러오지 못했습니다. 아래 원본 파일을 열어 주세요.";
    retry.hidden = true;
  });
  return { cover, message };
}

function openVideo(videoUrl, videoId, thumbnail, title, button) {
  const siteVideo = siteVideos[videoId];
  const player = document.createElement(siteVideo ? "video" : "iframe");
  player.src = siteVideo || `${videoUrl}?autoplay=1`;
  player.title = title;
  if (siteVideo) {
    player.controls = true;
    player.autoplay = true;
    player.playsInline = true;
    player.preload = "auto";
    player.poster = thumbnail;
  } else {
    player.allow = "autoplay; fullscreen; picture-in-picture";
    player.allowFullscreen = true;
    player.setAttribute("referrerpolicy", "strict-origin-when-cross-origin");
  }

  videoTitle.textContent = title;
  driveLink.href = videoUrl.replace(/\/preview(?:\?.*)?$/, "/view");
  const loading = siteVideo ? createLoadingCover(player, thumbnail) : null;
  videoScreen.replaceChildren(player, ...(loading ? [loading.cover] : []));
  lastVideoButton = button;
  document.body.classList.add("video-modal-open");
  videoDialog.showModal();
  videoDialog.querySelector(".video-modal-close").focus();
  if (siteVideo) player.play().catch(() => {
    loading.message.textContent = "자동 재생이 막혔습니다. 재생 버튼을 눌러 주세요.";
  });
}

document.querySelectorAll(".game-card .video-wrap iframe").forEach((frame) => {
  const videoUrl = frame.getAttribute("src");
  const videoId = videoUrl?.match(/\/file\/d\/([^/]+)\/preview/)?.[1];
  const thumbnail = videoThumbnails[videoId];
  if (!thumbnail) return;

  const wrapper = frame.closest(".video-wrap");
  const title = frame.getAttribute("title") || "게임 홍보 영상";
  const button = document.createElement("button");
  button.type = "button";
  button.className = "video-poster";
  button.setAttribute("aria-label", `${title} 재생`);

  const image = document.createElement("img");
  image.src = thumbnail;
  image.alt = "";
  image.loading = "lazy";

  const play = document.createElement("span");
  play.className = "poster-play";
  play.setAttribute("aria-hidden", "true");
  play.textContent = "▶";

  button.append(image, play);
  wrapper.replaceChildren(button);

  button.addEventListener("click", () => openVideo(videoUrl, videoId, thumbnail, title, button));
});

function getVisitorId() {
  try {
    let id = localStorage.getItem("sytvVisitorId");
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem("sytvVisitorId", id);
    }
    return id;
  } catch {
    return crypto.randomUUID();
  }
}

const visitorId = getVisitorId();

fetch("/api/sytv/visit", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ visitorId }),
  keepalive: true
}).catch(() => {});

const reactionOptions = [
  { id: "heart", emoji: "❤️", label: "좋아요" },
  { id: "clap", emoji: "👏", label: "멋져요" },
  { id: "fire", emoji: "🔥", label: "재미있어요" }
];
const gameEngagement = new Map();

function storedReaction(gameId) {
  try { return localStorage.getItem(`sytvReaction:${gameId}`); }
  catch { return null; }
}

function saveReaction(gameId, reaction) {
  try {
    if (reaction) localStorage.setItem(`sytvReaction:${gameId}`, reaction);
    else localStorage.removeItem(`sytvReaction:${gameId}`);
  } catch { /* Reactions still work for this page load if storage is unavailable. */ }
}

function renderGameStats(gameId, stats) {
  const entry = gameEngagement.get(gameId);
  if (!entry || !stats) return;
  entry.downloads.innerHTML = `<strong>오늘 ${Number(stats.today).toLocaleString("ko-KR")}</strong><span>·</span><strong>누적 ${Number(stats.total).toLocaleString("ko-KR")}</strong><small>다운로드 버튼 클릭 기준</small>`;
  for (const option of reactionOptions) {
    const button = entry.buttons.get(option.id);
    const count = Number(stats.reactions?.[option.id] ?? 0);
    button.querySelector(".reaction-count").textContent = count.toLocaleString("ko-KR");
    button.setAttribute("aria-label", `${entry.title} ${option.label} ${count}개`);
    button.setAttribute("aria-pressed", String(storedReaction(gameId) === option.id));
  }
}

document.querySelectorAll(".game-card .download-button").forEach((link) => {
  const gameId = link.getAttribute("href")?.match(/^\/api\/sytv\/download\/([a-z]+)$/)?.[1];
  const card = link.closest(".game-card");
  if (!gameId || !card) return;
  const title = card.querySelector("h3")?.textContent || "게임";
  const engagement = document.createElement("div");
  engagement.className = "game-engagement";
  const downloads = document.createElement("div");
  downloads.className = "download-stats";
  downloads.textContent = "다운로드 수 불러오는 중…";
  const reactions = document.createElement("div");
  reactions.className = "reaction-buttons";
  reactions.setAttribute("role", "group");
  reactions.setAttribute("aria-label", `${title} 반응 남기기`);
  const error = document.createElement("span");
  error.className = "reaction-error";
  error.setAttribute("role", "status");
  const buttons = new Map();
  for (const option of reactionOptions) {
    const button = document.createElement("button");
    button.type = "button";
    button.setAttribute("aria-label", `${title} ${option.label}`);
    button.setAttribute("aria-pressed", String(storedReaction(gameId) === option.id));
    button.innerHTML = `<span aria-hidden="true">${option.emoji}</span> <span class="reaction-count">0</span>`;
    button.addEventListener("click", async () => {
      const next = storedReaction(gameId) === option.id ? null : option.id;
      for (const item of buttons.values()) item.disabled = true;
      error.textContent = "";
      try {
        const response = await fetch(`/api/sytv/games/${gameId}/reaction`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ visitorId, reaction: next })
        });
        if (!response.ok) throw new Error("반응을 저장하지 못했습니다. 다시 눌러 주세요.");
        const result = await response.json();
        saveReaction(gameId, result.reaction);
        renderGameStats(gameId, result.stats);
      } catch (cause) {
        error.textContent = cause.message || "반응을 저장하지 못했습니다.";
      } finally {
        for (const item of buttons.values()) item.disabled = false;
      }
    });
    reactions.append(button);
    buttons.set(option.id, button);
  }
  engagement.append(downloads, reactions, error);
  card.querySelector(".card-actions").after(engagement);
  gameEngagement.set(gameId, { title, downloads, buttons });
});

async function loadGameStats() {
  try {
    const response = await fetch("/api/sytv/games/stats", { cache: "no-store" });
    if (!response.ok) throw new Error();
    const { games } = await response.json();
    for (const [gameId, stats] of Object.entries(games)) renderGameStats(gameId, stats);
  } catch {
    for (const entry of gameEngagement.values()) {
      if (entry.downloads.textContent === "다운로드 수 불러오는 중…") entry.downloads.textContent = "다운로드 수를 불러오지 못했습니다.";
    }
  }
}

loadGameStats();
window.addEventListener("focus", loadGameStats);

const commentForm = document.querySelector("#comment-form");
const commentList = document.querySelector("#comment-list");
const commentCount = document.querySelector("#comment-count");
const commentMessage = document.querySelector("#comment-message");

function renderComments(comments) {
  commentList.replaceChildren();
  commentCount.textContent = comments.length === 100 ? "최근 댓글 100개" : `댓글 ${comments.length}개`;
  if (!comments.length) {
    const empty = document.createElement("p");
    empty.className = "comment-empty";
    empty.textContent = "첫 댓글을 남겨주세요!";
    commentList.append(empty);
    return;
  }
  const dateFormat = new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul", year: "numeric", month: "short", day: "numeric", hour: "numeric", minute: "2-digit"
  });
  for (const comment of comments) {
    const article = document.createElement("article");
    article.className = "comment-item";
    const head = document.createElement("div");
    head.className = "comment-item-head";
    const nickname = document.createElement("strong");
    nickname.textContent = comment.nickname;
    const date = document.createElement("time");
    date.dateTime = comment.createdAt;
    date.textContent = dateFormat.format(new Date(comment.createdAt));
    const body = document.createElement("p");
    body.textContent = comment.body;
    head.append(nickname, date);
    article.append(head, body);
    commentList.append(article);
  }
}

async function loadComments() {
  try {
    const response = await fetch("/api/sytv/comments", { cache: "no-store" });
    if (!response.ok) throw new Error();
    renderComments(await response.json());
  } catch {
    commentList.textContent = "댓글을 불러오지 못했습니다. 잠시 후 새로고침해 주세요.";
  }
}

commentForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const submit = commentForm.querySelector('button[type="submit"]');
  submit.disabled = true;
  commentMessage.textContent = "";
  const data = new FormData(commentForm);
  try {
    const response = await fetch("/api/sytv/comments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nickname: data.get("nickname"), body: data.get("body"), website: data.get("website") })
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.message || "댓글을 등록하지 못했습니다.");
    commentForm.querySelector("#comment-body").value = "";
    commentMessage.textContent = result.pending ? "댓글이 등록되었습니다. 운영자 확인 후 공개됩니다." : "댓글이 등록되었습니다.";
    await loadComments();
  } catch (error) {
    commentMessage.textContent = error.message || "댓글을 등록하지 못했습니다.";
  } finally {
    submit.disabled = false;
  }
});

loadComments();
