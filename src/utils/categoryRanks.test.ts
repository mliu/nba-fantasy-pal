import { describe, expect, it } from "vitest";
import {
    EMPTY_LINE,
    lineToCats,
    rankAgainst,
    rankAll,
    rankDelta,
    summarize,
    swapPlayers,
    sumLines,
} from "./categoryRanks";
import type { StatLine } from "../types";

const line = (o: Partial<StatLine>): StatLine => ({ ...EMPTY_LINE, ...o });

describe("lineToCats", () => {
    it("computes percentages from makes/attempts", () => {
        const c = lineToCats(line({ fgm: 45, fga: 100, ftm: 8, fta: 10 }));
        expect(c.fgPct).toBeCloseTo(0.45);
        expect(c.ftPct).toBeCloseTo(0.8);
    });
    it("returns 0 for no attempts", () => {
        expect(lineToCats(EMPTY_LINE).fgPct).toBe(0);
    });
});

describe("sumLines", () => {
    it("weights percentages by volume, not by averaging", () => {
        const total = sumLines([line({ fgm: 9, fga: 10 }), line({ fgm: 10, fga: 40 })]);
        expect(lineToCats(total).fgPct).toBeCloseTo(19 / 50);
    });
});

describe("rankAgainst", () => {
    const others = [line({ pts: 100, to: 10 }), line({ pts: 90, to: 20 }), line({ pts: 80, to: 5 })];

    it("ranks higher-is-better categories descending", () => {
        const r = rankAgainst(line({ pts: 95 }), others);
        expect(r.pts.rank).toBe(2);
        expect(r.pts.gapUp).toBe(5); // need 5 more to pass 100
        expect(r.pts.gapDown).toBe(5); // lead 90 by 5
    });

    it("ranks turnovers ascending (fewer is better)", () => {
        const r = rankAgainst(line({ to: 8 }), others);
        expect(r.to.rank).toBe(2); // only 5 beats 8
        expect(r.to.gapUp).toBe(3); // 3 fewer TO to pass 5
        expect(r.to.gapDown).toBe(2); // 10 − 8
    });

    it("gives null gaps at the extremes", () => {
        const r = rankAgainst(line({ pts: 200 }), others);
        expect(r.pts.rank).toBe(1);
        expect(r.pts.gapUp).toBeNull();
        const last = rankAgainst(line({ pts: 1 }), others);
        expect(last.pts.rank).toBe(4);
        expect(last.pts.gapDown).toBeNull();
    });

    it("ties share the better rank", () => {
        const r = rankAgainst(line({ pts: 90 }), others);
        expect(r.pts.rank).toBe(2);
    });
});

describe("rankAll", () => {
    it("ranks each team against the rest", () => {
        const all = rankAll([line({ pts: 3 }), line({ pts: 1 }), line({ pts: 2 })]);
        expect(all.map((r) => r.pts.rank)).toEqual([1, 3, 2]);
    });
});

describe("swapPlayers", () => {
    it("subtracts drops and adds adds, recomputing percentages from volume", () => {
        const team = line({ pts: 100, fgm: 40, fga: 100 });
        const drop = line({ pts: 20, fgm: 10, fga: 15 });
        const add = line({ pts: 10, fgm: 6, fga: 10 });
        const out = swapPlayers(team, [drop], [add]);
        expect(out.pts).toBe(90);
        expect(lineToCats(out).fgPct).toBeCloseTo(36 / 95);
    });
    it("is a no-op with no swaps", () => {
        const team = line({ pts: 5 });
        expect(swapPlayers(team, [], [])).toEqual(team);
    });
});

describe("rankDelta / summarize", () => {
    it("reports improvement as positive and totals roto points", () => {
        const others = [line({ pts: 100 }), line({ pts: 90 })];
        const before = rankAgainst(line({ pts: 80 }), others);
        const after = rankAgainst(line({ pts: 95 }), others);
        expect(rankDelta(before, after).pts).toBe(1);
        // 3-team league: rank 2 in pts → 2 pts; rank 1 → 3 pts
        const b = summarize(before, 3).points;
        const a = summarize(after, 3).points;
        expect(a - b).toBe(1);
    });
});
