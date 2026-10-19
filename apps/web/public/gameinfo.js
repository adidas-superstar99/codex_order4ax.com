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

  button.addEventListener("click", () => {
    const player = document.createElement("iframe");
    player.src = `${videoUrl}?autoplay=1`;
    player.title = title;
    player.allow = "autoplay; fullscreen; picture-in-picture";
    player.allowFullscreen = true;
    player.setAttribute("referrerpolicy", "strict-origin-when-cross-origin");
    wrapper.replaceChildren(player);
  });
});
