export type OptionLabelCountMap = Record<string, number>;

export function parseOptionLabelCounts(selectionDetailsLabel?: string): OptionLabelCountMap {
  const counts: OptionLabelCountMap = {};

  for (const rawSegment of (selectionDetailsLabel ?? "").split("+")) {
    const segment = rawSegment.trim();
    if (!segment) continue;

    const match = segment.match(/^(.*?)(?:\s*x(\d+))?$/i);
    const name = match?.[1]?.trim() ?? segment;
    const quantity = Number(match?.[2] ?? "1");
    if (!name) continue;

    counts[name] = (counts[name] ?? 0) + (Number.isFinite(quantity) && quantity > 0 ? quantity : 1);
  }

  return counts;
}

export function formatOptionLabelCounts(counts: OptionLabelCountMap): string | undefined {
  const segments = Object.entries(counts)
    .filter(([, count]) => count > 0)
    .map(([name, count]) => (count === 1 ? name : `${name} x${count}`));

  return segments.length > 0 ? segments.join(" + ") : undefined;
}
