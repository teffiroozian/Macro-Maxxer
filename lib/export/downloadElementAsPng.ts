import { toPng } from "html-to-image";
import { EXPORT_HEIGHT, EXPORT_WIDTH } from "@/lib/export/dimensions";

async function waitForImages(element: HTMLElement) {
  const images = Array.from(element.querySelectorAll("img"));
  await Promise.all(
    images.map(async (image) => {
      // The export node sits far off-screen, so lazy images (next/image's
      // default) would never start loading and this wait would hang.
      image.loading = "eager";

      if (!image.complete) {
        await new Promise<void>((resolve) => {
          image.addEventListener("load", () => resolve(), { once: true });
          image.addEventListener("error", () => resolve(), { once: true });
        });
      }

      if (typeof image.decode === "function") {
        await image.decode().catch(() => undefined);
      }
    }),
  );
}

function downloadDataUrl(dataUrl: string, filename: string) {
  const link = document.createElement("a");
  link.download = filename;
  link.href = dataUrl;
  document.body.appendChild(link);
  link.click();
  link.remove();
}

async function assertPngDimensions(dataUrl: string) {
  const image = new Image();
  await new Promise<void>((resolve, reject) => {
    image.onload = () => resolve();
    image.onerror = () => reject(new Error("The generated PNG could not be decoded."));
    image.src = dataUrl;
  });

  if (image.naturalWidth !== EXPORT_WIDTH || image.naturalHeight !== EXPORT_HEIGHT) {
    throw new Error(
      `The generated PNG measured ${image.naturalWidth} × ${image.naturalHeight}; expected ${EXPORT_WIDTH} × ${EXPORT_HEIGHT}.`,
    );
  }
}

export function getExportPngFilename(name: string) {
  const slug = name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

  return `macro-maxxer-${slug || "order"}.png`;
}

export async function downloadElementAsPng(element: HTMLElement, filename: string) {
  await document.fonts?.ready;
  await waitForImages(element);

  if (element.offsetWidth !== EXPORT_WIDTH || element.offsetHeight !== EXPORT_HEIGHT) {
    throw new Error(`The export card must render at ${EXPORT_WIDTH} × ${EXPORT_HEIGHT}.`);
  }

  const dataUrl = await toPng(element, {
    cacheBust: true,
    // The dedicated export node already lays out at the native 1080px CSS
    // width. Keeping layout and bitmap scaling independent prevents the
    // right-edge crop caused by resizing a narrow preview during capture.
    pixelRatio: 1,
    width: EXPORT_WIDTH,
    height: EXPORT_HEIGHT,
    canvasWidth: EXPORT_WIDTH,
    canvasHeight: EXPORT_HEIGHT,
    backgroundColor: "#17120f",
  });

  await assertPngDimensions(dataUrl);
  downloadDataUrl(dataUrl, filename);
}
