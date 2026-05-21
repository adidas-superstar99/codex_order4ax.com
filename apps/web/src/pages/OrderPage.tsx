import { ArrowLeft, ArrowRight, CheckCircle2, ChevronDown, History, Search, ShieldCheck, ShoppingBag, Trash2, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { cancelOwnOrder, createOrder, fetchMenus, fetchMyOrders, fetchOrderBatch, fetchPopularMenus } from "../api";
import { BrandTabs } from "../components/BrandTabs";
import { CustomRequestInput } from "../components/CustomRequestInput";
import { MenuGrid } from "../components/MenuGrid";
import { OrderCart } from "../components/OrderCart";
import { SizeSelector } from "../components/SizeSelector";
import type { Brand, CartItem, Menu, Order, OrderBatch, PopularMenuRow } from "../types";

const brandNames: Record<Brand, string> = {
  STARBUCKS: "스타벅스",
  TWOSOME: "투썸플레이스",
  EMART: "이마트"
};

const statusSteps = ["메뉴 선택 중", "주문 완료"];

const featuredMenuNames = [
  "아이스 아메리카노",
  "카페 아메리카노",
  "아이스 카페 라떼",
  "카페 라떼",
  "바닐라 크림 콜드 브루",
  "콜드 브루",
  "자몽 허니 블랙 티",
  "유자 민트 티"
];

type OrderFormState = {
  ordererName: string;
  team: string;
  contact: string;
  memo: string;
};

const preferredFeaturedMenuNames = [
  "아이스 카페 아메리카노",
  "카페 아메리카노",
  "아이스 카페 라테",
  "카페 라테",
  "마닐라 크림 콜드 브루",
  "바닐라 크림 콜드 브루",
  "콜드 브루",
  "아이스 자몽 허니 블랙 티",
  "자몽 허니 블랙 티",
  "아이스 유자 민트 티",
  "유자 민트 티",
  "아이스 유스베리 티",
  "유스베리 티"
];

type RecentOrderPreset = {
  savedAt: string;
  form: OrderFormState;
  items: CartItem[];
};

type RecentOrderReceipt = {
  orderId?: string;
  savedAt: string;
  batchId: string;
  batchTitle: string;
  ordererName: string;
  team?: string;
  items: CartItem[];
};

type CheckoutErrors = {
  ordererName?: string;
  team?: string;
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

function getMenuCategoryLabel(menu: Menu) {
  return menu.subcategory ? `${menu.category} / ${menu.subcategory}` : menu.category;
}

function getQuantityUnit(brand: Brand) {
  return brand === "EMART" ? "개" : "잔";
}

function isSingleOptionMenu(menu: Menu | null) {
  return Boolean(menu && menu.availableSizes.length <= 1);
}

function cloneCartItems(items: CartItem[]) {
  return items.map((item) => ({
    ...item,
    localId: crypto.randomUUID()
  }));
}

function getRepresentativeBrand(items?: Array<{ brand: Brand }>) {
  return items?.[0]?.brand;
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
  const [selectedSubcategories, setSelectedSubcategories] = useState<Record<string, string>>({});
  const [form, setForm] = useState<OrderFormState>(() => defaultForm());
  const [recentPreset, setRecentPreset] = useState<RecentOrderPreset | null>(null);
  const [recentReceipt, setRecentReceipt] = useState<RecentOrderReceipt | null>(null);
  const [myOrders, setMyOrders] = useState<Order[]>([]);
  const [hasLoadedMyOrders, setHasLoadedMyOrders] = useState(false);
  const [selectedRecentItemIds, setSelectedRecentItemIds] = useState<string[]>([]);
  const [statusMessage, setStatusMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [checkoutErrors, setCheckoutErrors] = useState<CheckoutErrors>({});

  useEffect(() => {
    fetchOrderBatch(batchId)
      .then((nextBatch) => {
        setBatch(nextBatch);
        setForm((current) => ({ ...current, team: current.team || nextBatch.department || "AX팀" }));
      })
      .catch((error) => setStatusMessage(error instanceof Error ? error.message : "주문 묶음을 찾을 수 없습니다."));
  }, [batchId]);

  useEffect(() => {
    try {
      const savedPreset = window.localStorage.getItem(getRecentOrderKey());
      if (savedPreset) {
        const parsedPreset = JSON.parse(savedPreset) as RecentOrderPreset;
        setRecentPreset(parsedPreset);
        setSelectedRecentItemIds(parsedPreset.items.map((item) => item.localId));
        setForm((current) => ({
          ...current,
          ordererName: current.ordererName || parsedPreset.form.ordererName,
          team: current.team || parsedPreset.form.team,
          contact: current.contact || parsedPreset.form.contact,
          memo: current.memo || parsedPreset.form.memo
        }));
      } else {
        setRecentPreset(null);
        setSelectedRecentItemIds([]);
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
      setSelectedRecentItemIds([]);
    }
  }, [batchId]);

  useEffect(() => {
    fetchMenus({ brand })
      .then((nextMenus: Menu[]) => {
        setMenus(nextMenus);
        setSelectedSubcategories({});
      })
      .catch((error) => setStatusMessage(error.message));

    fetchPopularMenus({ batchId, brand, limit: 8 })
      .then(setLiveOrderRows)
      .catch(() => setLiveOrderRows([]));
  }, [batchId, brand]);

  const categories = useMemo(() => [...new Set(menus.map((menu) => menu.category))], [menus]);

  const filteredMenus = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return menus.filter((menu) => {
      if (normalized && !menu.name.toLowerCase().includes(normalized)) return false;
      return true;
    });
  }, [menus, query]);

  const featuredMenus = useMemo(() => {
    const menuMap = new Map(menus.map((menu) => [normalizeMenuName(menu.name), menu]));
    return preferredFeaturedMenuNames
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

  const visibleMenusByCategory = useMemo(() => {
    const groupedMenus = categories
      .map((categoryName) => ({
        categoryName,
        subcategories: [
          ...new Set(
            filteredMenus
              .filter((menu) => menu.category === categoryName)
              .map((menu) => menu.subcategory)
              .filter((subcategory): subcategory is string => Boolean(subcategory))
          )
        ],
        menus: filteredMenus.filter((menu) => menu.category === categoryName)
      }))
      .filter((group) => group.menus.length);

    const newMenus = filteredMenus.filter((menu) => menu.isNew);
    return newMenus.length && brand !== "EMART"
      ? [{ categoryName: "신메뉴", subcategories: [], menus: newMenus }, ...groupedMenus]
      : groupedMenus;
  }, [brand, categories, filteredMenus]);

  const previewBrand = useMemo(
    () =>
      getRepresentativeBrand(cart)
      ?? getRepresentativeBrand(selectedMenu ? [selectedMenu] : undefined)
      ?? getRepresentativeBrand(myOrders[0]?.items)
      ?? getRepresentativeBrand(recentReceipt?.items)
      ?? brand,
    [brand, cart, myOrders, recentReceipt, selectedMenu]
  );
  const shouldShowPopularMenus = popularMenus.length > 0;
  const totalCartCount = useMemo(() => cart.reduce((sum, item) => sum + item.quantity, 0), [cart]);
  const selectedRecentItems = useMemo(
    () => recentPreset?.items.filter((item) => selectedRecentItemIds.includes(item.localId)) ?? [],
    [recentPreset, selectedRecentItemIds]
  );
  const activeOrdererName = useMemo(
    () => recentReceipt?.ordererName || form.ordererName.trim() || recentPreset?.form.ordererName?.trim() || "",
    [form.ordererName, recentPreset, recentReceipt]
  );
  const editableRecentOrder = useMemo(
    () => myOrders.find((order) => order.id === recentReceipt?.orderId) ?? myOrders[0],
    [myOrders, recentReceipt]
  );
  const completedStepCount = batch?.status === "closed" ? 2 : 1;

  useEffect(() => {
    if (!batchId || !activeOrdererName) {
      setMyOrders([]);
      setHasLoadedMyOrders(false);
      return;
    }

    setHasLoadedMyOrders(false);
    fetchMyOrders({ batchId, ordererName: activeOrdererName })
      .then((orders) => {
        setMyOrders(orders);
        setHasLoadedMyOrders(true);
      })
      .catch(() => {
        setMyOrders([]);
        setHasLoadedMyOrders(true);
      });
  }, [activeOrdererName, batchId]);

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
        category: getMenuCategoryLabel(selectedMenu),
        size: selectedSize,
        quantity,
        customRequest: customRequest.trim() || undefined
      }
    ]);
    setSelectedMenu(null);
  }

  function openCheckoutModal() {
    if (!cart.length) {
      if (recentPreset && selectedRecentItems.length) {
        setForm(recentPreset.form);
        setCart(cloneCartItems(selectedRecentItems));
        setCheckoutErrors({});
        setStatusMessage("선택한 최근 주문 메뉴를 장바구니에 담았습니다.");
        setIsCheckoutOpen(true);
        return;
      }

      setStatusMessage("메뉴를 먼저 담아주세요.");
      setIsCheckoutOpen(true);
      return;
    }

    setCheckoutErrors({});
    setStatusMessage("");
    setIsCheckoutOpen(true);
  }

  function toggleCategory(categoryName: string) {
    setOpenCategories((current) =>
      current.includes(categoryName)
        ? current.filter((item) => item !== categoryName)
        : [...current, categoryName]
    );
  }

  function syncRecentPreset(nextPreset: RecentOrderPreset | null) {
    if (!nextPreset) {
      window.localStorage.removeItem(getRecentOrderKey());
      setRecentPreset(null);
      setSelectedRecentItemIds([]);
      return;
    }

    window.localStorage.setItem(getRecentOrderKey(), JSON.stringify(nextPreset));
    setRecentPreset(nextPreset);
    setSelectedRecentItemIds(nextPreset.items.map((item) => item.localId));
  }

  function toggleRecentItem(localId: string) {
    setSelectedRecentItemIds((current) =>
      current.includes(localId) ? current.filter((item) => item !== localId) : [...current, localId]
    );
  }

  function removeRecentItem(localId: string) {
    if (!recentPreset) return;

    const nextItems = recentPreset.items.filter((item) => item.localId !== localId);
    if (!nextItems.length) {
      syncRecentPreset(null);
      setStatusMessage("최근 주문 항목을 모두 비웠습니다.");
      return;
    }

    syncRecentPreset({
      ...recentPreset,
      items: nextItems
    });
    setStatusMessage("최근 주문 항목에서 메뉴를 제거했습니다.");
  }

  async function removeSubmittedOrder(targetOrder: Order, mode: "delete" | "edit") {
    if (!targetOrder.id) {
      setStatusMessage("삭제할 주문 정보를 찾지 못했습니다.");
      return;
    }

    const confirmMessage =
      mode === "edit"
        ? "최근 제출한 주문을 삭제하고 장바구니로 다시 불러올까요?"
        : "최근 제출한 주문을 삭제할까요?";

    if (!window.confirm(confirmMessage)) {
      return;
    }

    try {
      await cancelOwnOrder({
        orderId: targetOrder.id,
        batchId,
        ordererName: targetOrder.ordererName
      });

      if (mode === "edit") {
        setCart(
          cloneCartItems(
            targetOrder.items.map((item) => ({
              localId: crypto.randomUUID(),
              brand: item.brand,
              menuId: item.menuId,
              menuName: item.menuName,
              category: item.category,
              size: item.size,
              quantity: item.quantity,
              customRequest: item.customRequest
            }))
          )
        );
        setForm((current) => ({
          ...current,
          ordererName: targetOrder.ordererName,
          team: targetOrder.team || current.team || batch?.department || "AX팀",
          contact: targetOrder.contact || current.contact,
          memo: targetOrder.memo || current.memo
        }));
        setStatusMessage("기존 주문을 삭제하고 장바구니로 다시 불러왔습니다. 수정 후 다시 주문해 주세요.");
      } else {
        setStatusMessage("선택한 주문을 삭제했습니다.");
      }

      if (recentReceipt?.orderId === targetOrder.id) {
        window.localStorage.removeItem(getRecentReceiptKey(batchId));
        setRecentReceipt(null);
      }
      fetchMyOrders({ batchId, ordererName: targetOrder.ordererName })
        .then(setMyOrders)
        .catch(() => setMyOrders([]));
      fetchPopularMenus({ batchId, brand, limit: 8 })
        .then(setLiveOrderRows)
        .catch(() => undefined);
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "주문 삭제에 실패했습니다.");
    }
  }

  async function removeRecentReceiptFallback(mode: "delete" | "edit") {
    if (!recentReceipt?.orderId) {
      setStatusMessage("삭제할 주문 정보를 찾지 못했습니다.");
      return;
    }

    const confirmMessage =
      mode === "edit"
        ? "방금 제출한 주문을 삭제하고 장바구니로 다시 불러올까요?"
        : "방금 제출한 주문을 삭제할까요?";

    if (!window.confirm(confirmMessage)) {
      return;
    }

    try {
      await cancelOwnOrder({
        orderId: recentReceipt.orderId,
        batchId,
        ordererName: recentReceipt.ordererName
      });

      if (mode === "edit") {
        setCart(cloneCartItems(recentReceipt.items));
        setForm((current) => ({
          ...current,
          ordererName: recentReceipt.ordererName,
          team: recentReceipt.team || current.team || batch?.department || "AX팀"
        }));
        setStatusMessage("기존 주문을 삭제하고 장바구니로 다시 불러왔습니다. 수정 후 다시 주문해 주세요.");
      } else {
        setStatusMessage("제출한 주문을 삭제했습니다.");
      }

      window.localStorage.removeItem(getRecentReceiptKey(batchId));
      setRecentReceipt(null);
      setMyOrders([]);
      setHasLoadedMyOrders(true);
      fetchPopularMenus({ batchId, brand, limit: 8 })
        .then(setLiveOrderRows)
        .catch(() => undefined);
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "주문 삭제에 실패했습니다.");
    }
  }

  function renderRecentOrderActions() {
    const latestOrder = myOrders[0];
    if (!latestOrder) return null;

    return (
      <div className="recent-order-actions">
        <button className="secondary-button" type="button" onClick={() => removeSubmittedOrder(latestOrder, "edit")}>
          주문 수정
        </button>
        <button className="secondary-button danger-button" type="button" onClick={() => removeSubmittedOrder(latestOrder, "delete")}>
          주문 삭제
        </button>
      </div>
    );
  }

  function applyRecentOrder(mode: "replace" | "append" = "replace") {
    if (!recentPreset) return;
    if (!selectedRecentItems.length) {
      setStatusMessage("최근 주문에서 담을 메뉴를 먼저 선택해 주세요.");
      return;
    }

    setForm(recentPreset.form);

    if (mode === "append") {
      setCart((current) => [...current, ...cloneCartItems(selectedRecentItems)]);
      setStatusMessage("선택한 최근 주문 메뉴를 장바구니에 추가했습니다.");
      return;
    }

    setCart(cloneCartItems(selectedRecentItems));
    setStatusMessage("선택한 최근 주문 메뉴로 장바구니를 다시 채웠습니다.");
  }

  function applyRecentOrderLegacy() {
    if (!recentPreset) return;
    setForm(recentPreset.form);
    setCart(
      recentPreset.items.map((item) => ({
        ...item,
        localId: crypto.randomUUID()
      }))
    );
    setStatusMessage("최근 주문을 불러왔습니다.");
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
      orderId: order.id,
      savedAt: new Date().toISOString(),
      batchId,
      batchTitle: batch?.title || "주문 목록",
      ordererName: order.ordererName,
      team: order.team,
      items: preset.items
    };

    syncRecentPreset(preset);
    window.localStorage.setItem(getRecentReceiptKey(batchId), JSON.stringify(receipt));
    setRecentReceipt(receipt);
  }

  async function submitOrder(event: FormEvent) {
    event.preventDefault();
    setStatusMessage("");
    const nextErrors: CheckoutErrors = {};

    if (!form.ordererName.trim()) {
      nextErrors.ordererName = "이름을 입력해 주세요.";
    }

    if (!form.team.trim()) {
      nextErrors.team = "부서명을 입력해 주세요.";
    }

    if (nextErrors.ordererName || nextErrors.team) {
      setCheckoutErrors(nextErrors);
      setIsCheckoutOpen(true);
      return;
    }

    if (!cart.length) {
      setStatusMessage("메뉴를 먼저 담아주세요.");
      return;
    }

    setIsSubmitting(true);
    try {
      const order = await createOrder({ batchId, ...form, items: cart });
      saveRecentOrder(order);
      setMyOrders((current) => [order, ...current.filter((entry) => entry.id !== order.id)]);
      setHasLoadedMyOrders(true);
      setCart([]);
      setForm({
        ordererName: order.ordererName,
        team: order.team || batch?.department || "AX팀",
        contact: order.contact || "",
        memo: order.memo || ""
      });
      setCheckoutErrors({});
      setIsCheckoutOpen(false);
      fetchMyOrders({ batchId, ordererName: order.ordererName })
        .then((orders) => {
          setMyOrders(orders);
          setHasLoadedMyOrders(true);
        })
        .catch(() => undefined);
      setStatusMessage("주문이 정상적으로 접수되었습니다.");
      fetchPopularMenus({ batchId, brand, limit: 8 })
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
          <p className="eyebrow">SAMOO AX ORDER</p>
          <h1>{batch?.title || "주문 목록을 불러오는 중입니다."}</h1>
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
            <span className="brand-chip hero-order-chip">{`${batch?.department || "AX팀"} ${brandNames[previewBrand]}`}</span>
          </div>
          <div className="hero-preview-panel">
            <div className="panel-title-row compact-preview-title">
              <div>
                <h2>주문 현황</h2>
              </div>
            </div>
            {shouldShowPopularMenus ? (
              <div className="hero-order-preview-list">
                {popularMenus.map((menu) => (
                  <button className="hero-order-preview-item" key={menu.id} type="button" onClick={() => openMenu(menu)}>
                    <img src={menu.imageUrl} alt="" loading="lazy" />
                    <div>
                      <strong>{menu.name}</strong>
                      <span>{menu.orderedQuantity}건 주문</span>
                      <small>{menu.ordererNames.join(", ")}</small>
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="empty-state compact-empty-state">아직 집계된 주문 메뉴가 없습니다.</div>
            )}
            {renderRecentOrderActions()}
          </div>
          <div className="hero-progress">
            {statusSteps.map((step, index) => (
              <div className="progress-step" key={step}>
                <span className={index < completedStepCount ? "progress-dot active" : "progress-dot"} />
                <small>{step}</small>
              </div>
            ))}
          </div>
        </div>
      </section>

      <form className="layout" id="order-form" onSubmit={submitOrder}>
        <section className="main-panel main-panel-premium" id="menu-section">
          <div className="section-heading-row">
            <div>
              <p className="section-kicker">메뉴를 고르세요</p>
              <h2 className="menu-directory-title">MENU DIRECTORY</h2>
            </div>
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
              <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="상품명 또는 메뉴명으로 검색" />
            </div>
          </div>

          {brand === "STARBUCKS" && featuredMenus.length ? (
            <section className="featured-strip">
              <div className="section-heading-row compact">
                <div>
                  <h3>빠른 메뉴</h3>
                </div>
              </div>
              <div className="featured-grid featured-grid-scroll">
                {featuredMenus.map((menu) => (
                  <button className="featured-card priority-card" key={menu.id} type="button" onClick={() => openMenu(menu)}>
                    <img src={menu.imageUrl} alt="" loading="lazy" />
                    <div>
                      <strong>{menu.name}</strong>
                      <span>{getMenuCategoryLabel(menu)}</span>
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
                  <h3>이번 주문 인기 메뉴</h3>
                </div>
              </div>
              <div className="featured-grid">
                {popularMenus.map((menu) => (
                  <button className="featured-card" key={menu.id} type="button" onClick={() => openMenu(menu)}>
                    <img src={menu.imageUrl} alt="" loading="lazy" />
                    <div>
                      <strong>{menu.name}</strong>
                      <span>{getMenuCategoryLabel(menu)} · {menu.orderedQuantity}건</span>
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
                <h3>{brand === "EMART" ? "대분류별 상품" : "카테고리별 메뉴"}</h3>
              </div>
            </div>

            {visibleMenusByCategory.length ? visibleMenusByCategory.map((group) => {
              const isOpen = openCategories.includes(group.categoryName);
              const activeSubcategory = selectedSubcategories[group.categoryName] ?? "ALL";
              const orderedMenus =
                brand === "EMART" && activeSubcategory !== "ALL"
                  ? [...group.menus].sort((left, right) => {
                      const leftPriority = left.subcategory === activeSubcategory ? 0 : 1;
                      const rightPriority = right.subcategory === activeSubcategory ? 0 : 1;
                      if (leftPriority !== rightPriority) return leftPriority - rightPriority;
                      return left.name.localeCompare(right.name, "ko");
                    })
                  : group.menus;

              return (
                <section className="category-dropdown" key={group.categoryName}>
                  <button
                    className={isOpen ? "category-dropdown-trigger active" : "category-dropdown-trigger"}
                    type="button"
                    onClick={() => toggleCategory(group.categoryName)}
                  >
                    <div>
                      <strong>{group.categoryName}</strong>
                      <span>{group.menus.length}개 상품</span>
                    </div>
                    <ChevronDown size={18} />
                  </button>
                  {isOpen ? (
                    <>
                      {brand === "EMART" && group.subcategories.length ? (
                        <div className="category-pills">
                          <button
                            className={activeSubcategory === "ALL" ? "active" : ""}
                            type="button"
                            onClick={() => setSelectedSubcategories((current) => ({ ...current, [group.categoryName]: "ALL" }))}
                          >
                            전체
                          </button>
                          {group.subcategories.map((subcategory) => (
                            <button
                              key={subcategory}
                              className={activeSubcategory === subcategory ? "active" : ""}
                              type="button"
                              onClick={() => setSelectedSubcategories((current) => ({ ...current, [group.categoryName]: subcategory }))}
                            >
                              {subcategory}
                            </button>
                          ))}
                        </div>
                      ) : null}
                      <MenuGrid
                        menus={orderedMenus}
                        onSelect={openMenu}
                        highlightedSubcategory={brand === "EMART" && activeSubcategory !== "ALL" ? activeSubcategory : undefined}
                      />
                    </>
                  ) : null}
                </section>
              );
            }) : (
              <div className="empty-state">검색 결과에 맞는 상품이 아직 없습니다.</div>
            )}
          </section>
        </section>

        <aside className="side-panel side-panel-premium">
          {recentPreset ? (
            <div className="panel-section panel-glass quick-reorder-panel">
              <div className="panel-title-row">
                <div>
                  <p className="section-kicker">Quick Reorder</p>
                  <h2>최근 주문 빠르게 담기</h2>
                </div>
                <span className="section-count">{selectedRecentItems.length}/{recentPreset.items.length}</span>
              </div>
              <p className="quick-reorder-hint">
                최근 주문에서 필요한 메뉴만 고른 뒤 바로 장바구니로 다시 담을 수 있습니다.
              </p>
              <div className="quick-reorder-actions">
                <button className="secondary-button" type="button" onClick={() => applyRecentOrder("replace")}>
                  선택 항목으로 다시 담기
                </button>
                <button className="secondary-button" type="button" onClick={() => applyRecentOrder("append")}>
                  현재 장바구니에 추가
                </button>
              </div>
              <div className="quick-reorder-list">
                {recentPreset.items.map((item) => {
                  const isSelected = selectedRecentItemIds.includes(item.localId);

                  return (
                    <div className={isSelected ? "quick-reorder-item active" : "quick-reorder-item"} key={item.localId}>
                      <button className="quick-reorder-toggle" type="button" onClick={() => toggleRecentItem(item.localId)}>
                        <strong>{item.menuName}</strong>
                        <span>{item.size} · {item.quantity}{getQuantityUnit(item.brand)}</span>
                      </button>
                      <div className="quick-reorder-item-actions">
                        <button className={isSelected ? "mini-action-button active" : "mini-action-button"} type="button" onClick={() => toggleRecentItem(item.localId)}>
                          {isSelected ? "선택됨" : "선택"}
                        </button>
                        <button className="mini-action-button danger" type="button" onClick={() => removeRecentItem(item.localId)} aria-label={`${item.menuName} 삭제`}>
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : null}

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

          {recentReceipt && !myOrders.length ? (
            <div className="panel-section panel-glass">
              <div className="panel-title-row">
                <div>
                  <h2>최근 제출한 주문</h2>
                </div>
                <CheckCircle2 size={18} />
              </div>
              <div className="recent-order-summary">
                <strong>{recentReceipt.ordererName}</strong>
                <span>
                  {recentReceipt.team || batch?.department || "AX팀"} · {new Date(recentReceipt.savedAt).toLocaleString("ko-KR")}
                </span>
              </div>
              <div className="quick-reorder-actions">
                <button className="secondary-button" type="button" onClick={() => (editableRecentOrder ? removeSubmittedOrder(editableRecentOrder, "edit") : removeRecentReceiptFallback("edit"))}>
                  수정하려고 다시 담기
                </button>
                <button className="secondary-button danger-button" type="button" onClick={() => (editableRecentOrder ? removeSubmittedOrder(editableRecentOrder, "delete") : removeRecentReceiptFallback("delete"))}>
                  제출한 주문 삭제
                </button>
              </div>
              <div className="recent-order-list">
                {recentReceipt.items.map((item) => (
                  <div className="recent-order-item" key={`${item.menuId}-${item.size}-${item.menuName}`}>
                    <strong>{item.menuName}</strong>
                    <span>{item.size} · {item.quantity}{getQuantityUnit(item.brand)}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {false ? (
            <div className="panel-section panel-glass">
              <div className="panel-title-row">
                <div>
                  <h2>내 주문 목록</h2>
                </div>
              </div>
              <div className="my-order-list">
                {myOrders.map((order) => (
                  <div className="my-order-card" key={order.id}>
                    <div className="recent-order-summary">
                      <strong>{order.ordererName}</strong>
                      <span>
                        {order.team || batch?.department || "AX팀"} · {new Date(order.orderedAt).toLocaleString("ko-KR")}
                      </span>
                    </div>
                    <div className="recent-order-actions">
                      <button className="secondary-button" type="button" onClick={() => removeSubmittedOrder(order, "edit")}>
                        주문 수정
                      </button>
                      <button className="secondary-button danger-button" type="button" onClick={() => removeSubmittedOrder(order, "delete")}>
                        주문 삭제
                      </button>
                    </div>
                    <div className="recent-order-list">
                      {order.items.map((item) => (
                        <div className="recent-order-item" key={item.id}>
                          <strong>{item.menuName}</strong>
                          <span>{item.size} · {item.quantity}{getQuantityUnit(item.brand)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {myOrders.length ? (
            <div className="panel-section panel-glass">
              <div className="panel-title-row">
                <div>
                  <h2>내 주문 목록</h2>
                </div>
                <CheckCircle2 size={18} />
              </div>
              <div className="my-order-list">
                {myOrders.map((order) => (
                  <div className="my-order-card" key={order.id}>
                    <div className="recent-order-summary">
                      <strong>{order.ordererName}</strong>
                      <span>
                        {order.team || batch?.department || "AX팀"} · {new Date(order.orderedAt).toLocaleString("ko-KR")}
                      </span>
                    </div>
                    <div className="recent-order-actions">
                      <button className="secondary-button" type="button" onClick={() => removeSubmittedOrder(order, "edit")}>
                        주문 수정
                      </button>
                      <button className="secondary-button danger-button" type="button" onClick={() => removeSubmittedOrder(order, "delete")}>
                        주문 삭제
                      </button>
                    </div>
                    <div className="recent-order-list">
                      {order.items.map((item) => (
                        <div className="recent-order-item" key={item.id}>
                          <strong>{item.menuName}</strong>
                          <span>{item.size} · {item.quantity}{getQuantityUnit(item.brand)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {statusMessage ? <p className="status-message premium-status">{statusMessage}</p> : null}
          <button className="primary-button premium-submit page-submit-button" type="button" disabled={isSubmitting || !batch || batch.status !== "open"} onClick={openCheckoutModal}>
            <ShoppingBag size={18} />
            {isSubmitting ? "주문 제출 중" : `주문하기${totalCartCount ? ` · ${totalCartCount}개` : ""}`}
          </button>
        </aside>
      </form>

      <div className="floating-submit-bar">
        <div>
          <strong>{totalCartCount ? `내가 고른 메뉴 ${totalCartCount}개` : "내가 고른 메뉴"}</strong>
          <span>{cart.length ? "지금 바로 주문할 수 있습니다." : "메뉴를 담아 주문을 준비해보세요."}</span>
        </div>
        <button className="primary-button floating-submit-button" type="button" disabled={isSubmitting || !batch || batch.status !== "open"} onClick={openCheckoutModal}>
          {isSubmitting ? "주문 제출 중" : "주문하기"}
        </button>
      </div>

      {isCheckoutOpen ? (
        <div className="modal-backdrop" role="presentation">
          <div className="modal premium-modal checkout-modal" role="dialog" aria-modal="true" aria-labelledby="checkout-modal-title">
            <button className="close-button" type="button" aria-label="닫기" onClick={() => setIsCheckoutOpen(false)}>
              <X size={20} />
            </button>
            <div className="modal-copy">
              <span className="brand-chip hero-order-chip">{`${batch?.department || "AX팀"} ${brandNames[previewBrand]}`}</span>
              <h2 id="checkout-modal-title">주문자 정보</h2>
              <p>입력한 정보는 다음 주문에서도 자동으로 불러옵니다.</p>
            </div>
            <div className="field-grid">
              <label className="field">
                <span>이름 *</span>
                <input value={form.ordererName} onChange={(event) => setForm({ ...form, ordererName: event.target.value })} placeholder="이름을 입력해 주세요" />
                {checkoutErrors.ordererName ? <small className="field-error">{checkoutErrors.ordererName}</small> : null}
              </label>
              <label className="field">
                <span>부서명 *</span>
                <input value={form.team} onChange={(event) => setForm({ ...form, team: event.target.value })} placeholder="부서명을 입력해 주세요" />
                {checkoutErrors.team ? <small className="field-error">{checkoutErrors.team}</small> : null}
              </label>
            </div>
            <label className="field">
              <span>연락처 또는 메신저 ID</span>
              <input value={form.contact} onChange={(event) => setForm({ ...form, contact: event.target.value })} placeholder="전달 안내용" />
            </label>
            <label className="field">
              <span>메모</span>
              <input value={form.memo} onChange={(event) => setForm({ ...form, memo: event.target.value })} placeholder="공동 주문 메모가 있으면 적어 주세요" />
            </label>
            {recentPreset ? (
              <button className="secondary-button" type="button" onClick={() => applyRecentOrder("replace")}>
                <History size={16} />
                최근 주문 불러오기
              </button>
            ) : null}
            <button className="primary-button premium-submit modal-submit-button" type="submit" form="order-form" disabled={isSubmitting || !batch || batch.status !== "open"}>
              <ShieldCheck size={18} />
              {isSubmitting ? "주문 제출 중" : "주문 확정하기"}
            </button>
          </div>
        </div>
      ) : null}

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
              <p>{getMenuCategoryLabel(selectedMenu)}</p>
            </div>
            {isSingleOptionMenu(selectedMenu) ? null : (
              <SizeSelector sizes={selectedMenu.availableSizes} value={selectedSize} onChange={setSelectedSize} />
            )}
            <label className="field">
              <span>수량</span>
              <input min={1} type="number" value={quantity} onChange={(event) => setQuantity(Number(event.target.value) || 1)} />
            </label>
            <CustomRequestInput value={customRequest} onChange={setCustomRequest} />
            <button className="primary-button premium-submit modal-submit-button" type="button" onClick={addToCart}>
              <ShoppingBag size={18} />
              장바구니에 담기
            </button>
          </div>
        </div>
      ) : null}
    </main>
  );
}
