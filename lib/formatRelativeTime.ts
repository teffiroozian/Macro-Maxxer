export function formatRelativeTime(timestamp: number, now = Date.now()): string {
    const elapsed = Math.max(0, now - timestamp);
    if (elapsed < 60000)
        return "Just now";
    if (elapsed < 3600000)
        return `${Math.floor(elapsed / 60000)}m ago`;
    const date = new Date(timestamp);
    const today = new Date(now);
    if (date.toDateString() === today.toDateString())
        return `${Math.floor(elapsed / 3600000)}h ago`;
    const yesterday = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1);
    if (date.toDateString() === yesterday.toDateString())
        return "Yesterday";
    const days = Math.round((Date.UTC(today.getFullYear(), today.getMonth(), today.getDate()) - Date.UTC(date.getFullYear(), date.getMonth(), date.getDate())) / 86400000);
    if (days < 7)
        return `${days}d ago`;
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}
