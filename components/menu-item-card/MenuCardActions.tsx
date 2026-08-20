import { ChevronRight } from "lucide-react";
import AppButton from "@/components/ui/AppButton";

export default function MenuCardActions({
  itemName,
  isAddFeedbackVisible,
  onQuickAdd,
  onViewDetails,
}: {
  itemName: string;
  isAddFeedbackVisible: boolean;
  onQuickAdd: () => void;
  onViewDetails: () => void;
}) {
  return (
    <div className="ml-auto inline-flex flex-row items-center gap-4">
      <button
        type="button"
        aria-label={`View details for ${itemName}`}
        onClick={(event) => { event.stopPropagation(); onViewDetails(); }}
        className="group/details inline-flex cursor-pointer items-center gap-0.5 text-sm font-semibold text-slate-600 transition-colors hover:text-slate-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900"
      >
        <span className="underline-offset-4 group-hover/details:underline">View Details</span>
        <ChevronRight
          className="h-3.5 w-3.5 transition-transform duration-200 group-hover/details:translate-x-0.5"
          aria-hidden="true"
        />
      </button>
      <AppButton
        variant="primary"
        size="sm"
        // Temporarily-disabled look, not a white success badge:
        // !important-suffixed overrides here since AppButton's "primary"
        // variant hardcodes border-black/bg-black/text-white, and those need
        // to reliably lose to this muted-charcoal treatment regardless of
        // Tailwind's generated class order. Same border/padding/radius as
        // the active state (only color changes) so there's no layout shift,
        // and `disabled:opacity-60` on AppButton's base class does the rest
        // of the "temporarily inactive" softening.
        className={`px-5! text-sm! transition ${isAddFeedbackVisible ? "border-neutral-800! bg-neutral-800! text-white!" : ""}`}
        disabled={isAddFeedbackVisible}
        aria-label={`Quick add ${itemName} to cart`}
        onClick={(event) => { event.stopPropagation(); onQuickAdd(); }}
      >
        {isAddFeedbackVisible ? "Added" : "Quick Add"}
      </AppButton>
    </div>
  );
}
