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
          <h1>열려 있는 주문 목록에서 원하는 주문을 선택해 주세요.</h1>
          <p className="hero-description">
            관리자가 오픈한 주문만 이 화면에 보입니다. 주문을 선택하면 해당 주문 전용 페이지로 들어가서 바로 음료를 담을 수 있어요.
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
            <span className="brand-chip">AX팀 기본</span>
            <span className="meta-hint">Open order batches</span>
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
            <p className="section-kicker">Order batches</p>
            <h2>주문 목록</h2>
          </div>
          <span className="section-count">{batches.length} open</span>
        </div>

        {message ? <p className="status-message premium-status">{message}</p> : null}

        {batches.length ? (
          <div className="batch-grid">
            {batches.map((batch) => (
              <a className="batch-card" href={`/order/${batch.id}`} key={batch.id}>
                <div className="batch-card-header">
                  <div>
                    <p className="section-kicker">Open now</p>
                    <h3>{batch.title}</h3>
                  </div>
                  <span className="department-badge">{batch.department}</span>
                </div>
                <p className="batch-card-copy">{batch.memo || "관리자가 열어 둔 주문입니다. 들어가서 원하는 메뉴를 바로 담아 주세요."}</p>
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
          <div className="empty-state">
            현재 열려 있는 주문 목록이 없어요. 관리자가 주문을 열면 이 화면에 바로 나타납니다.
          </div>
        )}
      </section>
    </main>
  );
}
