import { Minus, Plus, Trash2 } from "lucide-react";
import type { Brand, CartItem } from "../types";

const brandLabel: Record<Brand, string> = {
  STARBUCKS: "스타벅스",
  TWOSOME: "투썸플레이스",
  EMART: "이마트"
};

function getQuantityUnit(brand: Brand) {
  return brand === "EMART" ? "개" : "잔";
}

export function OrderCart({
  items,
  onRemove,
  onQuantityChange
}: {
  items: CartItem[];
  onRemove: (localId: string) => void;
  onQuantityChange: (localId: string, quantity: number) => void;
}) {
  if (!items.length) {
    return <div className="cart-empty">아직 담긴 메뉴가 없어요. 왼쪽 메뉴 카드에서 음료나 과자를 골라보세요.</div>;
  }

  return (
    <div className="cart-list">
      {items.map((item) => (
        <div className="cart-item" key={item.localId}>
          <div>
            <strong>{item.menuName}</strong>
            <span>
              {brandLabel[item.brand]} · {item.size} · {item.quantity}
              {getQuantityUnit(item.brand)}
            </span>
            {item.customRequest ? <p>{item.customRequest}</p> : null}
          </div>
          <div className="quantity-control">
            <button type="button" aria-label="수량 감소" onClick={() => onQuantityChange(item.localId, item.quantity - 1)}>
              <Minus size={16} />
            </button>
            <span>{item.quantity}</span>
            <button type="button" aria-label="수량 증가" onClick={() => onQuantityChange(item.localId, item.quantity + 1)}>
              <Plus size={16} />
            </button>
            <button type="button" aria-label="항목 제거" onClick={() => onRemove(item.localId)}>
              <Trash2 size={16} />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
