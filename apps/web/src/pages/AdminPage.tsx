import { CheckCheck, Download, ReceiptText, RefreshCcw } from "lucide-react";
import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { adminHeaders, bulkUpdateStatus, exportCsvUrl, fetchAdminOrders, fetchSummary, updateStatus } from "../api";
import { OrderSummaryTable } from "../components/OrderSummaryTable";
import type { Brand, Order, OrderStatus, SummaryRow } from "../types";

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
  const [password, setPassword] = useState(() => window.localStorage.getItem("adminPassword") ?? "");
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [date, setDate] = useState(() => getTodayInSeoul());
  const [brand, setBrand] = useState<Brand | "ALL">("ALL");
  const [status, setStatus] = useState<OrderStatus | "ALL">("ALL");
  const [orders, setOrders] = useState<Order[]>([]);
  const [summary, setSummary] = useState<SummaryRow[]>([]);
  const [message, setMessage] = useState("");
  const [isApplyingBulkAction, setIsApplyingBulkAction] = useState(false);

  useEffect(() => {
    if (isUnlocked) void load();
  }, [isUnlocked, date, brand, status]);

  async function unlock(event: FormEvent) {
    event.preventDefault();
    window.localStorage.setItem("adminPassword", password);
    setIsUnlocked(true);
  }

  async function load() {
    setMessage("");
    try {
      const params = { date, brand, status };
      const [nextOrders, nextSummary] = await Promise.all([fetchAdminOrders(password, params), fetchSummary(password, params)]);
      setOrders(nextOrders);
      setSummary(nextSummary);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "관리자 데이터를 불러오지 못했습니다.");
      setIsUnlocked(false);
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

  async function applyBulkStatus(nextStatus: OrderStatus) {
    setIsApplyingBulkAction(true);
    try {
      const result = await bulkUpdateStatus(password, {
        status: nextStatus,
        filters: { date, brand, status }
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
    const response = await fetch(exportCsvUrl({ date, brand, status }), { headers: adminHeaders(password) });
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
          <h1>관리자 주문 취합</h1>
          <label className="field">
            <span>관리자 비밀번호</span>
            <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} />
          </label>
          {message ? <p className="status-message">{message}</p> : null}
          <button className="primary-button" type="submit">입장</button>
          <a className="text-link" href="/">주문 화면으로</a>
        </form>
      </main>
    );
  }

  return (
    <main className="app-shell">
      <section className="order-header">
        <div>
          <p className="eyebrow">Admin dashboard</p>
          <h1>주문 취합 현황</h1>
          <p>오늘 주문을 확정하고, 실제 매장 주문과 수령 완료 시점을 운영자가 직접 표시하는 흐름으로 정리했습니다.</p>
        </div>
        <a className="admin-link" href="/">주문 화면</a>
      </section>

      <section className="admin-toolbar">
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

      <section className="dashboard-grid">
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
                  <select value={order.status} onChange={(event) => changeStatus(order.id, event.target.value as OrderStatus)}>
                    {statuses.filter((item) => item !== "ALL").map((item) => (
                      <option key={item} value={item}>{statusLabels[item]}</option>
                    ))}
                  </select>
                </header>
                <dl>
                  <div><dt>팀</dt><dd>{order.team || "-"}</dd></div>
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
      </section>
    </main>
  );
}
