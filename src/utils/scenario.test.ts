import { describe, expect, it } from "vitest";
import { compareScenario, planWeekSwap, scenarioFromRoster } from "./scenario";
import { EMPTY_LINE } from "./categoryRanks";
import { weekLineFromLog, gameDayET } from "./weekStats";
import type { PlayerGame, StatLine } from "../types";

const line = (o: Partial<StatLine>): StatLine => ({ ...EMPTY_LINE, ...o });

describe("compareScenario", () => {
    const lines = new Map<number, StatLine>([
        [1, line({ pts: 80 })],
        [2, line({ pts: 100 })],
        [3, line({ pts: 90 })],
    ]);
    it("re-ranks my team after the swap, leaving others untouched", () => {
        const r = compareScenario(lines, 1, [line({ pts: 5 })], [line({ pts: 25 })])!;
        expect(r.current.ranks.pts.rank).toBe(3);
        expect(r.scenario.line.pts).toBe(100);
        expect(r.scenario.ranks.pts.rank).toBe(1); // tie with 100 shares the better rank
    });
    it("uses a baseline swap for the current side, so an unedited scenario shows no change", () => {
        const base = { dropLines: [line({ pts: 20 })], addLines: [] as StatLine[] };
        const same = compareScenario(lines, 1, base.dropLines, base.addLines, base)!;
        expect(same.current.line.pts).toBe(60);
        expect(same.scenario.line).toEqual(same.current.line);
        // editing further (also adding a 30-pt player) is measured against the baseline
        const edited = compareScenario(lines, 1, base.dropLines, [line({ pts: 30 })], base)!;
        expect(edited.current.line.pts).toBe(60);
        expect(edited.scenario.line.pts).toBe(90);
    });
    it("returns null when my team isn't in the data", () => {
        expect(compareScenario(lines, 9, [], [])).toBeNull();
    });
});

describe("planWeekSwap", () => {
    const has = () => true;
    it("ignores drops who weren't on the roster and adds already on it", () => {
        const r = planWeekSwap(["a", "b"], ["c", "d"], new Set(["a", "d"]), has);
        expect(r.droppedIds).toEqual(["a"]);
        expect(r.addedIds).toEqual(["c"]);
    });
    it("reports players without a game log", () => {
        const r = planWeekSwap(["a"], ["c"], new Set(["a"]), (id) => id !== "c");
        expect(r.missingIds).toEqual(["c"]);
        expect(r.addedIds).toEqual([]);
    });
});

describe("weekLineFromLog", () => {
    const game = (gameDate: string, pts: number): PlayerGame => ({
        eventId: gameDate, gameDate, min: 30, pts, reb: 0, ast: 0, stl: 0, blk: 0, to: 0,
        fgm: 0, fga: 0, tpm: 0, ftm: 0, fta: 0,
    });
    it("buckets games by Eastern calendar day, not UTC", () => {
        // 10:30pm ET Sunday is already Monday in UTC
        expect(gameDayET("2026-11-23T03:30:00Z")).toBe("2026-11-22");
        const log = {
            teamId: "1",
            games: [game("2026-11-23T03:30:00Z", 10), game("2026-11-24T00:00:00Z", 20), game("2026-11-30T01:00:00Z", 40)],
        };
        const r = weekLineFromLog(log, new Date(2026, 10, 16), new Date(2026, 10, 22, 23, 59, 59));
        expect(r.games).toBe(1);
        expect(r.line.pts).toBe(10);
    });
});

describe("scenarioFromRoster", () => {
    const espn = [
        { espnId: "a", isInjuredReserve: false },
        { espnId: "b", isInjuredReserve: false },
        { espnId: "ir", isInjuredReserve: true },
    ];
    const p = (espnId: string) => ({ espnId, name: espnId, teamId: "1", teamAbbr: "X" });
    it("drops active players missing from the edited roster and adds new ones", () => {
        const s = scenarioFromRoster(espn, [p("a"), p("c")]);
        expect(s.dropIds).toEqual(["b"]);
        expect(s.adds.map((x) => x.espnId)).toEqual(["c"]);
    });
    it("never drops IR players and doesn't treat an owned IR player as an add", () => {
        const s = scenarioFromRoster(espn, [p("a"), p("b"), p("ir")]);
        expect(s).toEqual({ dropIds: [], adds: [] });
        expect(scenarioFromRoster(espn, [p("a"), p("b")]).dropIds).toEqual([]);
    });
});
