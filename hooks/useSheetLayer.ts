"use client";

import { useEffect, useRef, type RefObject } from "react";
import { createSheetLayers } from "@/lib/controls/sheetLayers";

const HISTORY_KEY = "macroMaxxerSheet";
let previousOverflow: string | undefined;
const layers = createSheetLayers({
  push(id) { window.history.pushState({ ...window.history.state, [HISTORY_KEY]: id }, "", window.location.href); },
  back(steps) { window.history.go(-steps); },
  active(open) {
    if (open && previousOverflow === undefined) {
      previousOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
    } else if (!open && previousOverflow !== undefined) {
      document.body.style.overflow = previousOverflow;
      previousOverflow = undefined;
    }
  },
});
let listening = false;
function listen() {
  if (listening) return;
  listening = true;
  window.addEventListener("popstate", (event) => layers.pop(event.state?.[HISTORY_KEY]));
  window.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && layers.escape()) {
      event.preventDefault();
      event.stopImmediatePropagation();
    }
  }, true);
}

export function useSheetLayer({ open, onClose, initialFocusRef }: { open: boolean; onClose?: () => void; initialFocusRef?: RefObject<HTMLElement | null> }) {
  const onCloseRef = useRef(onClose);
  useEffect(() => { onCloseRef.current = onClose; }, [onClose]);
  useEffect(() => {
    if (!open) return;
    listen();
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const remove = layers.open(() => onCloseRef.current?.());
    const frame = requestAnimationFrame(() => initialFocusRef?.current?.focus({ preventScroll: true }));
    return () => {
      cancelAnimationFrame(frame);
      remove();
      if (previousFocus?.isConnected) previousFocus.focus({ preventScroll: true });
    };
  }, [open, initialFocusRef]);
}
