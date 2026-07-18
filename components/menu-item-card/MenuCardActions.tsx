import AppButton from "@/components/ui/AppButton";

export default function MenuCardActions({
  isAddFeedbackVisible,
  onAddToCart,
}: {
  isAddFeedbackVisible: boolean;
  onAddToCart: () => void;
}) {
  return (
    <div className="ml-auto inline-flex flex-row items-end gap-2">
      <AppButton
        variant="primary"
        size="lg"
        className={`px-[18px] py-2 font-bold ${isAddFeedbackVisible ? "border-green-700 bg-green-600 -translate-y-px" : "border-black/20 bg-black/90"}`}
        disabled={isAddFeedbackVisible}
        onClick={(event) => { event.stopPropagation(); onAddToCart(); }}
      >
        {isAddFeedbackVisible ? "Added ✓" : "Add to Cart"}
      </AppButton>
    </div>
  );
}
