import coffeebeanCi from "../assets/coffeebean-ci.png";
import emartCi from "../assets/emart-ci.png";
import starbucksCi from "../assets/starbucks-ci.png";
import twosomeCi from "../assets/twosome-ci.png";
import type { Brand } from "../types";

type BrandTab = {
  id: Brand | "COFFEE_BEAN" | "EMART";
  name: string;
  image: string;
  enabled: boolean;
  activeBrand?: Brand;
};

const tabs: BrandTab[] = [
  { id: "STARBUCKS", name: "스타벅스", image: starbucksCi, enabled: true, activeBrand: "STARBUCKS" },
  { id: "TWOSOME", name: "투썸플레이스", image: twosomeCi, enabled: true, activeBrand: "TWOSOME" },
  { id: "COFFEE_BEAN", name: "커피빈", image: coffeebeanCi, enabled: false },
  { id: "EMART", name: "이마트", image: emartCi, enabled: false }
];

export function BrandTabs({ value, onChange }: { value: Brand; onChange: (brand: Brand) => void }) {
  return (
    <div className="segmented premium-segmented brand-tabs-scroll" aria-label="브랜드 선택">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          className={[
            "brand-segment-button",
            value === tab.id ? "active" : "",
            tab.enabled ? "" : "future-brand-button"
          ].filter(Boolean).join(" ")}
          onClick={() => {
            if (tab.enabled && tab.activeBrand) onChange(tab.activeBrand);
          }}
          aria-label={tab.name}
          aria-disabled={!tab.enabled}
          title={tab.enabled ? tab.name : `${tab.name} 준비 중`}
        >
          <img className="brand-segment-logo" src={tab.image} alt={tab.name} />
          {!tab.enabled ? <span className="future-brand-badge">준비 중</span> : null}
        </button>
      ))}
    </div>
  );
}
