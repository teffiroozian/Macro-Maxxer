export function getMenuPlacement(anchor: { left: number; top: number; bottom: number }, viewport: { left: number; top: number; width: number; height: number }, preferredWidth: number, contentHeight: number, allowFlip = true) {
  const margin = 8;
  const gap = 8;
  const chromeHeight = 14;
  const width = Math.max(0, Math.min(preferredWidth, viewport.width - margin * 2));
  const below = Math.max(0, viewport.top + viewport.height - margin - anchor.bottom - gap);
  const above = Math.max(0, anchor.top - viewport.top - margin - gap);
  const useAbove = allowFlip && contentHeight + chromeHeight > below && above > below;
  const available = useAbove ? above : below;
  const height = Math.min(contentHeight + chromeHeight, available);
  const top = Math.max(viewport.top + margin, Math.min(useAbove ? anchor.top - gap - height : anchor.bottom + gap, viewport.top + viewport.height - margin - height));
  return {
    width, height, top,
    left: Math.max(viewport.left + margin, Math.min(anchor.left, viewport.left + viewport.width - width - margin)),
    scrollMaxHeight: Math.max(0, available - chromeHeight),
  };
}
