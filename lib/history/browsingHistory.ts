export const HISTORY_STORAGE_KEY = "macro-maxxer:history";
export type HistoryEntry = {
    restaurantId: string;
    kind: "menu-item" | "builder-entree";
    refId: string;
    viewedAt: number;
};
type Visit = {
    restaurantId: string;
    visitedAt: number;
};
type History = {
    version: 1;
    entries: HistoryEntry[];
    visits: Visit[];
};
const empty = (): History => ({ version: 1, entries: [], visits: [] });
const validTime = (value: unknown): value is number => typeof value === "number" && Number.isFinite(value) && value >= 0;
const identity = (entry: HistoryEntry) => `${entry.kind}:${entry.restaurantId}:${entry.refId}`;
export function readHistory(): History {
    if (typeof window === "undefined")
        return empty();
    try {
        const raw = window.localStorage.getItem(HISTORY_STORAGE_KEY);
        if (raw) {
            const data = JSON.parse(raw);
            if (data?.version !== 1)
                return empty();
            const entries: HistoryEntry[] = Array.isArray(data.entries) ? data.entries.filter((e: HistoryEntry) => e && typeof e.restaurantId === "string" && typeof e.refId === "string" && ["menu-item", "builder-entree"].includes(e.kind) && validTime(e.viewedAt)) : [];
            const visits: Visit[] = Array.isArray(data.visits) ? data.visits.filter((v: Visit) => v && typeof v.restaurantId === "string" && validTime(v.visitedAt)) : [];
            return { version: 1, entries: entries.sort((a, b) => b.viewedAt - a.viewedAt).filter((e, i, a) => a.findIndex(v => identity(v) === identity(e)) === i).slice(0, 40), visits: visits.sort((a, b) => b.visitedAt - a.visitedAt).filter((v, i, a) => a.findIndex(e => e.restaurantId === v.restaurantId) === i).slice(0, 10) };
        }
        const legacy = JSON.parse(window.localStorage.getItem("recentlySearchedRestaurants") ?? "[]");
        const seeded = { ...empty(), visits: Array.isArray(legacy) ? legacy.filter((id): id is string => typeof id === "string" && !!id).slice(0, 10).map((restaurantId, i) => ({ restaurantId, visitedAt: Date.now() - i })) : [] };
        window.localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(seeded));
        return seeded;
    }
    catch {
        return empty();
    }
}
function write(data: History) {
    try {
        window.localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(data));
    }
    catch { /* Storage is optional. */ }
    window.dispatchEvent(new Event("macro-maxxer:history-change"));
}
export function recordView(entry: Omit<HistoryEntry, "viewedAt">) {
    const data = readHistory();
    const next = { ...entry, viewedAt: Date.now() };
    data.entries = [next, ...data.entries.filter(e => identity(e) !== identity(next))].slice(0, 40);
    write(data);
}
export function recordRestaurantVisit(restaurantId: string) {
    const data = readHistory();
    data.visits = [{ restaurantId, visitedAt: Date.now() }, ...data.visits.filter(v => v.restaurantId !== restaurantId)].slice(0, 10);
    write(data);
}
export function recentRestaurants(data: History, max = 3) {
    const times = new Map(data.visits.map(v => [v.restaurantId, v.visitedAt]));
    for (const e of data.entries)
        times.set(e.restaurantId, Math.max(times.get(e.restaurantId) ?? 0, e.viewedAt));
    return [...times].sort((a, b) => b[1] - a[1]).slice(0, max).map(([restaurantId, lastViewedAt]) => ({ restaurantId, lastViewedAt, entries: data.entries.filter(e => e.restaurantId === restaurantId) }));
}
export const getRecentRestaurants = (max = 3) => recentRestaurants(readHistory(), max);
export const getRecentItems = (max = 8) => readHistory().entries.filter(e => e.kind === "menu-item").slice(0, max);
