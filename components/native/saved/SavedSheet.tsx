"use client";
import { useEffect, useState, type ReactNode, type RefObject } from "react";
import Dialog from "@/components/ui/Dialog";

// How much of the layout the iOS keyboard covers. WKWebView keeps fixed sheets
// at full height, which would leave their buttons behind it.
function useKeyboardInset() {
  const [inset, setInset] = useState(0);
  useEffect(() => {
    const viewport = window.visualViewport;
    if (!viewport) return;
    const update = () => {
      const covered = window.innerHeight - viewport.height - viewport.offsetTop;
      setInset(covered > 80 ? Math.round(covered) : 0);
    };
    viewport.addEventListener("resize", update);
    viewport.addEventListener("scroll", update);
    return () => { viewport.removeEventListener("resize", update); viewport.removeEventListener("scroll", update); };
  }, []);
  return inset;
}

// onClose must be stable: Dialog moves focus again whenever it changes.
export default function SavedSheet({ titleId, onClose, initialFocusRef, tall = false, children }: {
  titleId: string;
  onClose: () => void;
  initialFocusRef?: RefObject<HTMLElement | null>;
  tall?: boolean;
  children: ReactNode;
}) {
  const [shown, setShown] = useState(false);
  const keyboard = useKeyboardInset();
  useEffect(() => {
    const raf = requestAnimationFrame(() => setShown(true));
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { cancelAnimationFrame(raf); document.body.style.overflow = overflow; };
  }, []);
  return (
    <Dialog
      onClose={onClose}
      titleId={titleId}
      initialFocusRef={initialFocusRef}
      presentation="bottom-sheet"
      panelClassName={`!flex ${tall ? "h-[92%]" : "max-h-[92%]"} max-w-2xl flex-col !rounded-t-[28px] !bg-slate-50 !p-0 text-slate-900 transition-transform duration-[250ms] ease-out motion-reduce:transition-none dark:!bg-app-background dark:text-slate-50 ${shown ? "translate-y-0" : "translate-y-full"}`}
    >
      <div className="flex h-5 shrink-0 items-end justify-center" aria-hidden="true"><span className="h-[5px] w-9 rounded-full bg-slate-300 dark:bg-slate-600" /></div>
      {children}
      {keyboard ? <div aria-hidden="true" className="shrink-0" style={{ height: keyboard }} /> : null}
    </Dialog>
  );
}
