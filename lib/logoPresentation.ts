// Logos are brand artwork, not theme surfaces. Keep this literal in sync
// with .logo-surface for renderers (such as Satori) that cannot load CSS.
export const LOGO_BACKGROUND = "#FFFFFF";

export function isLogoImage(src: string | undefined): boolean {
  if (!src) return false;
  return /(?:^|\/)logo\.(?:svg|png|jpe?g|webp)(?:[?#].*)?$/i.test(src);
}
