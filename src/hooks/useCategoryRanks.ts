import { useMemo } from "react";
import { useQueries, useQuery } from "@tanstack/react-query";
import { computePlayerStats, fetchPlayerGameLog } from "../api/espn";
import {
    fetchLeague,
    fetchLeagueActuals,
    fetchMyRosterAtWeekEnd,
    type League,
    type LeagueActuals,
    type LeaguePlayer,
} from "../api/espnFantasy";
import { persistMeta } from "../queryPersist";
import { ESPN_SEASON, WEEKS } from "../types";
import type { EspnLeagueCredentials, PlayerEntry, PlayerGameLog, RosterScenario, StatLine, TimeWindow } from "../types";
import { playerPerGameLine, rankAll, sumLines, type CatRanks } from "../utils/categoryRanks";
import { createLimiter } from "../utils/limit";
import { compareScenario, planWeekSwap, scenarioFromRoster, type ScenarioComparison } from "../utils/scenario";
import { weekLineFromLog } from "../utils/weekStats";

const HOUR = 1000 * 60 * 60;
const limit = createLimiter(8);

export interface BacktestWeek {
    period: number;
    label: string;
    comparison: ScenarioComparison;
    droppedIds: string[];
    addedIds: string[];
    missingIds: string[];
}

export interface TeamStanding {
    id: number;
    name: string;
    line: StatLine;
    ranks: CatRanks;
}

export interface CategoryRanksData {
    isLoading: boolean;
    error: string | null;
    // loaded / total player game logs
    progress: { loaded: number; total: number };
    league: League | null;
    myTeamId: number | null;
    myRoster: LeaguePlayer[];
    // Head-to-Head roster as a swap from my ESPN roster, and the roster being edited (same
    // shape; equals `baseline` until the user edits it)
    baseline: RosterScenario;
    scenario: RosterScenario;
    projection: ScenarioComparison | null;
    standings: TeamStanding[];
    backtest: BacktestWeek[];
    // Players with no usable game log (excluded from totals)
    missingLogIds: string[];
}

