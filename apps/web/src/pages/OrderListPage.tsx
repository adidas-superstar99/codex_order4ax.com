import { ArrowRight } from "lucide-react";
import { useEffect, useState } from "react";
import emartCi from "../assets/emart-ci.png";
import starbucksCi from "../assets/starbucks-ci.png";
import twosomeCi from "../assets/twosome-ci.png";
import { fetchPublicOrderBatches } from "../api";
import type { Brand, OrderBatch } from "../types";

const departmentTones = ["violet", "cyan", "amber", "emerald", "rose", "indigo"] as const;

function getDepartmentTone(department: string) {
  const source = department.trim() || "공용";
  const seed = [...source].reduce((sum, character) => sum + character.charCodeAt(0), 0);
  return departmentTones[seed % departmentTones.length];
}

const brandMarkerMap: Record<Brand, { label: string; logo: string }> = {
  STARBUCKS: { label: "스타벅스", logo: starbucksCi },
  TWOSOME: { label: "투썸플레이스", logo: twosomeCi },
  EMART: { label: "이마트", logo: emartCi }
};

export function OrderListPage() {
  const [batches, setBatches] = useState<OrderBatch[]>([]);
  const [message, setMessage] = useState("");

  useEffect(() => {
    fetchPublicOrderBatches()
      .then(setBatches)
      .catch((error) =>
        setMessage(error instanceof Error ? error.message : "주문 목록을 불러오지 못했습니다.")
      );
  }, []);

  return (
    <main className="app-shell premium-shell order-list-shell">
      <section className="order-list-header-panel">
        <div className="order-list-header-copy">
          <p className="eyebrow">OPEN BATCHES</p>
          <h1>주문 목록</h1>
          <p className="hero-description">
            원하는 주문 목록을 바로 선택해서 들어가세요.
          </p>
        </div>

        <a className="mini-admin-link" href="/admin">
          관리자 보기
        </a>
      </section>

      <section className="main-panel main-panel-premium order-batch-panel">
        <div className="section-heading-row compact order-list-heading">
          <div>
            <p className="section-kicker">Choose Batch</p>
            <h2>주문 목록을 선택하세요</h2>
          </div>
          <span className="section-count">{batches.length}개</span>
        </div>

        {message ? <p className="status-message premium-status">{message}</p> : null}

        {batches.length ? (
          <div className="batch-grid order-list-grid">
            {batches.map((batch) => {
              const tone = getDepartmentTone(batch.department || "공용");

              return (
                <a className="batch-card order-list-card" data-tone={tone} href={`/order/${batch.id}`} key={batch.id}>
                  <div className="batch-card-topline">
                    <span className="batch-card-kicker">공동 주문</span>
                    <span className="department-badge" data-tone={tone}>
                      {batch.department}
                    </span>
                  </div>

                  <div className="batch-card-copy">
                    <h3>{batch.title}</h3>
                    <p className="batch-meta-text">
                      바로 주문 화면으로 이동합니다.
                    </p>
                    {batch.activeBrand ? (
                      <div className="batch-brand-marker">
                        <img
                          className="batch-brand-logo"
                          src={brandMarkerMap[batch.activeBrand].logo}
                          alt={brandMarkerMap[batch.activeBrand].label}
                        />
                        <span>{brandMarkerMap[batch.activeBrand].label}</span>
                      </div>
                    ) : null}
                  </div>

                  <div className="batch-card-footer">
                    <span>{batch.department} 주문 열기</span>
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
