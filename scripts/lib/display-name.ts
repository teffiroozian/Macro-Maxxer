// Official restaurant names can contain HTML intended for the source site's
// renderer. Runtime display fields use plain text, while source provenance
// retains the untouched input string.
export function sanitizeDisplayName(raw: string): string {
  return raw
    .normalize("NFKC")
    .replace(/<[^>]*>/g, "")
    .replace(/&(#x[0-9a-fA-F]+|#\d+|[a-zA-Z]+);/g, (match, entity: string) => {
      const named: Record<string, string> = {
        amp: "&",
        lt: "<",
        gt: ">",
        quot: '"',
        apos: "'",
        nbsp: " ",
        reg: "®",
        trade: "™",
        copy: "©",
      };
      if (named[entity]) return named[entity];
      if (entity.startsWith("#x")) {
        const code = Number.parseInt(entity.slice(2), 16);
        return Number.isFinite(code) ? String.fromCodePoint(code) : match;
      }
      if (entity.startsWith("#")) {
        const code = Number.parseInt(entity.slice(1), 10);
        return Number.isFinite(code) ? String.fromCodePoint(code) : match;
      }
      return match;
    })
    .replace(/\s+/g, " ")
    .trim();
}
