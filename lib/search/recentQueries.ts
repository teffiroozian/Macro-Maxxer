export const RECENT_QUERIES_KEY = "macro-maxxer:recent-queries";
export function readRecentQueries(): string[] {
    try {
        const data = JSON.parse(window.localStorage.getItem(RECENT_QUERIES_KEY) ?? "[]");
        return Array.isArray(data) ? data.filter((q): q is string => typeof q === "string").map(q => q.trim()).filter((q, i, a) => q.length >= 2 && a.findIndex(v => v.toLowerCase() === q.toLowerCase()) === i).slice(0, 5) : [];
    }
    catch {
        return [];
    }
}
export function recordQuery(query: string) {
    const term = query.trim();
    if (term.length < 2)
        return;
    try {
        window.localStorage.setItem(RECENT_QUERIES_KEY, JSON.stringify([term, ...readRecentQueries().filter(q => q.toLowerCase() !== term.toLowerCase())].slice(0, 5)));
    }
    catch { /* Storage is optional. */ }
    window.dispatchEvent(new Event("macro-maxxer:queries-change"));
}
function writeRecentQueries(queries: string[]) {
    try {
        window.localStorage.setItem(RECENT_QUERIES_KEY, JSON.stringify(queries));
    }
    catch { /* Storage is optional. */ }
    window.dispatchEvent(new Event("macro-maxxer:queries-change"));
}
export function removeQuery(query: string) {
    writeRecentQueries(readRecentQueries().filter(q => q.toLowerCase() !== query.trim().toLowerCase()));
}
export function clearQueries() {
    writeRecentQueries([]);
}
