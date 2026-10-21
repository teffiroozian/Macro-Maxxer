export function isMobileExportBrowser() {
  return /Android|iPhone|iPad|iPod/i.test(navigator.userAgent)
    // iPadOS can advertise a desktop user agent.
    || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
}

export function pngDataUrlToFile(dataUrl: string, filename: string) {
  const bytes = Uint8Array.from(atob(dataUrl.split(",")[1]), (character) => character.charCodeAt(0));
  return new File([bytes], filename, { type: "image/png" });
}

export function canSharePng(file: File) {
  try {
    return typeof navigator.share === "function"
      && typeof navigator.canShare === "function"
      && navigator.canShare({ files: [file] });
  } catch {
    return false;
  }
}

// Call directly from a click handler with an already generated file. Do not
// await rendering/fetching here: Safari's transient activation can expire.
export async function sharePng(file: File) {
  if (!canSharePng(file)) return "unsupported";
  try {
    await navigator.share({ files: [file] });
    return "shared";
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") return "cancelled";
    throw error;
  }
}
