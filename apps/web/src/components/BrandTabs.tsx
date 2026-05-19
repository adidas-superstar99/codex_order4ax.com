import starbucksCi from "../assets/starbucks-ci.svg";
import twosomeCi from "../assets/twosome-ci.svg";
import type { Brand } from "../types";

const labels: Record<Brand, { name: string; image: string }> = {
  STARBUCKS: { name: "스타벅스", image: starbucksCi },
  TWOSOME: { name: "투썸플레이스", image: twosomeCi }
};

export function BrandTabs({ value, onChange }: { value: Brand; onChange: (brand: Brand) => void }) {
  return (
    <div className="segmented premium-segmented" aria-label="브랜드 선택">
      {(Object.keys(labels) as Brand[]).map((brand) => (
        <button
          key={brand}
          type="button"
          className={value === brand ? "active brand-segment-button" : "brand-segment-button"}
          onClick={() => onChange(brand)}
          aria-label={labels[brand].name}
        >
          <img className="brand-segment-logo" src={labels[brand].image} alt={labels[brand].name} />
        </button>
      ))}
    </div>
  );
}
