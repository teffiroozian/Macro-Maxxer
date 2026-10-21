import Link from "next/link";
import type { ReactNode } from "react";
import { useGlobalItemPreview } from "@/components/GlobalItemPreviewContext";
import type { resolveHistoryEntry } from "./historyPresentation";
type Resolved = NonNullable<ReturnType<typeof resolveHistoryEntry>>;
// Native exports deliberately omit item routes. Use the same local detail
// preview as native menu/search selections; builder routes remain links.
export default function HistoryItemLink({ entry, children, className, label }: {
    entry: Resolved;
    children: ReactNode;
    className: string;
    label: string;
}) {
    const { openPreview } = useGlobalItemPreview();
    return entry.item ? <button type="button" onClick={() => void openPreview(entry.restaurant.id, entry.item!)} aria-label={label} className={`cursor-pointer text-left ${className}`}>{children}</button> : <Link href={entry.href} aria-label={label} className={className}>{children}</Link>;
}
