import { ArrowRight, Clock3, ShieldCheck } from "lucide-react";
import { useEffect, useState } from "react";
import { fetchPublicOrderBatches } from "../api";
import type { OrderBatch } from "../types";

function formatCreatedAt(value: string) {
  return new Date(value).toLocaleString("ko-KR", {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}

export function OrderListPage() {
  const [batches, setBatches] = useState<OrderBatch[]>([]);
  const [message, setMessage] = useState("");

  useEffect(() => {
    fetchPublicOrderBatches()
      .then(setBatches)
      .catch((error) => setMessage(error instanceof Error ? error.message : "주문 목록을 불러오지 못했습니다."));
  }, []);

  return (
    <main className="app-shell premium-shell">
      <section className="hero-panel">
        <div className="hero-copy">
          <p className="eyebrow">SAMOO AX 음료 주문</p>
          <h1>열려있는 주문 목록을 선택해 주세요</h1>
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
            <span className="brand-chip order-list-chip">주문부서 : AX팀</span>
          </div>
          <div className="hero-stats-grid">
            <div className="stat-card glow-card">
              <ShieldCheck size={18} />
              <strong>{batches.length}</strong>
              <span>현재 열려 있는 주문</span>
            </div>
            <div className="stat-card">
              <Clock3 size={18} />
              <strong>{batches[0] ? formatCreatedAt(batches[0].createdAt) : "-"}</strong>
              <span>가장 최근 개설</span>
            </div>
          </div>
        </div>
      </section>

      <section className="main-panel main-panel-premium" id="order-batch-list">
        <div className="section-heading-row">
          <div>
            <h2>주문 목록</h2>
          </div>
        </div>

        {message ? <p className="status-message premium-status">{message}</p> : null}

        {batches.length ? (
          <div className="batch-grid">
            {batches.map((batch) => (
              <a className="batch-card" href={`/order/${batch.id}`} key={batch.id}>
                <div className="batch-card-header">
                  <div>
                    <h3>{batch.title}</h3>
                  </div>
                  <span className="department-badge">{batch.department}</span>
                </div>
                <div className="batch-card-footer">
                  <span>{formatCreatedAt(batch.createdAt)} 개설</span>
                  <strong>
                    주문하러 가기
                    <ArrowRight size={16} />
                  </strong>
                </div>
              </a>
            ))}
          </div>
        ) : (
          <div className="empty-state">현재 열려 있는 주문 목록이 없습니다.</div>
        )}
      </section>
    </main>
  );
}
