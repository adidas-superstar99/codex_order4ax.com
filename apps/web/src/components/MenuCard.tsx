import { ArrowUpRight, Plus } from "lucide-react";
import type { Brand, Menu } from "../types";

const brandLabel: Record<Brand, string> = {
  STARBUCKS: "스타벅스",
  TWOSOME: "투썸플레이스"
};

export function MenuCard({ menu, onSelect }: { menu: Menu; onSelect: (menu: Menu) => void }) {
  return (
    <article className="menu-card premium-menu-card">
      <div className="menu-image-wrap">
        <img src={menu.imageUrl} alt="" loading="lazy" />
        <div className="menu-image-overlay">
          <span>{brandLabel[menu.brand]}</span>
          <ArrowUpRight size={16} />
        </div>
      </div>
      <div className="menu-card-body premium-menu-card-body">
        <div className="menu-meta">
          <span>{menu.category}</span>
          <span>{menu.availableSizes.length} size</span>
        </div>
        <h3>{menu.name}</h3>
        <div className="badge-row">
          {menu.isNew ? <span className="badge">NEW</span> : null}
          {menu.isSeasonal ? <span className="badge seasonal">SEASON</span> : null}
        </div>
        <button className="icon-text-button" type="button" onClick={() => onSelect(menu)}>
          <Plus size={18} />
          옵션 고르기
        </button>
      </div>
    </article>
  );
}
