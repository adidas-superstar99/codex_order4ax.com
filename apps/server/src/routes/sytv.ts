import { createHash } from "node:crypto";
import { Router } from "express";
import type { Request, Response } from "express";
import {
  createSytvComment,
  getSytvGameStats,
  getSytvStats,
  isSytvGameId,
  listSytvComments,
  recordSytvDownload,
  recordSytvVisit,
  seoulDay,
  setSytvReaction,
  sytvGameFiles,
  updateSytvCommentStatus,
  type SytvComment
} from "../services/sytvService.js";

export const publicSytvRouter = Router();
export const adminSytvRouter = Router();

const recentComments = new Map<string, number[]>();

function isSameOrigin(req: Request) {
  const origin = req.header("origin");
  if (!origin) return true;
  try {
    return new URL(origin).host === req.get("host");
  } catch {
    return false;
  }
}

publicSytvRouter.post("/visit", async (req: Request, res: Response) => {
  if (!isSameOrigin(req)) {
    res.status(403).json({ message: "허용되지 않은 요청입니다." });
    return;
  }
  try {
    await recordSytvVisit(String(req.body?.visitorId ?? ""));
    res.json({ ok: true });
  } catch (error) {
    const invalid = error instanceof Error && error.message === "방문 식별값이 올바르지 않습니다.";
    res.status(invalid ? 400 : 500).json({ message: invalid ? error.message : "방문 기록에 실패했습니다." });
  }
});

publicSytvRouter.get("/games/stats", async (_req: Request, res: Response) => {
  try {
    res.setHeader("Cache-Control", "no-store");
    res.json(await getSytvGameStats());
  } catch {
    res.status(500).json({ message: "게임 통계를 불러오지 못했습니다." });
  }
});

publicSytvRouter.get("/download/:gameId", async (req: Request, res: Response) => {
  if (!isSytvGameId(req.params.gameId)) {
    res.status(404).send("게임을 찾을 수 없습니다.");
    return;
  }
  try {
    const prefetch = `${req.header("purpose") ?? ""} ${req.header("sec-purpose") ?? ""}`.includes("prefetch");
    const url = req.method === "HEAD" || prefetch
      ? `https://drive.google.com/uc?export=download&id=${sytvGameFiles[req.params.gameId]}`
      : await recordSytvDownload(req.params.gameId);
    res.setHeader("Cache-Control", "no-store");
    res.redirect(302, url);
  } catch {
    res.status(500).send("다운로드 링크를 열지 못했습니다. 잠시 후 다시 시도해 주세요.");
  }
});

publicSytvRouter.post("/games/:gameId/reaction", async (req: Request, res: Response) => {
  if (!isSameOrigin(req)) {
    res.status(403).json({ message: "허용되지 않은 요청입니다." });
    return;
  }
  if (!isSytvGameId(req.params.gameId)) {
    res.status(404).json({ message: "게임을 찾을 수 없습니다." });
    return;
  }
  const reaction = req.body?.reaction;
  if (reaction !== null && reaction !== "heart" && reaction !== "clap" && reaction !== "fire") {
    res.status(400).json({ message: "반응이 올바르지 않습니다." });
    return;
  }
  try {
    const stats = await setSytvReaction(req.params.gameId, String(req.body?.visitorId ?? ""), reaction);
    res.setHeader("Cache-Control", "no-store");
    res.json({ reaction, stats });
  } catch (error) {
    const invalid = error instanceof Error && error.message === "방문 식별값이 올바르지 않습니다.";
    res.status(invalid ? 400 : 500).json({ message: invalid ? error.message : "반응을 저장하지 못했습니다." });
  }
});

publicSytvRouter.get("/comments", async (_req: Request, res: Response) => {
  try {
    const comments = await listSytvComments();
    res.setHeader("Cache-Control", "no-store");
    res.json(comments);
  } catch {
    res.status(500).json({ message: "댓글을 불러오지 못했습니다." });
  }
});

publicSytvRouter.post("/comments", async (req: Request, res: Response) => {
  if (!isSameOrigin(req)) {
    res.status(403).json({ message: "허용되지 않은 요청입니다." });
    return;
  }
  if (req.body?.website) {
    res.status(400).json({ message: "댓글을 등록할 수 없습니다." });
    return;
  }
  const ipHash = createHash("sha256").update(req.ip || "unknown").digest("hex");
  const now = Date.now();
  const recent = (recentComments.get(ipHash) ?? []).filter((time) => now - time < 10 * 60_000);
  if (recent.length >= 3) {
    res.status(429).json({ message: "댓글은 10분에 3개까지 작성할 수 있습니다." });
    return;
  }
  try {
    if (typeof req.body?.nickname !== "string" || typeof req.body?.body !== "string") {
      throw new Error("닉네임과 댓글을 입력해 주세요.");
    }
    const comment = await createSytvComment(req.body.nickname, req.body.body);
    recent.push(now);
    recentComments.set(ipHash, recent);
    res.status(201).json({ comment, pending: comment.status === "pending" });
  } catch (error) {
    const message = error instanceof Error ? error.message : "댓글을 등록하지 못했습니다.";
    res.status(message.includes("입력") ? 400 : 500).json({ message });
  }
});

adminSytvRouter.get("/stats", async (req: Request, res: Response) => {
  try {
    const stats = await getSytvStats(typeof req.query.day === "string" ? req.query.day : seoulDay());
    res.setHeader("Cache-Control", "no-store");
    res.json(stats);
  } catch (error) {
    res.status(400).json({ message: error instanceof Error ? error.message : "통계를 불러오지 못했습니다." });
  }
});

adminSytvRouter.get("/comments", async (_req: Request, res: Response) => {
  try {
    res.setHeader("Cache-Control", "no-store");
    res.json(await listSytvComments(true));
  } catch {
    res.status(500).json({ message: "댓글을 불러오지 못했습니다." });
  }
});

adminSytvRouter.patch("/comments/:id", async (req: Request, res: Response) => {
  const status = req.body?.status;
  if (status !== "published" && status !== "hidden") {
    res.status(400).json({ message: "상태가 올바르지 않습니다." });
    return;
  }
  try {
    const updated = await updateSytvCommentStatus(req.params.id, status as SytvComment["status"]);
    if (!updated) {
      res.status(404).json({ message: "댓글을 찾을 수 없습니다." });
      return;
    }
    res.json({ ok: true });
  } catch {
    res.status(500).json({ message: "댓글을 수정하지 못했습니다." });
  }
});
