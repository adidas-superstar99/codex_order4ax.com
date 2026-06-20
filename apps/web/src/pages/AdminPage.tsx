import { CheckCheck, Download, PlusCircle, ReceiptText, RefreshCcw, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import {
  adminHeaders,
  bulkUpdateStatus,
  createOrderBatch,
  deleteAdminOrder,
  deleteOrderBatch,
  exportCsvUrl,
  fetchAdminOrderBatches,
  fetchAdminOrders,
  fetchSummary,
  resendOrderBatchLink,
  updateOrderBatch,
  updateStatus
} from "../api";
import { OrderSummaryTable } from "../components/OrderSummaryTable";
import type { Brand, Order, OrderBatch, OrderStatus, SummaryRow } from "../types";

const statuses: Array<OrderStatus | "ALL"> = ["ALL", "submitted", "confirmed", "ordered", "completed", "cancelled"];
const brands: Array<Brand | "ALL"> = ["ALL", "STARBUCKS", "TWOSOME", "EMART"];

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
  TWOSOME: "투썸플레이스",
  EMART: "이마트"
};

function getTodayInSeoul() {
  return new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(new Date());
}

function getQuantityUnit(brand: Brand) {
  return brand === "EMART" ? "개" : "잔";
}

export function AdminPage() {
  const savedOrganizerName = window.localStorage.getItem("batchOrganizerName") ?? "";
  const savedOrganizerEmail = window.localStorage.getItem("batchOrganizerEmail") ?? "";
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
  const [latestOrderUrl, setLatestOrderUrl] = useState("");
  const [isApplyingBulkAction, setIsApplyingBulkAction] = useState(false);
  const [newBatch, setNewBatch] = useState({
    title: "",
    department: "AX팀",
    memo: "",
    organizerName: savedOrganizerName,
    organizerEmail: savedOrganizerEmail,
    adminPassword: ""
  });

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
      const result = await createOrderBatch(password, newBatch);
      window.localStorage.setItem("batchOrganizerName", newBatch.organizerName);
      window.localStorage.setItem("batchOrganizerEmail", newBatch.organizerEmail);
      setLatestOrderUrl(result.orderUrl);
      setNewBatch((current) => ({ ...current, title: "", memo: "", adminPassword: "" }));
      await load();
      setMessage(result.emailDelivery.ok ? "새 주문 묶음을 만들고 링크 메일도 보냈습니다." : "새 주문 묶음을 만들었습니다. 메일 설정은 아직 확인이 필요합니다.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "주문 묶음 생성에 실패했습니다.");
    }
  }

  async function copyLatestOrderUrl() {
    if (!latestOrderUrl) return;
    await navigator.clipboard.writeText(latestOrderUrl);
    setMessage("주문방 링크를 복사했습니다.");
  }

  async function resendLink(batch: OrderBatch) {
    try {
      const result = await resendOrderBatchLink(password, batch.id);
      setLatestOrderUrl(result.orderUrl);
      setMessage(result.emailDelivery.ok ? "링크 메일을 다시 보냈습니다." : "링크 메일 설정이 아직 완료되지 않았습니다.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "링크 메일 재발송에 실패했습니다.");
    }
  }

  async function toggleBatch(batch: OrderBatch) {
    try {
      await updateOrderBatch(password, batch.id, {
        status: batch.status === "open" ? "closed" : "open"
      });
      await load();
      setMessage(batch.status === "open" ? "주문 묶음을 마감했습니다." : "주문 묶음을 다시 열었습니다.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "주문 묶음 상태 변경에 실패했습니다.");
    }
  }

  async function removeBatch(batch: OrderBatch) {
    const confirmed = window.confirm(`"${batch.title}" 주문 묶음을 삭제할까요?`);
    if (!confirmed) return;

    try {
      await deleteOrderBatch(password, batch.id);
      if (batchId === batch.id) {
        setBatchId("");
      }
      await load();
      setMessage("주문 묶음을 삭제했습니다.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "주문 묶음 삭제에 실패했습니다.");
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
    const response = await fetch(exportCsvUrl({ batchId: batchId || undefined, date, brand, status }), {
      headers: adminHeaders(password)
    });
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
          <h1>SAMOO AX 음료/간식 주문 관리자</h1>
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
          <h1>SAMOO AX 음료/간식 주문</h1>
          <p>주문 묶음을 만들고, 브랜드별 주문과 집계를 한 화면에서 관리합니다.</p>
        </div>
        <a className="admin-link" href="/">주문 목록</a>
      </section>

      <section className="dashboard-grid admin-dashboard-grid">
        <div className="dashboard-section">
          <div className="section-heading-row">
            <div>
              <p className="section-kicker">Batch manager</p>
              <h2>주문 묶음 관리</h2>
            </div>
            <span className="section-count">{batches.length} total</span>
          </div>

          <form className="batch-create-form" onSubmit={handleCreateBatch}>
            <label className="field">
              <span>개설자 이름</span>
              <input
                value={newBatch.organizerName}
                onChange={(event) => setNewBatch({ ...newBatch, organizerName: event.target.value })}
                placeholder="회의 개설자 이름"
              />
            </label>
            <label className="field">
              <span>개설자 이메일</span>
              <input
                type="email"
                value={newBatch.organizerEmail}
                onChange={(event) => setNewBatch({ ...newBatch, organizerEmail: event.target.value })}
                placeholder="name@company.com"
              />
            </label>
            <label className="field">
              <span>주문 제목</span>
              <input
                value={newBatch.title}
                onChange={(event) => setNewBatch({ ...newBatch, title: event.target.value })}
                placeholder="예: 오후 간식 주문"
              />
            </label>
            <label className="field">
              <span>부서명</span>
              <input
                value={newBatch.department}
                onChange={(event) => setNewBatch({ ...newBatch, department: event.target.value })}
                placeholder="AX팀"
              />
            </label>
            <label className="field">
              <span>메모</span>
              <input
                value={newBatch.memo}
                onChange={(event) => setNewBatch({ ...newBatch, memo: event.target.value })}
                placeholder="주문 안내 메모"
              />
            </label>
            <label className="field">
              <span>주문방 비밀번호</span>
              <input
                type="password"
                value={newBatch.adminPassword}
                onChange={(event) => setNewBatch({ ...newBatch, adminPassword: event.target.value })}
                placeholder="주문방 관리용 비밀번호"
              />
            </label>
            <button className="primary-button" type="submit">
              <PlusCircle size={18} />
              주문 묶음 생성
            </button>
          </form>

          {latestOrderUrl ? (
            <div className="dashboard-section">
              <h3>방금 만든 주문방 링크</h3>
              <p>{latestOrderUrl}</p>
              <button className="secondary-button" type="button" onClick={copyLatestOrderUrl}>
                링크 복사
              </button>
            </div>
          ) : null}

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
                <p className="batch-card-copy">{batch.organizerName} · {batch.organizerEmail}</p>
                <div className="admin-batch-actions">
                  <button className="secondary-button" type="button" onClick={() => setBatchId(batch.id)}>
                    주문 보기
                  </button>
                  <button className="secondary-button" type="button" onClick={() => resendLink(batch)}>
                    링크 메일 재발송
                  </button>
                  <button className="secondary-button" type="button" onClick={() => toggleBatch(batch)}>
                    {batch.status === "open" ? "마감" : "다시 열기"}
                  </button>
                  <button className="secondary-button danger-button" type="button" onClick={() => removeBatch(batch)}>
                    <Trash2 size={15} />
                    삭제
                  </button>
                </div>
              </article>
            ))}
          </div>
        </div>

        <div className="dashboard-section">
          <section className="admin-toolbar">
            <label className="field compact">
              <span>주문 묶음</span>
              <select value={batchId} onChange={(event) => setBatchId(event.target.value)}>
                <option value="">전체 주문 묶음</option>
                {batches.map((batch) => (
                  <option key={batch.id} value={batch.id}>{batch.title}</option>
                ))}
              </select>
            </label>
            <label className="field compact">
              <span>주문 날짜</span>
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
                          {brandLabels[item.brand]} · {item.menuName} · {item.size} · {item.quantity}
                          {getQuantityUnit(item.brand)}
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
