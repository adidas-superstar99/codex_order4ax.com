import type { Brand } from "../types";

const labels: Record<Brand, { name: string; hint: string }> = {
  STARBUCKS: { name: "스타벅스", hint: "Coffee" },
  TWOSOME: { name: "투썸플레이스", hint: "Dessert cafe" }
};

export function BrandTabs({ value, onChange }: { value: Brand; onChange: (brand: Brand) => void }) {
  return (
    <div className="segmented premium-segmented" aria-label="브랜드 선택">
      {(Object.keys(labels) as Brand[]).map((brand) => (
        <button
          key={brand}
          type="button"
          className={value === brand ? "active" : ""}
          onClick={() => onChange(brand)}
        >
          <strong>{labels[brand].name}</strong>
          <small>{labels[brand].hint}</small>
        </button>
      ))}
    </div>
  );
}
