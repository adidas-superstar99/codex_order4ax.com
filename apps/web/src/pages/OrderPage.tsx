import { ArrowRight, Clock3, Search, ShieldCheck, ShoppingBag, Sparkles, Users, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { createOrder, fetchMenus, fetchPopularMenus } from "../api";
import { BrandTabs } from "../components/BrandTabs";
import { CustomRequestInput } from "../components/CustomRequestInput";
import { MenuGrid } from "../components/MenuGrid";
import { OrderCart } from "../components/OrderCart";
import { SizeSelector } from "../components/SizeSelector";
import type { Brand, CartItem, Menu, PopularMenuRow } from "../types";

const brandHighlights: Record<Brand, { eyebrow: string; title: string; description: string }> = {
  STARBUCKS: {
    eyebrow: "Starbucks selection",
    title: "오늘은 깊은 콜드브루 무드로 가볍게 시작해보세요.",
    description: "신메뉴와 시즌 음료를 빠르게 훑고, 자주 마시는 조합을 한 번에 담을 수 있게 다듬었습니다."
  },
  TWOSOME: {
    eyebrow: "Twosome selection",
    title: "부드러운 디저트 페어링이 어울리는 메뉴를 골라보세요.",
    description: "티, 라떼, 빙수까지 카테고리 흐름이 더 분명하게 보이도록 화면을 정리했습니다."
  }
};

const brandNames: Record<Brand, string> = {
  STARBUCKS: "스타벅스",
  TWOSOME: "투썸플레이스"
};

const statusSteps = ["주문 작성", "주문 확정", "매장 주문 완료", "수령 완료"];

export function OrderPage() {
  const [brand, setBrand] = useState<Brand>("STARBUCKS");
  const [menus, setMenus] = useState<Menu[]>([]);
  const [popularRows, setPopularRows] = useState<PopularMenuRow[]>([]);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("ALL");
  const [selectedMenu, setSelectedMenu] = useState<Menu | null>(null);
  const [selectedSize, setSelectedSize] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [customRequest, setCustomRequest] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [form, setForm] = useState({ ordererName: "", team: "", contact: "", memo: "" });
  const [statusMessage, setStatusMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchMenus({ brand })
      .then(setMenus)
      .catch((error) => setStatusMessage(error.message));

    fetchPopularMenus({ brand, limit: 3 })
      .then(setPopularRows)
      .catch(() => setPopularRows([]));
  }, [brand]);

  const categories = useMemo(() => ["ALL", ...new Set(menus.map((menu) => menu.category))], [menus]);
  const visibleMenus = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return menus.filter((menu) => {
      if (category !== "ALL" && menu.category !== category) return false;
      if (normalized && !menu.name.toLowerCase().includes(normalized)) return false;
      return true;
    });
  }, [category, menus, query]);

  const fallbackMenus = useMemo(() => menus.filter((menu) => menu.isNew || menu.isSeasonal).slice(0, 3), [menus]);
  const popularMenus = useMemo(() => {
    if (!popularRows.length) return [];

    return popularRows
      .map((row) => {
        const menu = menus.find((item) => item.id === row.menuId)
          ?? menus.find((item) => item.name === row.menuName && item.category === row.category);
        if (!menu) return null;
        return { ...menu, orderedQuantity: row.quantity };
      })
      .filter((menu): menu is Menu & { orderedQuantity: number } => Boolean(menu));
  }, [menus, popularRows]);

  const spotlightMenus = popularMenus.length ? popularMenus : fallbackMenus;
  const spotlightTitle = popularMenus.length ? "이번 주문 인기 메뉴" : "신메뉴 · 시즌 메뉴";
  const spotlightHint = popularMenus.length ? "오늘 주문에서 많이 담긴 메뉴" : "아직 주문 데이터가 적어 신메뉴를 먼저 보여드려요.";
  const totalCartCount = useMemo(() => cart.reduce((sum, item) => sum + item.quantity, 0), [cart]);
  const topCategories = useMemo(() => categories.filter((item) => item !== "ALL").slice(0, 4), [categories]);
  const heroCopy = brandHighlights[brand];

  function openMenu(menu: Menu) {
    setSelectedMenu(menu);
    setSelectedSize(menu.availableSizes[0] ?? "");
    setQuantity(1);
    setCustomRequest("");
  }

  function addToCart() {
    if (!selectedMenu || !selectedSize) return;
    setCart((current) => [
      ...current,
      {
        localId: crypto.randomUUID(),
        brand: selectedMenu.brand,
        menuId: selectedMenu.id,
        menuName: selectedMenu.name,
        category: selectedMenu.category,
        size: selectedSize,
        quantity,
        customRequest: customRequest.trim() || undefined
      }
    ]);
    setSelectedMenu(null);
  }

  async function submitOrder(event: FormEvent) {
    event.preventDefault();
    setStatusMessage("");

    if (!form.ordererName.trim()) {
      setStatusMessage("주문자 이름을 입력해 주세요.");
      return;
    }

    if (!cart.length) {
      setStatusMessage("장바구니에 음료를 먼저 담아 주세요.");
      return;
    }

    setIsSubmitting(true);
    try {
      await createOrder({ ...form, items: cart });
      setCart([]);
      setForm({ ordererName: "", team: "", contact: "", memo: "" });
      setStatusMessage("주문이 정상적으로 접수됐습니다.");
      fetchPopularMenus({ brand, limit: 3 })
        .then(setPopularRows)
        .catch(() => undefined);
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "주문 처리 중 문제가 발생했습니다.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="app-shell premium-shell">
      <section className="hero-panel">
        <div className="hero-copy">
          <p className="eyebrow">{heroCopy.eyebrow}</p>
          <h1>AX 전용 음료 주문을 더 빠르고 세련되게.</h1>
          <p className="hero-description">{heroCopy.title} {heroCopy.description}</p>
          <div className="hero-actions">
            <button className="hero-cta" type="button" onClick={() => document.getElementById("menu-section")?.scrollIntoView({ behavior: "smooth", block: "start" })}>
              메뉴 고르기
              <ArrowRight size={18} />
            </button>
            <a className="admin-link subtle-link" href="/admin">관리자 보기</a>
          </div>
        </div>

        <div className="hero-meta-card">
          <div className="hero-meta-header">
            <span className="brand-chip">{brandNames[brand]}</span>
            <span className="meta-hint">실시간 선택 상태</span>
          </div>
          <div className="hero-stats-grid">
            <div className="stat-card glow-card">
              <Sparkles size={18} />
              <strong>{spotlightMenus.length}</strong>
              <span>{popularMenus.length ? "이번 주문 인기" : "신메뉴 · 시즌 메뉴"}</span>
            </div>
            <div className="stat-card">
              <Search size={18} />
              <strong>{visibleMenus.length}</strong>
              <span>현재 탐색 가능</span>
            </div>
            <div className="stat-card">
              <Users size={18} />
              <strong>{totalCartCount}</strong>
              <span>담긴 수량</span>
            </div>
            <div className="stat-card">
              <Clock3 size={18} />
              <strong>{topCategories.length || categories.length - 1}</strong>
              <span>주요 카테고리</span>
            </div>
          </div>
          <div className="hero-progress">
            {statusSteps.map((step, index) => (
              <div className="progress-step" key={step}>
                <span className={index < 2 ? "progress-dot active" : "progress-dot"} />
                <small>{step}</small>
              </div>
            ))}
          </div>
        </div>
      </section>

      <form className="layout" onSubmit={submitOrder}>
        <section className="main-panel main-panel-premium" id="menu-section">
          <div className="section-heading-row">
            <div>
              <p className="section-kicker">Menu directory</p>
              <h2>브랜드별 메뉴를 한 번에 비교하고 담기</h2>
            </div>
            <span className="section-count">{visibleMenus.length} items</span>
          </div>

          <div className="toolbar premium-toolbar">
            <BrandTabs
              value={brand}
              onChange={(nextBrand) => {
                setBrand(nextBrand);
                setCategory("ALL");
              }}
            />
            <div className="search-shell">
              <Search size={16} />
              <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="음료명으로 검색" />
            </div>
          </div>

          <div className="category-pills" aria-label="카테고리 필터">
            {categories.map((item) => (
              <button
                key={item}
                type="button"
                className={category === item ? "active" : ""}
                onClick={() => setCategory(item)}
              >
                {item === "ALL" ? "전체" : item}
              </button>
            ))}
          </div>

          {spotlightMenus.length ? (
            <section className="featured-strip">
              <div className="section-heading-row compact">
                <div>
                  <p className="section-kicker">Quick picks</p>
                  <h3>{spotlightTitle}</h3>
                  <p className="featured-strip-hint">{spotlightHint}</p>
                </div>
              </div>
              <div className="featured-grid">
                {spotlightMenus.map((menu) => (
                  <button className="featured-card" key={menu.id} type="button" onClick={() => openMenu(menu)}>
                    <img src={menu.imageUrl} alt="" loading="lazy" />
                    <div>
                      <strong>{menu.name}</strong>
                      <span>
                        {menu.category}
                        {"orderedQuantity" in menu ? ` · ${menu.orderedQuantity}잔` : ""}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </section>
          ) : null}

          <MenuGrid menus={visibleMenus} onSelect={openMenu} />
        </section>

        <aside className="side-panel side-panel-premium">
          <div className="panel-section panel-glass">
            <div className="panel-title-row">
              <div>
                <p className="section-kicker">Checkout</p>
                <h2>주문자 정보</h2>
              </div>
              <ShieldCheck size={18} />
            </div>
            <div className="field-grid">
              <label className="field">
                <span>이름 *</span>
                <input value={form.ordererName} onChange={(event) => setForm({ ...form, ordererName: event.target.value })} placeholder="이름을 입력해 주세요" />
              </label>
              <label className="field">
                <span>팀</span>
                <input value={form.team} onChange={(event) => setForm({ ...form, team: event.target.value })} placeholder="소속 팀" />
              </label>
            </div>
            <label className="field">
              <span>연락처 또는 메신저 ID</span>
              <input value={form.contact} onChange={(event) => setForm({ ...form, contact: event.target.value })} placeholder="수령 안내용" />
            </label>
            <label className="field">
              <span>전달 메모</span>
              <input value={form.memo} onChange={(event) => setForm({ ...form, memo: event.target.value })} placeholder="공동 주문 메모가 있으면 남겨 주세요" />
            </label>
          </div>

          <div className="panel-section panel-glass cart-panel">
            <div className="panel-title-row">
              <div>
                <p className="section-kicker">Cart</p>
                <h2>장바구니</h2>
              </div>
              <span className="pill-count">{totalCartCount}</span>
            </div>
            <OrderCart
              items={cart}
              onRemove={(localId) => setCart((current) => current.filter((item) => item.localId !== localId))}
              onQuantityChange={(localId, nextQuantity) =>
                setCart((current) =>
                  nextQuantity < 1
                    ? current.filter((item) => item.localId !== localId)
                    : current.map((item) => (item.localId === localId ? { ...item, quantity: nextQuantity } : item))
                )
              }
            />
          </div>

          <div className="panel-section panel-glass status-panel">
            <div className="panel-title-row">
              <div>
                <p className="section-kicker">Flow</p>
                <h2>주문 진행 흐름</h2>
              </div>
            </div>
            <div className="status-step-list">
              {statusSteps.map((step, index) => (
                <div className="status-step-item" key={step}>
                  <span className={index === 0 ? "status-step-bullet active" : "status-step-bullet"} />
                  <div>
                    <strong>{step}</strong>
                    <p>
                      {index === 0
                        ? "메뉴와 옵션을 담고 제출하면 접수됩니다."
                        : index === 1
                          ? "관리자가 취합을 마치면 주문 확정으로 표시됩니다."
                          : index === 2
                            ? "실제 스벅·투썸 주문이 끝나면 관리자 화면에서 표시됩니다."
                            : "음료를 받은 뒤 수령 완료로 정리됩니다."}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {statusMessage ? <p className="status-message premium-status">{statusMessage}</p> : null}
          <button className="primary-button premium-submit" type="submit" disabled={isSubmitting}>
            <ShoppingBag size={18} />
            {isSubmitting ? "주문 제출 중" : `주문 제출${totalCartCount ? ` · ${totalCartCount}잔` : ""}`}
          </button>
        </aside>
      </form>

      <div className="floating-submit-bar">
        <div>
          <strong>{totalCartCount}잔 담김</strong>
          <span>{cart.length ? "장바구니를 확인하고 바로 제출할 수 있어요." : "메뉴를 담으면 여기서 바로 제출할 수 있어요."}</span>
        </div>
        <button className="primary-button floating-submit-button" type="button" disabled={isSubmitting} onClick={() => document.querySelector(".side-panel")?.scrollIntoView({ behavior: "smooth", block: "start" })}>
          주문 확인
        </button>
      </div>

      {selectedMenu ? (
        <div className="modal-backdrop" role="presentation">
          <div className="modal premium-modal" role="dialog" aria-modal="true" aria-labelledby="menu-modal-title">
            <button className="close-button" type="button" aria-label="닫기" onClick={() => setSelectedMenu(null)}>
              <X size={20} />
            </button>
            <img src={selectedMenu.imageUrl} alt="" />
            <div className="modal-copy">
              <span className="brand-chip">{brandNames[selectedMenu.brand]}</span>
              <h2 id="menu-modal-title">{selectedMenu.name}</h2>
              <p>{selectedMenu.category}</p>
            </div>
            <SizeSelector sizes={selectedMenu.availableSizes} value={selectedSize} onChange={setSelectedSize} />
            <label className="field">
              <span>수량</span>
              <input min={1} type="number" value={quantity} onChange={(event) => setQuantity(Number(event.target.value) || 1)} />
            </label>
            <CustomRequestInput value={customRequest} onChange={setCustomRequest} />
            <button className="primary-button premium-submit" type="button" onClick={addToCart}>
              <ShoppingBag size={18} />
              장바구니에 담기
            </button>
          </div>
        </div>
      ) : null}
    </main>
  );
}
