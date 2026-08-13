"use client";

import { ChevronDown } from "lucide-react";

export type InlineVariantSelectOption = { id: string; label: string };

// The compact pill dropdown used for quick per-row selections — originally
// the standard item modal's Meal Details variant control, now shared so any
// row-level "pick one of a few options" control looks and behaves the same
// everywhere (e.g. the editable prebuilt meal's Selected Ingredients portion
// dropdowns).
export default function InlineVariantSelect({
    options,
    selectedOptionId,
    onSelectOption,
    ariaLabel,
}: {
    options: InlineVariantSelectOption[];
    selectedOptionId?: string;
    onSelectOption: (optionId: string) => void;
    ariaLabel: string;
}) {
    const activeOptionId = selectedOptionId ?? options[0]?.id;
    return (
        <span
            className="relative inline-flex shrink-0 items-center"
            onClick={(event) => event.stopPropagation()}
        >
            <select
                value={activeOptionId}
                onChange={(event) => onSelectOption(event.target.value)}
                aria-label={ariaLabel}
                className="cursor-pointer appearance-none rounded-full border border-slate-200 bg-white py-1 pr-6 pl-2.5 text-xs font-semibold text-slate-600 transition hover:border-accent-strong hover:text-accent-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-strong/50"
            >
                {options.map((option) => (
                    <option key={option.id} value={option.id}>
                        {option.label}
                    </option>
                ))}
            </select>
            <ChevronDown
                size={12}
                strokeWidth={2.5}
                aria-hidden="true"
                className="pointer-events-none absolute right-2 text-slate-400"
            />
        </span>
    );
}
