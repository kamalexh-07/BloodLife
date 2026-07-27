/**
 * Normalize a person's display name:
 * - Trims and collapses whitespace
 * - Drops consecutive tokens that match case-insensitively (e.g. "kamalesh KAMALESH" → "Kamalesh")
 * - Title-cases each remaining token
 * Does not invent missing middle/last names — only cleans what was stored.
 */
function formatPersonName(raw) {
  const parts = String(raw || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  const deduped = [];
  for (const part of parts) {
    const lower = part.toLowerCase();
    if (deduped.length && deduped[deduped.length - 1].toLowerCase() === lower) {
      continue;
    }
    // Preserve hyphenated / apostrophe parts: mary-jane → Mary-Jane
    const titled = part
      .split(/([-'])/)
      .map((seg) => {
        if (seg === "-" || seg === "'") return seg;
        if (!seg) return seg;
        return seg.charAt(0).toUpperCase() + seg.slice(1).toLowerCase();
      })
      .join("");
    deduped.push(titled);
  }

  return deduped.join(" ");
}

module.exports = { formatPersonName };
