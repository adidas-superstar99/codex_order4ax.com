import { ArrowUpRight, Plus } from "lucide-react";
import type { Brand, Menu } from "../types";

const brandLabel: Record<Brand, string> = {
  STARBUCKS: "스타벅스",
  TWOSOME: "투썸플레이스",
  EMART: "이마트"
};

function getCategoryLabel(menu: Menu) {
  return menu.subcategory ? `${menu.category} / ${menu.subcategory}` : menu.category;
}

export function MenuCard({
  menu,
  onSelect,
  isHighlighted = false,
  isSubdued = false
}: {
  menu: Menu;
  onSelect: (menu: Menu) => void;
  isHighlighted?: boolean;
  isSubdued?: boolean;
}) {
  const className = [
    "menu-card",
    "premium-menu-card",
    isHighlighted ? "menu-card-highlighted" : "",
    isSubdued ? "menu-card-subdued" : ""
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <article className={className}>
      <div className="menu-image-wrap">
        <img src={menu.imageUrl} alt="" loading="lazy" />
        <div className="menu-image-overlay">
          <span>{brandLabel[menu.brand]}</span>
          <ArrowUpRight size={16} />
        </div>
      </div>
      <div className="menu-card-body premium-menu-card-body">
        <div className="menu-meta">
          <span>{getCategoryLabel(menu)}</span>
          <span>{menu.availableSizes.length === 1 ? "단일 옵션" : `${menu.availableSizes.length} size`}</span>
        </div>
        <h3>{menu.name}</h3>
        <div className="badge-row">
          {menu.subcategory && isHighlighted ? <span className="badge menu-focus-badge">{menu.subcategory}</span> : null}
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
