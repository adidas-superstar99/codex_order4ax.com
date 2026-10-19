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
  "1NCn5Y26XR0V-_W-7k_cVmK3-CvWHyAKE": "/gameinfo-assets/tower-thumbnail.jpg"
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
  "1NCn5Y26XR0V-_W-7k_cVmK3-CvWHyAKE": "/gameinfo-assets/tower-promo.mp4"
};

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
