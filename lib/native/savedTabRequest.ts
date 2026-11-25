import type { SavedTab } from "@/lib/native/savedLibrary";

// Lets another page choose which tab Saved opens on next.
let requested: SavedTab = "meals";

export const requestSavedTab = (tab: SavedTab) => { requested = tab; };
export const requestedSavedTab = () => requested;
