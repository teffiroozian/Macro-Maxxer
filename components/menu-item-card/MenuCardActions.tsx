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
    <div className="ml-auto inline-flex flex-row items-end gap-2">
      <AppButton
        variant="secondary"
        size="lg"
        className="px-[18px] py-2 font-bold"
        aria-label={`View details for ${itemName}`}
        onClick={(event) => { event.stopPropagation(); onViewDetails(); }}
      >
        View Details
      </AppButton>
      <AppButton
        variant="primary"
        size="lg"
        className={`px-[18px] py-2 font-bold ${isAddFeedbackVisible ? "border-green-700 bg-green-600 -translate-y-px" : "border-black/20 bg-black/90"}`}
        disabled={isAddFeedbackVisible}
        aria-label={`Quick add ${itemName} to cart`}
        onClick={(event) => { event.stopPropagation(); onQuickAdd(); }}
      >
        {isAddFeedbackVisible ? "Added ✓" : "Quick Add"}
      </AppButton>
    </div>
  );
}
