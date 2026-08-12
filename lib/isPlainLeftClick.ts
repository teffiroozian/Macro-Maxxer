import type { MouseEvent } from "react";

// True for an unmodified left click — the case where it's safe to
// intercept a <Link> and reroute it through client-side logic (like a
// navigation guard) instead of letting the browser handle it natively.
// Modified clicks (cmd/ctrl/shift/alt, middle-click) are left alone so
// "open in new tab" and similar browser behaviors keep working.
export function isPlainLeftClick(event: MouseEvent) {
  return (
    event.button === 0 &&
    !event.metaKey &&
    !event.ctrlKey &&
    !event.shiftKey &&
    !event.altKey
  );
}
