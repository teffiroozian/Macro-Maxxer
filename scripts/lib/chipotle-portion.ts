const PORTION_PARTS_PATTERN =
  /^(\d+(?:\.\d+)?)\s*(fl\s*oz|oz|ea|g|ml)$/i;

export interface PortionCell {
  raw: string;
  amount: number | null;
  unit: string | null;
}

export function normalizePortionCell(raw: string): PortionCell {
  const trimmed = raw.trim();
  const match = trimmed.match(PORTION_PARTS_PATTERN);

  if (!match) {
    return { raw: trimmed, amount: null, unit: null };
  }

  return {
    raw: trimmed,
    amount: Number(match[1]),
    unit: match[2].replace(/\s+/g, " ").toLowerCase(),
  };
}
