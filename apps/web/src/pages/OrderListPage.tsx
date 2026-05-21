import { ArrowRight, Clock3, Layers3, ShieldCheck } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { fetchPublicOrderBatches } from "../api";
import type { OrderBatch } from "../types";

const departmentTones = ["violet", "cyan", "amber", "emerald", "rose", "indigo"] as const;

function formatCreatedAt(value: string) {
  return new Date(value).toLocaleString("ko-KR", {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function getDepartmentTone(department: string) {
  const source = department.trim() || "기타";
  const seed = [...source].reduce((sum, character) => sum + character.charCodeAt(0), 0);
  return departmentTones[seed % departmentTones.length];
}

export function OrderListPage() {
  const [batches, setBatches] = useState<OrderBatch[]>([]);
  const [message, setMessage] = useState("");

  const departmentSummary = useMemo(() => {
    return batches.reduce<Record<string, number>>((acc, batch) => {
      const key = batch.department || "기타";
      acc[key] = (acc[key] ?? 0) + 1;
      return acc;
    }, {});
  }, [batches]);

  const summaryEntries = Object.entries(departmentSummary);

  useEffect(() => {
    fetchPublicOrderBatches()
      .then(setBatches)
      .catch((error) => setMessage(error instanceof Error ? error.message : "주문 목록을 불러오지 못했습니다."));
  }, []);

  return (
    <main className="app-shell premium-shell">
      <section className="hero-panel">
        <div className="hero-copy">
          <p className="eyebrow">SAMOO AX 주문 허브</p>
          <h1>주문 목록을 선택하세요</h1>
          <p className="hero-description">
            부서별로 색을 달리해 구분하고, 각 주문 카드에서 바로 주문 화면으로 이동할 수 있게 정리했습니다.
          </p>
          <div className="hero-actions">
            <a className="hero-cta" href="#order-batch-list">
              주문 목록 보기
              <ArrowRight size={18} />
            </a>
            <a className="admin-link subtle-link" href="/admin">관리자 보기</a>
          </div>
        </div>

        <div className="hero-meta-card">
          <div className="hero-meta-header">
            <span className="brand-chip order-list-chip">주문 요약</span>
          </div>
          <div className="hero-stats-grid">
            <div className="stat-card glow-card">
              <Layers3 size={18} />
              <strong>{batches.length}개</strong>
              <span>현재 열려 있는 주문 배치</span>
            </div>
            <div className="stat-card">
              <Clock3 size={18} />
              <strong>{batches[0] ? formatCreatedAt(batches[0].createdAt) : "-"}</strong>
              <span>가장 최근 생성된 주문</span>
            </div>
          </div>
          <div className="department-summary-row">
            {summaryEntries.length ? (
              summaryEntries.map(([department, count]) => (
                <span
                  className="department-summary-chip"
                  data-tone={getDepartmentTone(department)}
                  key={department}
                >
                  {department} {count}건
                </span>
              ))
            ) : (
              <div className="empty-state compact-empty-state">현재 열려 있는 주문이 없습니다.</div>
            )}
          </div>
        </div>
      </section>

      <section className="main-panel main-panel-premium order-batch-panel" id="order-batch-list">
        <div className="section-heading-row">
          <div>
            <p className="section-kicker">Open Batches</p>
            <h2>주문 목록</h2>
          </div>
        </div>

        {message ? <p className="status-message premium-status">{message}</p> : null}

        {batches.length ? (
          <div className="batch-grid">
            {batches.map((batch) => {
              const tone = getDepartmentTone(batch.department || "기타");

              return (
                <a className="batch-card" data-tone={tone} href={`/order/${batch.id}`} key={batch.id}>
                  <div className="batch-card-header">
                    <div className="batch-card-copy">
                      <span className="batch-card-kicker">공동 주문</span>
                      <h3>{batch.title}</h3>
                      <p className="batch-meta-text">선택하면 바로 주문 화면으로 이동합니다.</p>
                    </div>
                    <span className="department-badge" data-tone={tone}>{batch.department}</span>
                  </div>

                  <div className="batch-inline-meta">
                    <span className="batch-meta-text">
                      <ShieldCheck size={16} />
                      부서별 색상으로 구분
                    </span>
                    <span className="batch-meta-text">
                      <Clock3 size={16} />
                      {formatCreatedAt(batch.createdAt)}
                    </span>
                  </div>

                  <div className="batch-card-footer">
                    <span>{batch.department} 주문으로 이동</span>
                    <strong>
                      주문하러 가기
                      <ArrowRight size={16} />
                    </strong>
                  </div>
                </a>
              );
            })}
          </div>
        ) : (
          <div className="empty-state">현재 열려 있는 주문 목록이 없습니다.</div>
        )}
      </section>
    </main>
  );
}
