import type { Brand } from "../types";

const labels: Record<Brand, string> = {
  STARBUCKS: "스타벅스",
  TWOSOME: "투썸플레이스",
  EMART: "이마트"
};

const tabs: Array<{ id: Brand | "COFFEE_BEAN" | "EDIYA"; label: string; enabled: boolean; activeBrand?: Brand }> = [
  { id: "STARBUCKS", label: "스타벅스", enabled: true, activeBrand: "STARBUCKS" },
  { id: "TWOSOME", label: "투썸플레이스", enabled: true, activeBrand: "TWOSOME" },
  { id: "EMART", label: "이마트", enabled: true, activeBrand: "EMART" },
  { id: "COFFEE_BEAN", label: "커피빈", enabled: false },
  { id: "EDIYA", label: "이디야", enabled: false }
];

export function BrandTabs({ value, onChange }: { value: Brand; onChange: (brand: Brand) => void }) {
  return (
    <div className="segmented" aria-label="브랜드 선택">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          className={value === tab.id ? "active" : ""}
          disabled={!tab.enabled}
          onClick={() => {
            if (tab.enabled && tab.activeBrand) onChange(tab.activeBrand);
          }}
          title={tab.enabled ? tab.label : `${tab.label} 준비 중`}
        >
          {tab.enabled ? tab.label : `${tab.label} (준비 중)`}
        </button>
      ))}
    </div>
  );
}
