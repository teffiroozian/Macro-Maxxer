export default function MenuCardActions({
  isAddFeedbackVisible,
  onAddToCart,
}: {
  isAddFeedbackVisible: boolean;
  onAddToCart: () => void;
}) {
  return (
    <div className="ml-auto inline-flex flex-row items-end gap-2">
      <button
        type="button"
        className={`cursor-pointer rounded-xl border px-[18px] py-2 text-base font-bold text-white transition ${isAddFeedbackVisible ? "border-green-700 bg-green-600 -translate-y-px" : "border-black/20 bg-black/90"} disabled:cursor-not-allowed`}
        disabled={isAddFeedbackVisible}
        onClick={(event) => { event.stopPropagation(); onAddToCart(); }}
      >
        {isAddFeedbackVisible ? "Added ✓" : "Add to Cart"}
      </button>
    </div>
  );
}