export function useCategoryRanks(
    creds: EspnLeagueCredentials | null,
    timeWindow: TimeWindow,
    edited: RosterScenario | null,
    headToHead: PlayerEntry[],
): CategoryRanksData {
    const enabled = !!creds;
    const leagueKey = creds?.leagueId ?? "";

    const leagueQ = useQuery({
        queryKey: ["league", leagueKey, ESPN_SEASON, "current"],
        queryFn: () => fetchLeague(creds!),
        enabled,
        staleTime: 15 * 60 * 1000,
    });
    const actualsQ = useQuery({
        queryKey: ["leagueActuals", leagueKey, ESPN_SEASON],
        queryFn: () => fetchLeagueActuals(creds!),
        enabled,
        // Finished weeks never change, but a new week completes every Sunday night
        staleTime: HOUR,
        meta: persistMeta,
    });

    const league = leagueQ.data ?? null;
    const actuals: LeagueActuals | undefined = actualsQ.data;
    const myTeamId = league?.myTeamId ?? null;

    // Completed weeks, as app weeks (week N = ESPN matchup period N)
    const pastWeeks = useMemo(
        () => (actuals ? WEEKS.filter((w) => Number(w.key.replace(/\D/g, "")) < actuals.currentPeriod) : []),
        [actuals],
    );

    // Who was on my team when each past week ended. Immutable once the week is over.
    const rosterQs = useQueries({
        queries: pastWeeks.map((w) => ({
            queryKey: ["myRosterAtWeekEnd", leagueKey, ESPN_SEASON, w.key],
            queryFn: () => fetchMyRosterAtWeekEnd(creds!, w),
            enabled,
            staleTime: Infinity,
            meta: persistMeta,
        })),
    });

    const myTeam = league?.teams.find((t) => t.id === myTeamId);

    // "Current" is the Head-to-Head roster, expressed relative to my ESPN roster. With no
    // Head-to-Head roster there's nothing to compare against, so fall back to ESPN's.
    const baseline = useMemo<RosterScenario>(
        () =>
            myTeam && headToHead.length
                ? scenarioFromRoster(myTeam.players, headToHead)
                : { dropIds: [], adds: [] },
        [myTeam, headToHead],
    );
    const scenario = edited ?? baseline;

    // Every player whose log we need: all active players on all teams, plus anyone added
    const playerIds = useMemo(() => {
        const ids = new Set<string>();
        for (const t of league?.teams ?? []) for (const p of t.players) if (!p.isInjuredReserve) ids.add(p.espnId);
        for (const a of [...scenario.adds, ...baseline.adds]) ids.add(a.espnId);
        return [...ids];
    }, [league, scenario.adds, baseline.adds]);

    const logQs = useQueries({
        queries: playerIds.map((id) => ({
            queryKey: ["playerStats", id],
            queryFn: () => limit(() => fetchPlayerGameLog(id)),
            // Finished games never change, so only refetch occasionally to pick up new ones
            staleTime: 6 * HOUR,
            meta: persistMeta,
        })),
    });

    const logs = useMemo(() => {
        const m = new Map<string, PlayerGameLog>();
        playerIds.forEach((id, i) => {
            const d = logQs[i]?.data;
            if (d) m.set(id, d);
        });
        return m;
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [playerIds, logQs.map((q) => q.dataUpdatedAt).join(",")]);

    const settled = logQs.filter((q) => !q.isLoading).length;
    const missingLogIds = playerIds.filter((id, i) => !logQs[i]?.isLoading && !logs.has(id));

    const result = useMemo(() => {
        const empty = { projection: null, standings: [] as TeamStanding[], backtest: [] as BacktestWeek[] };
        if (!league || myTeamId == null) return empty;

        const perGame = (id: string): StatLine | undefined => {
            const log = logs.get(id);
            return log ? playerPerGameLine(computePlayerStats(log, timeWindow)) : undefined;
        };

        // ── Projection: per-game averages, summed over each team's active players
        const teamLines = new Map<number, StatLine>();
        for (const t of league.teams) {
            const ls = t.players.filter((p) => !p.isInjuredReserve).flatMap((p) => perGame(p.espnId) ?? []);
            teamLines.set(t.id, sumLines(ls));
        }
        const swapLines = (spec: RosterScenario) => ({
            dropLines: spec.dropIds.flatMap((id) => perGame(id) ?? []),
            addLines: spec.adds.flatMap((a) => perGame(a.espnId) ?? []),
        });
        const sc = swapLines(scenario);
        const projection = compareScenario(teamLines, myTeamId, sc.dropLines, sc.addLines, swapLines(baseline));

        const ids = league.teams.map((t) => t.id);
        const ranked = rankAll(ids.map((id) => teamLines.get(id)!));
        const standings = league.teams.map((t, i) => ({
            id: t.id,
            name: t.name,
            line: teamLines.get(t.id)!,
            ranks: ranked[i],
        }));

        // ── Backtest: actual weekly totals, with the swap applied at the player level
        const backtest: BacktestWeek[] = [];
        pastWeeks.forEach((w, i) => {
            const period = Number(w.key.replace(/\D/g, ""));
            const actualByTeam = actuals?.byPeriod[period];
            const roster = rosterQs[i]?.data;
            if (!actualByTeam || !roster) return;
            const lines = new Map(Object.entries(actualByTeam).map(([id, l]) => [Number(id), l]));

            const onRoster = new Set(roster.playerIds);
            const weekLine = (id: string) => weekLineFromLog(logs.get(id)!, w.start, w.end).line;
            const swapFor = (spec: RosterScenario) => {
                const swap = planWeekSwap(spec.dropIds, spec.adds.map((a) => a.espnId), onRoster, (id) => logs.has(id));
                return {
                    swap,
                    lines: { dropLines: swap.droppedIds.map(weekLine), addLines: swap.addedIds.map(weekLine) },
                };
            };
            const sw = swapFor(scenario);
            const base = swapFor(baseline);
            const swap = { ...sw.swap, missingIds: [...new Set([...sw.swap.missingIds, ...base.swap.missingIds])] };
            const comparison = compareScenario(lines, myTeamId, sw.lines.dropLines, sw.lines.addLines, base.lines);
            if (comparison) backtest.push({ period, label: `Wk ${period}`, comparison, ...swap });
        });

        return { projection, standings, backtest };
    }, [league, myTeamId, logs, timeWindow, scenario, baseline, pastWeeks, actuals, rosterQs.map((q) => q.dataUpdatedAt).join(",")]);

    const firstError = [leagueQ, actualsQ].find((q) => q.error)?.error;

    return {
        isLoading: leagueQ.isLoading || actualsQ.isLoading || rosterQs.some((q) => q.isLoading),
        error: firstError ? (firstError instanceof Error ? firstError.message : String(firstError)) : null,
        progress: { loaded: settled, total: playerIds.length },
        league,
        myTeamId,
        myRoster: myTeam?.players ?? [],
        baseline,
        scenario,
        missingLogIds,
        ...result,
    };
}
