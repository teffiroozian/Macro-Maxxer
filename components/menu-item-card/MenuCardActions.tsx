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
        // Lightweight confirmation, not a success badge: !important-suffixed
        // overrides here since AppButton's "primary" variant hardcodes
        // border-black/bg-black/text-white, and those need to reliably lose
        // to this white/subtle-border/dark-text treatment regardless of
        // Tailwind's generated class order.
        className={`px-5! text-sm! transition ${isAddFeedbackVisible ? "border-success/50! bg-white! text-neutral-900!" : ""}`}
        disabled={isAddFeedbackVisible}
        aria-label={`Quick add ${itemName} to cart`}
        onClick={(event) => { event.stopPropagation(); onQuickAdd(); }}
      >
        {isAddFeedbackVisible ? "Added" : "Quick Add"}
      </AppButton>
    </div>
  );
}
