/**
 * Extract player names from text pasted from an ESPN fantasy team page.
 *
 * ESPN renders each player's name twice back to back (headshot alt text + link text),
 * so a copied row contains a line like "Terrence Shannon Jr.Terrence Shannon Jr."
 * followed by the plain name. A line made of the same string repeated twice is a
 * reliable marker that works for any name (suffixes, numerals, hyphens, apostrophes)
 * without needing to know what the surrounding columns look like.
 *
 * If nothing matches that pattern, fall back to treating each line (or comma-separated
 * item) as a name, so a hand-typed list also works.
 */
export function parseRosterNames(text: string): string[] {
    const lines = text
        .split(/\r?\n/)
        .map((l) => l.trim())
        .filter(Boolean);

    const names: string[] = [];
    for (const line of lines) {
        if (line.length % 2 !== 0) continue;
        const half = line.slice(0, line.length / 2);
        if (half.length >= 3 && half === line.slice(line.length / 2)) {
            names.push(half.trim());
        }
    }

    if (names.length === 0) {
        for (const item of lines.flatMap((l) => l.split(","))) {
            const t = item.trim();
            if (/^[\p{L}][\p{L}.'’\- ]*[\p{L}.]$/u.test(t) && t.includes(" ")) {
                names.push(t);
            }
        }
    }

    return [...new Set(names)];
}
