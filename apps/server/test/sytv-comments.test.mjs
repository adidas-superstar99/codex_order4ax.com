import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, test } from "node:test";

const originalCwd = process.cwd;
const directory = mkdtempSync(join(tmpdir(), "sytv-comments-"));
process.cwd = () => directory;
process.env.DATABASE_URL = directory; // A directory cannot be opened as SQLite, so the local store is used.
mkdirSync(join(directory, "data"));
const storePath = join(directory, "data/sytv-store.json");
writeFileSync(storePath, JSON.stringify({
  visits: [], downloads: [], reactions: [], comments: [{
    id: "old-comment", nickname: "기존 방문자", body: "재미있어요!", status: "published",
    createdAt: "2026-10-01T00:00:00.000Z"
  }]
}));

const { createSytvComment, listSytvComments } = await import("../src/services/sytvService.ts");
process.cwd = originalCwd;

test("기존 댓글은 응원 댓글로 보이고 오류 제보는 게임별로 구분된다", async () => {
  const support = await listSytvComments(false, "support");
  assert.equal(support.length, 1);
  assert.equal(support[0].category, "support");
  assert.equal(support[0].gameId, null);

  const report = await createSytvComment("테스터", "시작할 때 화면이 멈춰요", "bug", "quizquiz");
  assert.equal(report.category, "bug");
  assert.equal(report.gameId, "quizquiz");
  assert.deepEqual((await listSytvComments(false, "bug", "quizquiz")).map((item) => item.id), [report.id]);
  assert.equal((await listSytvComments(false, "bug", "minekart")).length, 0);
  assert.equal((await listSytvComments(false, "support")).length, 1);

  const saved = JSON.parse(readFileSync(storePath, "utf8"));
  assert.equal(saved.comments[0].id, "old-comment");
});

test("오류 제보에는 등록된 게임이 필요하다", async () => {
  await assert.rejects(createSytvComment("테스터", "화면이 멈춰요", "bug"), /게임/);
  await assert.rejects(createSytvComment("테스터", "화면이 멈춰요", "bug", "unknown"), /게임/);
});

after(() => {
  rmSync(directory, { recursive: true, force: true });
});
