import type { PlayerStats, StatLine } from "../types";

// The nine categories, in Lineup Experts' column order
export type CatKey = "fgPct" | "threePM" | "ftPct" | "pts" | "reb" | "ast" | "stl" | "blk" | "to";

export const CATEGORIES: { key: CatKey; label: string; higherBetter: boolean; isRate: boolean }[] = [
    { key: "fgPct", label: "FG%", higherBetter: true, isRate: true },
    { key: "threePM", label: "3PM", higherBetter: true, isRate: false },
    { key: "ftPct", label: "FT%", higherBetter: true, isRate: true },
    { key: "pts", label: "PTS", higherBetter: true, isRate: false },
    { key: "reb", label: "REB", higherBetter: true, isRate: false },
    { key: "ast", label: "AST", higherBetter: true, isRate: false },
    { key: "stl", label: "STL", higherBetter: true, isRate: false },
    { key: "blk", label: "BLK", higherBetter: true, isRate: false },
    { key: "to", label: "TO", higherBetter: false, isRate: false },
];

export type CatTotals = Record<CatKey, number>;

export interface CatRank {
    value: number;
    // 1 = best. Ties share the better rank.
    rank: number;
    // Amount to gain to pass the next team up / lead over the next team down, in the category's
    // own units (null if already first / last). "Gain" means more for most cats, fewer for TO.
    gapUp: number | null;
    gapDown: number | null;
}

export type CatRanks = Record<CatKey, CatRank>;

export const EMPTY_LINE: StatLine = {
    min: 0, pts: 0, reb: 0, ast: 0, stl: 0, blk: 0, to: 0,
    threePM: 0, fgm: 0, fga: 0, ftm: 0, fta: 0,
};

const LINE_KEYS = Object.keys(EMPTY_LINE) as (keyof StatLine)[];

export function sumLines(lines: StatLine[]): StatLine {
    const out = { ...EMPTY_LINE };
    for (const l of lines) for (const k of LINE_KEYS) out[k] += l[k];
    return out;
}

// Raw per-game stats (as averaged by computePlayerStats) → a StatLine
export function playerPerGameLine(s: PlayerStats): StatLine {
    return {
        min: s.min, pts: s.pts, reb: s.reb, ast: s.ast, stl: s.stl, blk: s.blk, to: s.to,
        threePM: s.threePM, fgm: s.fgm, fga: s.fga, ftm: s.ftm, fta: s.fta,
    };
}

// Percentages come from summed makes/attempts, never from averaging percentages
export function lineToCats(l: StatLine): CatTotals {
    return {
        fgPct: l.fga > 0 ? l.fgm / l.fga : 0,
        threePM: l.threePM,
        ftPct: l.fta > 0 ? l.ftm / l.fta : 0,
        pts: l.pts,
        reb: l.reb,
        ast: l.ast,
        stl: l.stl,
        blk: l.blk,
        to: l.to,
    };
}

/** team − dropped players + added players, on raw lines so percentages recompute correctly */
export function swapPlayers(team: StatLine, drops: StatLine[], adds: StatLine[]): StatLine {
    const out = { ...team };
    for (const k of LINE_KEYS) {
        out[k] += adds.reduce((s, l) => s + l[k], 0) - drops.reduce((s, l) => s + l[k], 0);
    }
    return out;
}

// Floating-point noise shouldn't break ties between identical totals
const EPS = 1e-9;

function rankOne(value: number, others: number[], higherBetter: boolean): CatRank {
    const sign = higherBetter ? 1 : -1;
    // positive = other team is better than me
    const diffs = others.map((o) => (o - value) * sign);
    const rank = 1 + diffs.filter((d) => d > EPS).length;
    const better = diffs.filter((d) => d > EPS);
    const worse = diffs.filter((d) => d < -EPS);
    return {
        value,
        rank,
        gapUp: better.length ? Math.min(...better) : null,
        gapDown: worse.length ? -Math.max(...worse) : null,
    };
}

/** Ranks one team's totals against the rest of the league (`others` excludes the team itself) */
export function rankAgainst(mine: StatLine, others: StatLine[]): CatRanks {
    const m = lineToCats(mine);
    const o = others.map(lineToCats);
    const out = {} as CatRanks;
    for (const c of CATEGORIES) {
        out[c.key] = rankOne(m[c.key], o.map((t) => t[c.key]), c.higherBetter);
    }
    return out;
}

/** Ranks every team against all the others. Result order matches `teams`. */
export function rankAll(teams: StatLine[]): CatRanks[] {
    return teams.map((t, i) => rankAgainst(t, teams.filter((_, j) => j !== i)));
}

export interface RankSummary {
    // Roto-style points: league size − rank + 1 per category, summed
    points: number;
    avgRank: number;
}

export function summarize(ranks: CatRanks, leagueSize: number): RankSummary {
    const rs = CATEGORIES.map((c) => ranks[c.key].rank);
    return {
        points: rs.reduce((s, r) => s + (leagueSize - r + 1), 0),
        avgRank: rs.reduce((s, r) => s + r, 0) / rs.length,
    };
}

/** Rank movement per category: positive = improved (moved toward 1st) */
export function rankDelta(before: CatRanks, after: CatRanks): Record<CatKey, number> {
    const out = {} as Record<CatKey, number>;
    for (const c of CATEGORIES) out[c.key] = before[c.key].rank - after[c.key].rank;
    return out;
}
