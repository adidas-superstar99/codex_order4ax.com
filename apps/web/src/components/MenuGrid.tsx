import type { Menu } from "../types";
import { MenuCard } from "./MenuCard";

export function MenuGrid({ menus, onSelect }: { menus: Menu[]; onSelect: (menu: Menu) => void }) {
  if (!menus.length) {
    return <div className="empty-state">조건에 맞는 메뉴가 아직 없어요. 다른 키워드나 카테고리로 다시 찾아보세요.</div>;
  }

  return (
    <div className="menu-grid">
      {menus.map((menu) => (
        <MenuCard key={menu.id} menu={menu} onSelect={onSelect} />
      ))}
    </div>
  );
}
