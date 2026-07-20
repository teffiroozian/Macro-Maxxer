import SectionEyebrow from "@/components/ui/SectionEyebrow";
import type { Nutrition } from "@/types/nutrition";

export type NutritionLabelTotals = Nutrition;

type NutritionLabelCardProps = {
  totals: NutritionLabelTotals;
  title?: string;
  eyebrow?: string;
  footer?: string;
};

type NutritionLabelRowDefinition = {
  key: keyof NutritionLabelTotals;
  label: string;
  unit: string;
  indent?: boolean;
};

const nutritionLabelRows: NutritionLabelRowDefinition[] = [
  { key: "totalFat", label: "Total Fat", unit: "g" },
  { key: "satFat", label: "Sat Fat", unit: "g", indent: true },
  { key: "transFat", label: "Trans Fat", unit: "g", indent: true },
  { key: "cholesterol", label: "Cholesterol", unit: "mg" },
  { key: "sodium", label: "Sodium", unit: "mg" },
  { key: "carbs", label: "Carbohydrates", unit: "g" },
  { key: "fiber", label: "Fiber", unit: "g", indent: true },
  { key: "sugars", label: "Sugars", unit: "g", indent: true },
  { key: "protein", label: "Protein", unit: "g" },
];

function formatNutritionValue(value?: number, suffix = "") {
  return value === undefined ? "—" : `${value}${suffix}`;
}

function NutritionLabelRow({
  label,
  value,
  unit,
  indent = false,
}: NutritionLabelRowDefinition & { value?: number }) {
  const textClassName = indent
    ? "text-base font-medium text-[rgba(0,0,0,0.8)]"
    : "text-lg font-semibold";

  return (
    <div
      className={`flex items-baseline justify-between border-b border-[rgba(0,0,0,0.2)] py-[10px] ${
        indent ? "pl-5" : ""
      }`.trim()}
    >
      <div className={textClassName}>{label}</div>
      <div className={textClassName}>{formatNutritionValue(value, unit)}</div>
    </div>
  );
}

export default function NutritionLabelCard({
  totals,
  title,
  eyebrow,
  footer,
}: NutritionLabelCardProps) {
  return (
    <section className="rounded-[18px] border border-[rgba(0,0,0,0.15)] bg-white p-[18px]">
      {title ? (
        <h3 className={`text-2xl font-bold text-neutral-900 ${eyebrow ? "" : "mb-6"}`.trim()}>
          {title}
        </h3>
      ) : null}
      {eyebrow ? (
        <SectionEyebrow as="div" className="mt-6 text-xs font-medium tracking-[0.06em] text-[rgba(0,0,0,0.55)]">{eyebrow}</SectionEyebrow>
      ) : null}
      <div className="mt-1 flex items-end justify-between">
        <div className="text-xl font-bold">Calories</div>
        <div className="text-xl font-bold">{totals.calories}</div>
      </div>

      <div className="my-[12px] mb-2 h-[5px] rounded-[999px] bg-[rgba(0,0,0,0.75)]" />

      {nutritionLabelRows.map(({ key: nutrientKey, ...row }) => (
        <NutritionLabelRow key={nutrientKey} {...row} value={totals[nutrientKey]} />
      ))}

      {footer ? (
        <div className="mt-3 text-xs font-medium leading-[1.05] text-[rgba(0,0,0,0.55)]">
          {footer}
        </div>
      ) : null}
    </section>
  );
}
