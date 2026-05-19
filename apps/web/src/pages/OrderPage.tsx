import { ArrowLeft, ArrowRight, CheckCircle2, ChevronDown, History, MapPin, Search, ShieldCheck, ShoppingBag, Trash2, Users, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { createOrder, fetchMenus, fetchOrderBatch, fetchPopularMenus } from "../api";
import { BrandTabs } from "../components/BrandTabs";
import { CustomRequestInput } from "../components/CustomRequestInput";
import { MenuGrid } from "../components/MenuGrid";
import { OrderCart } from "../components/OrderCart";
import { SizeSelector } from "../components/SizeSelector";
import type { Brand, CartItem, Menu, Order, OrderBatch, PopularMenuRow } from "../types";

const brandHighlights: Record<Brand, { eyebrow: string; title: string; description: string }> = {
  STARBUCKS: {
    eyebrow: "Starbucks selection",
    title: "자주 찾는 커피와 티 메뉴를 위쪽에 먼저 배치했습니다.",
    description: "인기 메뉴를 빠르게 고르고, 나머지 전체 메뉴도 그대로 탐색할 수 있게 React 구조를 유지한 채 정리했습니다."
  },
  TWOSOME: {
    eyebrow: "Twosome selection",
    title: "투썸플레이스 메뉴도 같은 흐름으로 바로 주문할 수 있어요.",
    description: "추천 고정 메뉴가 없는 경우에는 전체 메뉴 탐색에 집중하도록 구성했습니다."
  }
};

const brandNames: Record<Brand, string> = {
  STARBUCKS: "스타벅스",
  TWOSOME: "투썸플레이스"
};

const statusSteps = ["주문 목록 선택", "메뉴 담기", "주문 제출", "관리자 취합"];

const featuredMenuNames = [
  "아이스카페아메리카노",
  "카페아메리카노",
  "아이스카페라테",
  "카페라테",
  "바닐라크림콜드브루",
  "콜드브루",
  "아이스유스베리티",
  "유스베리티",
  "딸기아사이레모네이드",
  "아이스유자민트티",
  "유자민트티",
  "아이스자몽허니블랙티",
  "자몽허니블랙티"
];

type OrderFormState = {
  ordererName: string;
  team: string;
  contact: string;
  memo: string;
};

type RecentOrderPreset = {
  savedAt: string;
  form: OrderFormState;
  items: CartItem[];
};

type RecentOrderReceipt = {
  savedAt: string;
  batchId: string;
  batchTitle: string;
  ordererName: string;
  team?: string;
  items: CartItem[];
};

const defaultForm = (department = "AX팀"): OrderFormState => ({
  ordererName: "",
  team: department,
  contact: "",
  memo: ""
});

function getRecentOrderKey() {
  return "samoo-ax-recent-order-preset-v1";
}

function getRecentReceiptKey(batchId: string) {
  return `samoo-ax-recent-order-receipt-v1:${batchId}`;
}

function normalizeMenuName(value: string) {
  return value.replace(/\s+/g, "").trim().toLowerCase();
}

export function OrderPage({ batchId }: { batchId: string }) {
  const [batch, setBatch] = useState<OrderBatch | null>(null);
  const [brand, setBrand] = useState<Brand>("STARBUCKS");
  const [menus, setMenus] = useState<Menu[]>([]);
  const [liveOrderRows, setLiveOrderRows] = useState<PopularMenuRow[]>([]);
  const [query, setQuery] = useState("");
  const [selectedMenu, setSelectedMenu] = useState<Menu | null>(null);
  const [selectedSize, setSelectedSize] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [customRequest, setCustomRequest] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [openCategories, setOpenCategories] = useState<string[]>([]);
  const [form, setForm] = useState<OrderFormState>(() => defaultForm());
  const [recentPreset, setRecentPreset] = useState<RecentOrderPreset | null>(null);
  const [recentReceipt, setRecentReceipt] = useState<RecentOrderReceipt | null>(null);
  const [statusMessage, setStatusMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchOrderBatch(batchId)
      .then((nextBatch) => {
        setBatch(nextBatch);
        setForm((current) => ({ ...current, team: current.team || nextBatch.department || "AX팀" }));
      })
      .catch((error) => setStatusMessage(error instanceof Error ? error.message : "주문 목록을 찾을 수 없습니다."));
  }, [batchId]);

  useEffect(() => {
    try {
      const savedPreset = window.localStorage.getItem(getRecentOrderKey());
      if (savedPreset) {
        setRecentPreset(JSON.parse(savedPreset) as RecentOrderPreset);
      }

      const savedReceipt = window.localStorage.getItem(getRecentReceiptKey(batchId));
      if (savedReceipt) {
        setRecentReceipt(JSON.parse(savedReceipt) as RecentOrderReceipt);
      } else {
        setRecentReceipt(null);
      }
    } catch {
      setRecentPreset(null);
      setRecentReceipt(null);
    }
  }, [batchId]);

  useEffect(() => {
    fetchMenus({ brand })
      .then(setMenus)
      .catch((error) => setStatusMessage(error.message));

    fetchPopularMenus({ batchId, limit: 8 })
      .then(setLiveOrderRows)
      .catch(() => setLiveOrderRows([]));
  }, [batchId, brand]);

  const categories = useMemo(() => [...new Set(menus.map((menu) => menu.category))], [menus]);
  const visibleMenus = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return menus.filter((menu) => {
      if (normalized && !menu.name.toLowerCase().includes(normalized)) return false;
      return true;
    });
  }, [menus, query]);

  const featuredMenus = useMemo(() => {
    const menuMap = new Map(menus.map((menu) => [normalizeMenuName(menu.name), menu]));
    return featuredMenuNames
      .map((name) => menuMap.get(normalizeMenuName(name)))
      .filter((menu): menu is Menu => Boolean(menu));
  }, [menus]);

  const popularMenus = useMemo(() => {
    if (!liveOrderRows.length) return [];

    return liveOrderRows
      .map((row) => {
        const menu = menus.find((item) => item.id === row.menuId)
          ?? menus.find((item) => normalizeMenuName(item.name) === normalizeMenuName(row.menuName) && item.category === row.category);
        if (!menu) return null;
        return { ...menu, orderedQuantity: row.quantity, ordererNames: row.ordererNames };
      })
      .filter((menu): menu is Menu & { orderedQuantity: number; ordererNames: string[] } => Boolean(menu));
  }, [liveOrderRows, menus]);
  const shouldShowPopularMenus = brand === "STARBUCKS" && popularMenus.length > 0;

  const totalCartCount = useMemo(() => cart.reduce((sum, item) => sum + item.quantity, 0), [cart]);
  const totalOrderedQuantity = useMemo(() => liveOrderRows.reduce((sum, item) => sum + item.quantity, 0), [liveOrderRows]);
  const visibleMenusByCategory = useMemo(
    () => categories
      .map((categoryName) => ({
        categoryName,
        menus: visibleMenus.filter((menu) => menu.category === categoryName)
      }))
      .filter((group) => group.menus.length),
    [categories, visibleMenus]
  );
  const heroCopy = brandHighlights[brand];

  useEffect(() => {
    if (!visibleMenusByCategory.length) {
      setOpenCategories([]);
      return;
    }

    setOpenCategories((current) => {
      if (query.trim()) {
        return visibleMenusByCategory.map((group) => group.categoryName);
      }

      return current.length ? current : [visibleMenusByCategory[0].categoryName];
    });
  }, [query, visibleMenusByCategory]);

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

  function toggleCategory(categoryName: string) {
    setOpenCategories((current) =>
      current.includes(categoryName)
        ? current.filter((item) => item !== categoryName)
        : [...current, categoryName]
    );
  }

  function applyRecentOrder() {
    if (!recentPreset) return;
    setForm(recentPreset.form);
    setCart(
      recentPreset.items.map((item) => ({
        ...item,
        localId: crypto.randomUUID()
      }))
    );
    setStatusMessage("이 기기에 저장된 최근 주문을 불러왔습니다.");
  }

  function saveRecentOrder(order: Order) {
    const preset: RecentOrderPreset = {
      savedAt: new Date().toISOString(),
      form: {
        ordererName: order.ordererName,
        team: order.team || batch?.department || "AX팀",
        contact: order.contact || "",
        memo: order.memo || ""
      },
      items: order.items.map((item) => ({
        localId: crypto.randomUUID(),
        brand: item.brand,
        menuId: item.menuId,
        menuName: item.menuName,
        category: item.category,
        size: item.size,
        quantity: item.quantity,
        customRequest: item.customRequest
      }))
    };

    const receipt: RecentOrderReceipt = {
      savedAt: new Date().toISOString(),
      batchId,
      batchTitle: batch?.title || "주문 목록",
      ordererName: order.ordererName,
      team: order.team,
      items: preset.items
    };

    window.localStorage.setItem(getRecentOrderKey(), JSON.stringify(preset));
    window.localStorage.setItem(getRecentReceiptKey(batchId), JSON.stringify(receipt));
    setRecentPreset(preset);
    setRecentReceipt(receipt);
  }

  async function submitOrder(event: FormEvent) {
    event.preventDefault();
    setStatusMessage("");

    if (!form.ordererName.trim()) {
      setStatusMessage("주문자 이름을 입력해 주세요.");
      return;
    }

    if (!form.team.trim()) {
      setStatusMessage("부서명을 입력해 주세요.");
      return;
    }

    if (!cart.length) {
      setStatusMessage("장바구니에 음료를 먼저 담아 주세요.");
      return;
    }

    setIsSubmitting(true);
    try {
      const order = await createOrder({ batchId, ...form, items: cart });
      saveRecentOrder(order);
      setCart([]);
      setForm(defaultForm(batch?.department || "AX팀"));
      setStatusMessage("주문이 정상적으로 접수됐습니다. 아래 최근 저장 주문에서 바로 확인할 수 있어요.");
      fetchPopularMenus({ batchId, limit: 8 })
        .then(setLiveOrderRows)
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
          <p className="eyebrow">SAMOO AX 음료 주문</p>
          <h1>{batch?.title || "주문 목록을 불러오는 중입니다."}</h1>
          <p className="hero-description">{heroCopy.title} {heroCopy.description}</p>
          <div className="hero-actions">
            <a className="text-link" href="/">
              <ArrowLeft size={18} />
              주문 목록으로
            </a>
            <button
              className="hero-cta"
              type="button"
              onClick={() => document.getElementById("menu-section")?.scrollIntoView({ behavior: "smooth", block: "start" })}
            >
              메뉴 고르기
              <ArrowRight size={18} />
            </button>
          </div>
        </div>

        <div className="hero-meta-card">
          <div className="hero-meta-header">
            <span className="brand-chip">{brandNames[brand]}</span>
            <span className="meta-hint">{heroCopy.eyebrow}</span>
          </div>
          <div className="batch-inline-meta">
            <span className="department-badge">{batch?.department || "AX팀"}</span>
            <span className="batch-meta-text">
              <MapPin size={14} />
              {batch?.memo || "선택한 주문 목록에 맞춰 주문을 진행해 주세요."}
            </span>
          </div>
          <div className="hero-preview-panel">
            <div className="panel-title-row compact-preview-title">
              <div>
                <p className="section-kicker">Live order preview</p>
                <h2>주문 들어온 메뉴</h2>
              </div>
              <span className="pill-count">{totalOrderedQuantity}잔</span>
            </div>
            {shouldShowPopularMenus ? (
              <div className="hero-order-preview-list">
                {popularMenus.map((menu) => (
                  <button className="hero-order-preview-item" key={menu.id} type="button" onClick={() => openMenu(menu)}>
                    <img src={menu.imageUrl} alt="" loading="lazy" />
                    <div>
                      <strong>{menu.name}</strong>
                      <span>{menu.orderedQuantity}잔 주문</span>
                      <small>{menu.ordererNames.join(", ")}</small>
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="empty-state compact-empty-state">
                아직 저장된 주문이 없어요. 첫 주문이 들어오면 이 자리에 메뉴 썸네일과 수량이 바로 표시됩니다.
              </div>
            )}
          </div>
          <div className="hero-stats-grid single-stat-grid">
            <div className="stat-card">
              <Users size={18} />
              <strong>{totalOrderedQuantity}</strong>
              <span>총 주문 수량</span>
            </div>
          </div>
          <div className="hero-progress">
            {statusSteps.map((step, index) => (
              <div className="progress-step" key={step}>
                <span className={index < 3 ? "progress-dot active" : "progress-dot"} />
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
              <h2>브랜드별 전체 메뉴를 비교하고 바로 담기</h2>
            </div>
            <span className="section-count">{visibleMenus.length} items</span>
          </div>

          <div className="toolbar premium-toolbar">
            <BrandTabs
              value={brand}
              onChange={(nextBrand) => {
                setBrand(nextBrand);
              }}
            />
            <div className="search-shell">
              <Search size={16} />
              <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="음료명으로 검색" />
            </div>
          </div>

          {featuredMenus.length ? (
            <section className="featured-strip">
              <div className="section-heading-row compact">
                <div>
                  <p className="section-kicker">Priority picks</p>
                  <h3>인기 메뉴</h3>
                  <p className="featured-strip-hint">요청하신 우선순서대로 최상단에 배치했습니다.</p>
                </div>
              </div>
              <div className="featured-grid featured-grid-scroll">
                {featuredMenus.map((menu) => (
                  <button className="featured-card priority-card" key={menu.id} type="button" onClick={() => openMenu(menu)}>
                    <img src={menu.imageUrl} alt="" loading="lazy" />
                    <div>
                      <strong>{menu.name}</strong>
                      <span>{menu.category}</span>
                    </div>
                  </button>
                ))}
              </div>
            </section>
          ) : null}

          {shouldShowPopularMenus ? (
            <section className="featured-strip">
              <div className="section-heading-row compact">
                <div>
                  <p className="section-kicker">Live trend</p>
                  <h3>이번 주문 인기 메뉴</h3>
                  <p className="featured-strip-hint">현재 선택한 주문 목록에서 많이 담긴 메뉴입니다.</p>
                </div>
              </div>
              <div className="featured-grid">
                {popularMenus.map((menu) => (
                  <button className="featured-card" key={menu.id} type="button" onClick={() => openMenu(menu)}>
                    <img src={menu.imageUrl} alt="" loading="lazy" />
                    <div>
                      <strong>{menu.name}</strong>
                      <span>{menu.category} · {menu.orderedQuantity}잔</span>
                      <small>{menu.ordererNames.join(", ")}</small>
                    </div>
                  </button>
                ))}
              </div>
            </section>
          ) : null}

          <section className="featured-strip">
            <div className="section-heading-row compact">
              <div>
                <p className="section-kicker">Menu dropdowns</p>
                <h3>카테고리별 메뉴</h3>
                <p className="featured-strip-hint">메뉴 수가 많아서 카테고리별로 펼쳐 보고 담을 수 있게 바꿨습니다.</p>
              </div>
            </div>

            {visibleMenusByCategory.length ? visibleMenusByCategory.map((group) => {
              const isOpen = openCategories.includes(group.categoryName);
              return (
                <section className="category-dropdown" key={group.categoryName}>
                  <button className={isOpen ? "category-dropdown-trigger active" : "category-dropdown-trigger"} type="button" onClick={() => toggleCategory(group.categoryName)}>
                    <div>
                      <strong>{group.categoryName}</strong>
                      <span>{group.menus.length}개 메뉴</span>
                    </div>
                    <ChevronDown size={18} />
                  </button>
                  {isOpen ? <MenuGrid menus={group.menus} onSelect={openMenu} /> : null}
                </section>
              );
            }) : (
              <div className="empty-state">검색 결과에 맞는 메뉴가 아직 없어요.</div>
            )}
          </section>
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
                <span>부서명 *</span>
                <input value={form.team} onChange={(event) => setForm({ ...form, team: event.target.value })} placeholder="부서명을 입력해 주세요" />
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
            {recentPreset ? (
              <button className="secondary-button" type="button" onClick={applyRecentOrder}>
                <History size={16} />
                최근 주문 불러오기
              </button>
            ) : null}
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

          {recentReceipt ? (
            <div className="panel-section panel-glass">
              <div className="panel-title-row">
                <div>
                  <p className="section-kicker">Saved check</p>
                  <h2>최근 저장된 주문</h2>
                </div>
                <CheckCircle2 size={18} />
              </div>
              <div className="recent-order-summary">
                <strong>{recentReceipt.ordererName}</strong>
                <span>
                  {recentReceipt.team || batch?.department || "AX팀"} · {new Date(recentReceipt.savedAt).toLocaleString("ko-KR")}
                </span>
              </div>
              <div className="recent-order-list">
                {recentReceipt.items.map((item) => (
                  <div className="recent-order-item" key={`${item.menuId}-${item.size}-${item.menuName}`}>
                    <strong>{item.menuName}</strong>
                    <span>{item.size} · {item.quantity}잔</span>
                  </div>
                ))}
              </div>
              <p className="featured-strip-hint">이 기기에서 마지막으로 저장에 성공한 주문입니다. 같은 구성을 다음 주문에 바로 다시 불러올 수 있어요.</p>
            </div>
          ) : null}

          {statusMessage ? <p className="status-message premium-status">{statusMessage}</p> : null}
          <button className="primary-button premium-submit" type="submit" disabled={isSubmitting || !batch || batch.status !== "open"}>
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
