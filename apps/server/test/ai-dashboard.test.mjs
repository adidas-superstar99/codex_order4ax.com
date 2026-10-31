import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createServer } from "node:net";
import { after, test } from "node:test";

const temp = mkdtempSync(join(tmpdir(), "ai-dashboard-"));
const freePort = await new Promise((resolve) => {
  const server = createServer();
  server.listen(0, "127.0.0.1", () => {
    const port = server.address().port;
    server.close(() => resolve(port));
  });
});
const base = `http://127.0.0.1:${freePort}`;
const processUnderTest = spawn("node", ["--import", "tsx", "apps/server/src/index.ts"], {
  cwd: process.cwd(),
  env: { ...process.env, PORT: String(freePort), DATABASE_URL: temp,
    AI_DASHBOARD_PASSWORD: "viewer-test-password", AI_DASHBOARD_INGEST_TOKEN: "ingest-test-token",
    AI_SNAPSHOT_FILE: join(temp, "snapshot.json") },
  stdio: "ignore"
});

for (let i = 0; i < 80; i++) {
  try {
    const response = await fetch(base + "/api/health");
    if (response.ok) break;
  } catch {}
  await new Promise((resolve) => setTimeout(resolve, 100));
}

const viewer = { Authorization: `Basic ${Buffer.from("user:viewer-test-password").toString("base64")}` };
const snapshot = {
  sent_at: "2026-10-31T00:00:00Z",
  spec: { cpu_count: 2, cpu_model: "Test CPU", disk_path: "/workspace" },
  sample: { at: "2026-10-31T00:00:00Z", cpu: 12.5, memory: 20, disk: 30,
    memory_total: 8000000000, memory_available: 6000000000, disk_total: 100000000000,
    disk_free: 70000000000, uptime: 120, net_rx: 10, net_tx: 20, load1: 0.1 },
  google: { status: "미연결" }, hostinger: { status: "미연결" },
  telegram: { status: "미연결" }, history: [], logs: []
};

test("private AI page and API reject visitors without the viewer password", async () => {
  for (const path of ["/ai", "/ai.html", "/api/ai/status"]) {
    const response = await fetch(base + path);
    assert.equal(response.status, 401, path);
  }
});

test("ingest accepts only its separate token and the viewer sees the snapshot", async () => {
  const denied = await fetch(base + "/api/ai/ingest", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(snapshot) });
  assert.equal(denied.status, 401);
  const accepted = await fetch(base + "/api/ai/ingest", { method: "POST", headers: { "Content-Type": "application/json", Authorization: "Bearer ingest-test-token" }, body: JSON.stringify(snapshot) });
  assert.equal(accepted.status, 202);
  const response = await fetch(base + "/api/ai/status", { headers: viewer });
  assert.equal(response.status, 200);
  const result = await response.json();
  assert.equal(result.snapshot.sample.cpu, 12.5);
  assert.ok(result.received_at);
  const page = await fetch(base + "/ai", { headers: viewer });
  assert.equal(page.status, 200);
  assert.match(await page.text(), /서버 상태판/);
});

after(() => {
  processUnderTest.kill();
  rmSync(temp, { recursive: true, force: true });
});
