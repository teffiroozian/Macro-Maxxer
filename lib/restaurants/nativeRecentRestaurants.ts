export const NATIVE_RECENT_RESTAURANTS_KEY = "nativeRecentRestaurants";
const LEGACY_KEY = "recentlySearchedRestaurants";
export const NATIVE_RECENT_RESTAURANTS_MAX = 10;

export type NativeRecentRestaurant = { id: string; viewedAt: number | null };

function parseJson(raw: string | null): unknown {
  try { return JSON.parse(raw ?? "null"); } catch { return null; }
}

export function addNativeRecentRestaurant(
  list: NativeRecentRestaurant[],
  id: string,
  now = Date.now(),
): NativeRecentRestaurant[] {
  return [{ id, viewedAt: now }, ...list.filter((entry) => entry.id !== id)].slice(0, NATIVE_RECENT_RESTAURANTS_MAX);
}

export function readNativeRecentRestaurants(): NativeRecentRestaurant[] {
  try {
    const stored = window.localStorage.getItem(NATIVE_RECENT_RESTAURANTS_KEY);
    if (stored !== null) {
      const data = parseJson(stored);
      if (!Array.isArray(data)) return [];
      const seen = new Set<string>();
      return data
        .filter((v): v is NativeRecentRestaurant => !!v && typeof v.id === "string" && (v.viewedAt === null || typeof v.viewedAt === "number"))
        .filter((v) => (seen.has(v.id) ? false : (seen.add(v.id), true)))
        .slice(0, NATIVE_RECENT_RESTAURANTS_MAX);
    }
    const legacy = parseJson(window.localStorage.getItem(LEGACY_KEY));
    if (!Array.isArray(legacy)) return [];
    return legacy
      .filter((id): id is string => typeof id === "string" && !!id)
      .map((id) => ({ id, viewedAt: null }));
  } catch {
    return [];
  }
}

export function recordNativeRecentRestaurant(id: string) {
  try {
    window.localStorage.setItem(
      NATIVE_RECENT_RESTAURANTS_KEY,
      JSON.stringify(addNativeRecentRestaurant(readNativeRecentRestaurants(), id)),
    );
  } catch {
    // Ignore localStorage errors.
  }
}
