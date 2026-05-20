import { Plus } from "lucide-react";
import type { Brand, Menu } from "../types";

const brandLabel: Record<Brand, string> = {
  STARBUCKS: "스타벅스",
  TWOSOME: "투썸플레이스",
  EMART: "이마트"
};

function getCategoryLabel(menu: Menu) {
  return menu.subcategory ? `${menu.category} / ${menu.subcategory}` : menu.category;
}

export function MenuCard({ menu, onSelect }: { menu: Menu; onSelect: (menu: Menu) => void }) {
  return (
    <article className="menu-card">
      <img src={menu.imageUrl} alt="" loading="lazy" />
      <div className="menu-card-body">
        <div className="menu-meta">
          <span>{brandLabel[menu.brand]}</span>
          <span>{getCategoryLabel(menu)}</span>
        </div>
        <h3>{menu.name}</h3>
        <div className="badge-row">
          {menu.isNew ? <span className="badge">NEW</span> : null}
          {menu.isSeasonal ? <span className="badge seasonal">SEASON</span> : null}
        </div>
        <button className="icon-text-button" type="button" onClick={() => onSelect(menu)}>
          <Plus size={18} />
          담기
        </button>
      </div>
    </article>
  );
}
