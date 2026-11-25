import { Bookmark } from "lucide-react";
import { primaryButton } from "@/components/native/saved/savedStyles";

// Sits above the floating navigation while there is something to act on.
export default function OrderActionDock({ saved, onSave, onFinish }: { saved: boolean; onSave: () => void; onFinish: () => void }) {
  return (
    <>
      <div aria-hidden="true" className="pointer-events-none fixed inset-x-0 bottom-0 z-20 h-[calc(var(--native-nav-bottom)+158px)] bg-linear-to-t from-slate-50 from-75% to-transparent dark:from-app-background" />
      <div className="fixed inset-x-0 bottom-[calc(var(--native-nav-bottom)+76px)] z-20 mx-auto grid max-w-[484px] grid-cols-[138px_minmax(0,1fr)] gap-2.5 px-[max(18px,var(--safe-area-left),var(--safe-area-right))]">
        <button type="button" onClick={onSave} aria-label={saved ? "Saved to Meals" : "Save meal"} className={`flex h-[50px] cursor-pointer items-center justify-center gap-2 rounded-2xl border border-black/8 bg-surface-card text-base font-semibold shadow-elev-2 active:opacity-80 dark:border-hairline focus-ring ${saved ? "text-accent-strong" : ""}`}>
          <Bookmark size={18} strokeWidth={2.3} fill={saved ? "currentColor" : "none"} aria-hidden="true" />{saved ? "Saved" : "Save meal"}
        </button>
        <button type="button" onClick={onFinish} className={`${primaryButton} shadow-elev-2`}>Finish order</button>
      </div>
    </>
  );
}
