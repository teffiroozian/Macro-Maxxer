"use client";
import { useEffect, useState } from "react";
import { readHistory } from "./browsingHistory";
export function useBrowsingHistory() {
    const [history, setHistory] = useState<ReturnType<typeof readHistory>>({ version: 1, entries: [], visits: [] });
    useEffect(() => {
        const update = () => setHistory(readHistory());
        const timer = window.setTimeout(update, 0);
        const storage = (event: StorageEvent) => { if (!event.key || event.key === "macro-maxxer:history")
            update(); };
        window.addEventListener("storage", storage);
        window.addEventListener("macro-maxxer:history-change", update);
        return () => { window.clearTimeout(timer); window.removeEventListener("storage", storage); window.removeEventListener("macro-maxxer:history-change", update); };
    }, []);
    return history;
}
