import { Minus, Plus, Trash2 } from "lucide-react";
import type { Brand, CartItem } from "../types";

const brandLabels: Record<Brand, string> = {
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
    return <div className="cart-empty">선택한 메뉴가 아직 없습니다.</div>;
  }

  return (
    <div className="cart-list">
      {items.map((item) => (
        <div className="cart-item" key={item.localId}>
          <div>
            <strong>{item.menuName}</strong>
            <span>
              {brandLabels[item.brand]} · {item.size} · {item.quantity}
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
            <button type="button" aria-label="삭제" onClick={() => onRemove(item.localId)}>
              <Trash2 size={16} />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
