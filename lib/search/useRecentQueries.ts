"use client";
import { useEffect, useState } from "react";
import { readRecentQueries } from "./recentQueries";
export function useRecentQueries() {
    const [queries, setQueries] = useState<string[]>([]);
    useEffect(() => {
        const update = () => setQueries(readRecentQueries());
        const timer = window.setTimeout(update, 0);
        window.addEventListener("storage", update);
        window.addEventListener("macro-maxxer:queries-change", update);
        return () => { window.clearTimeout(timer); window.removeEventListener("storage", update); window.removeEventListener("macro-maxxer:queries-change", update); };
    }, []);
    return queries;
}
