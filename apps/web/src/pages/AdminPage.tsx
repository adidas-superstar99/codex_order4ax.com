import { CheckCheck, Download, PlusCircle, ReceiptText, RefreshCcw, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import {
  adminHeaders,
  bulkUpdateStatus,
  createOrderBatch,
  deleteAdminOrder,
  exportCsvUrl,
  fetchAdminOrderBatches,
  fetchAdminOrders,
  fetchSummary,
  updateOrderBatch,
  updateStatus
} from "../api";
import { OrderSummaryTable } from "../components/OrderSummaryTable";
import type { Brand, Order, OrderBatch, OrderStatus, SummaryRow } from "../types";

const statuses: Array<OrderStatus | "ALL"> = ["ALL", "submitted", "confirmed", "ordered", "completed", "cancelled"];
const brands: Array<Brand | "ALL"> = ["ALL", "STARBUCKS", "TWOSOME"];

const statusLabels: Record<OrderStatus | "ALL", string> = {
  ALL: "전체 상태",
  submitted: "주문 접수",
  confirmed: "주문 확정",
  ordered: "매장 주문 완료",
  completed: "수령 완료",
  cancelled: "취소"
};

const brandLabels: Record<Brand | "ALL", string> = {
  ALL: "전체 브랜드",
  STARBUCKS: "스타벅스",
  TWOSOME: "투썸플레이스"
};

function getTodayInSeoul() {
  return new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(new Date());
}

export function AdminPage() {
  const [password, setPassword] = useState(() => window.localStorage.getItem("adminPassword") ?? "1234");
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [date, setDate] = useState(() => getTodayInSeoul());
  const [brand, setBrand] = useState<Brand | "ALL">("ALL");
  const [status, setStatus] = useState<OrderStatus | "ALL">("ALL");
  const [batchId, setBatchId] = useState("");
  const [batches, setBatches] = useState<OrderBatch[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [summary, setSummary] = useState<SummaryRow[]>([]);
  const [message, setMessage] = useState("");
  const [isApplyingBulkAction, setIsApplyingBulkAction] = useState(false);
  const [newBatch, setNewBatch] = useState({ title: "", department: "AX팀", memo: "" });

  useEffect(() => {
    if (isUnlocked) void load();
  }, [isUnlocked, batchId, date, brand, status]);

  async function unlock(event: FormEvent) {
    event.preventDefault();
    window.localStorage.setItem("adminPassword", password);
    setIsUnlocked(true);
  }

  async function load() {
    setMessage("");
    try {
      const params = { batchId: batchId || undefined, date, brand, status };
      const [nextBatches, nextOrders, nextSummary] = await Promise.all([
        fetchAdminOrderBatches(password),
        fetchAdminOrders(password, params),
        fetchSummary(password, params)
      ]);
      setBatches(nextBatches);
      setOrders(nextOrders);
      setSummary(nextSummary);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "관리자 데이터를 불러오지 못했습니다.");
      setIsUnlocked(false);
    }
  }

  async function handleCreateBatch(event: FormEvent) {
    event.preventDefault();
    try {
      await createOrderBatch(password, newBatch);
      setNewBatch({ title: "", department: "AX팀", memo: "" });
      await load();
      setMessage("새 주문 목록을 만들었습니다.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "주문 목록 생성에 실패했습니다.");
    }
  }

  async function toggleBatch(batch: OrderBatch) {
    try {
      await updateOrderBatch(password, batch.id, {
        status: batch.status === "open" ? "closed" : "open"
      });
      await load();
      setMessage(batch.status === "open" ? "주문 목록을 마감했습니다." : "주문 목록을 다시 열었습니다.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "주문 목록 상태 변경에 실패했습니다.");
    }
  }

  async function changeStatus(orderId: string, nextStatus: OrderStatus) {
    try {
      await updateStatus(password, orderId, nextStatus);
      await load();
      setMessage(`주문 상태를 ${statusLabels[nextStatus]}로 변경했습니다.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "상태 변경에 실패했습니다.");
    }
  }

  async function removeOrder(orderId: string) {
    try {
      await deleteAdminOrder(password, orderId);
      await load();
      setMessage("주문을 삭제했습니다.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "주문 삭제에 실패했습니다.");
    }
  }

  async function applyBulkStatus(nextStatus: OrderStatus) {
    setIsApplyingBulkAction(true);
    try {
      const result = await bulkUpdateStatus(password, {
        status: nextStatus,
        filters: { batchId: batchId || undefined, date, brand, status }
      });
      await load();
      setMessage(
        result.updatedCount
          ? `${result.updatedCount}건을 ${statusLabels[nextStatus]} 상태로 일괄 변경했습니다.`
          : "변경할 주문이 없어 상태를 그대로 유지했습니다."
      );
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "일괄 상태 변경에 실패했습니다.");
    } finally {
      setIsApplyingBulkAction(false);
    }
  }

  async function downloadCsv() {
    const response = await fetch(exportCsvUrl({ batchId: batchId || undefined, date, brand, status }), { headers: adminHeaders(password) });
    if (!response.ok) {
      setMessage("CSV 다운로드에 실패했습니다.");
      return;
    }
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `orders-${date || "all"}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  if (!isUnlocked) {
    return (
      <main className="admin-login">
        <form onSubmit={unlock}>
          <p className="eyebrow">Admin</p>
          <h1>SAMOO AX 음료 주문 관리자</h1>
          <label className="field">
            <span>관리자 비밀번호</span>
            <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} />
          </label>
          {message ? <p className="status-message">{message}</p> : null}
          <button className="primary-button" type="submit">입장</button>
          <a className="text-link" href="/">주문 목록으로</a>
        </form>
      </main>
    );
  }

  return (
    <main className="app-shell">
      <section className="order-header">
        <div>
          <p className="eyebrow">Admin dashboard</p>
          <h1>SAMOO AX 음료 주문</h1>
          <p>주문 목록을 생성하고 열림/마감을 관리한 뒤, 선택한 주문 목록 기준으로 실제 주문 현황을 취합할 수 있습니다.</p>
        </div>
        <a className="admin-link" href="/">주문 목록</a>
      </section>

      <section className="dashboard-grid admin-dashboard-grid">
        <div className="dashboard-section">
          <div className="section-heading-row">
            <div>
              <p className="section-kicker">Batch manager</p>
              <h2>주문 목록 관리</h2>
            </div>
            <span className="section-count">{batches.length} total</span>
          </div>

          <form className="batch-create-form" onSubmit={handleCreateBatch}>
            <label className="field">
              <span>주문 제목</span>
              <input value={newBatch.title} onChange={(event) => setNewBatch({ ...newBatch, title: event.target.value })} placeholder="예: 월요일 오후 간식 주문" />
            </label>
            <label className="field">
              <span>부서명</span>
              <input value={newBatch.department} onChange={(event) => setNewBatch({ ...newBatch, department: event.target.value })} placeholder="AX팀" />
            </label>
            <label className="field">
              <span>메모</span>
              <input value={newBatch.memo} onChange={(event) => setNewBatch({ ...newBatch, memo: event.target.value })} placeholder="주문 안내 메모" />
            </label>
            <button className="primary-button" type="submit">
              <PlusCircle size={18} />
              주문 목록 생성
            </button>
          </form>

          <div className="batch-grid compact-batch-grid">
            {batches.map((batch) => (
              <article className="batch-card admin-batch-card" key={batch.id}>
                <div className="batch-card-header">
                  <div>
                    <p className="section-kicker">{batch.status === "open" ? "Open" : "Closed"}</p>
                    <h3>{batch.title}</h3>
                  </div>
                  <span className="department-badge">{batch.department}</span>
                </div>
                <p className="batch-card-copy">{batch.memo || "메모 없음"}</p>
                <div className="admin-batch-actions">
                  <button className="secondary-button" type="button" onClick={() => setBatchId(batch.id)}>
                    이 주문 보기
                  </button>
                  <button className="secondary-button" type="button" onClick={() => toggleBatch(batch)}>
                    {batch.status === "open" ? "마감" : "다시 열기"}
                  </button>
                </div>
              </article>
            ))}
          </div>
        </div>

        <div className="dashboard-section">
          <section className="admin-toolbar">
            <label className="field compact">
              <span>주문 목록</span>
              <select value={batchId} onChange={(event) => setBatchId(event.target.value)}>
                <option value="">전체 주문 목록</option>
                {batches.map((batch) => (
                  <option key={batch.id} value={batch.id}>{batch.title}</option>
                ))}
              </select>
            </label>
            <label className="field compact">
              <span>주문 일자</span>
              <input type="date" value={date} onChange={(event) => setDate(event.target.value)} />
            </label>
            <label className="field compact">
              <span>브랜드</span>
              <select value={brand} onChange={(event) => setBrand(event.target.value as Brand | "ALL")}>
                {brands.map((item) => (
                  <option key={item} value={item}>{brandLabels[item]}</option>
                ))}
              </select>
            </label>
            <label className="field compact">
              <span>상태</span>
              <select value={status} onChange={(event) => setStatus(event.target.value as OrderStatus | "ALL")}>
                {statuses.map((item) => (
                  <option key={item} value={item}>{statusLabels[item]}</option>
                ))}
              </select>
            </label>
            <button className="secondary-button" type="button" onClick={load}>
              <RefreshCcw size={17} />
              새로고침
            </button>
            <button className="secondary-button" type="button" onClick={downloadCsv}>
              <Download size={17} />
              CSV
            </button>
          </section>

          <section className="bulk-action-bar">
            <button className="secondary-button" type="button" disabled={isApplyingBulkAction} onClick={() => applyBulkStatus("confirmed")}>
              <CheckCheck size={16} />
              전체 주문 확정
            </button>
            <button className="secondary-button" type="button" disabled={isApplyingBulkAction} onClick={() => applyBulkStatus("ordered")}>
              <ReceiptText size={16} />
              전체 매장 주문 완료
            </button>
            <button className="secondary-button" type="button" disabled={isApplyingBulkAction} onClick={() => applyBulkStatus("completed")}>
              <CheckCheck size={16} />
              전체 수령 완료
            </button>
          </section>

          {message ? <p className="status-message">{message}</p> : null}

          <div className="dashboard-grid">
            <div className="dashboard-section">
              <h2>메뉴별 집계</h2>
              <OrderSummaryTable rows={summary} />
            </div>

            <div className="dashboard-section">
              <h2>주문 목록</h2>
              <div className="order-list">
                {orders.length ? orders.map((order) => (
                  <article className="order-row" key={order.id}>
                    <header>
                      <div>
                        <strong>{order.ordererName}</strong>
                        <span>{new Date(order.orderedAt).toLocaleString("ko-KR")}</span>
                      </div>
                      <div className="admin-order-actions">
                        <select value={order.status} onChange={(event) => changeStatus(order.id, event.target.value as OrderStatus)}>
                          {statuses.filter((item) => item !== "ALL").map((item) => (
                            <option key={item} value={item}>{statusLabels[item]}</option>
                          ))}
                        </select>
                        <button className="secondary-button danger-button" type="button" onClick={() => removeOrder(order.id)}>
                          <Trash2 size={15} />
                          삭제
                        </button>
                      </div>
                    </header>
                    <dl>
                      <div><dt>부서명</dt><dd>{order.team || "-"}</dd></div>
                      <div><dt>연락처</dt><dd>{order.contact || "-"}</dd></div>
                      <div><dt>메모</dt><dd>{order.memo || "-"}</dd></div>
                    </dl>
                    <ul>
                      {order.items.map((item) => (
                        <li key={item.id}>
                          {brandLabels[item.brand]} · {item.menuName} · {item.size} · {item.quantity}잔
                          {item.customRequest ? <em>{item.customRequest}</em> : null}
                        </li>
                      ))}
                    </ul>
                  </article>
                )) : <div className="empty-state">조회된 주문이 없습니다.</div>}
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
