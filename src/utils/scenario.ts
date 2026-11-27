import type { CatRanks } from "./categoryRanks";
import { rankAgainst, swapPlayers } from "./categoryRanks";
import type { RosterScenario, StatLine } from "../types";

export interface RankedLine {
    line: StatLine;
    ranks: CatRanks;
}

export interface ScenarioComparison {
    current: RankedLine;
    scenario: RankedLine;
}

export interface SwapLines {
    dropLines: StatLine[];
    addLines: StatLine[];
}

/**
 * Ranks two versions of my team against everyone else. `lines` holds every team's totals
 * (projected or actual) keyed by team id, mine included. Both versions are expressed as swaps
 * relative to my team's line: `current` is `base` (default: no swap), `scenario` is the swap given.
 */
export function compareScenario(
    lines: Map<number, StatLine>,
    myTeamId: number,
    dropLines: StatLine[],
    addLines: StatLine[],
    base?: SwapLines,
): ScenarioComparison | null {
    const team = lines.get(myTeamId);
    if (!team) return null;
    const mine = base ? swapPlayers(team, base.dropLines, base.addLines) : team;
    const others = [...lines.entries()].filter(([id]) => id !== myTeamId).map(([, l]) => l);
    const scenarioLine = swapPlayers(team, dropLines, addLines);
    return {
        current: { line: mine, ranks: rankAgainst(mine, others) },
        scenario: { line: scenarioLine, ranks: rankAgainst(scenarioLine, others) },
    };
}

export interface WeekSwap {
    // Players whose actual stats that week were subtracted / added
    droppedIds: string[];
    addedIds: string[];
    // Players we needed but had no game log for
    missingIds: string[];
}

/**
 * Backtest inputs for one completed week. A drop only counts if the player was on my roster at the
 * end of that week (otherwise there is nothing to remove); an add is skipped if he was already there.
 */
export function planWeekSwap(
    dropIds: string[],
    addIds: string[],
    rosterAtWeekEnd: Set<string>,
    hasLog: (id: string) => boolean,
): WeekSwap {
    const drops = dropIds.filter((id) => rosterAtWeekEnd.has(id));
    const adds = addIds.filter((id) => !rosterAtWeekEnd.has(id));
    const missingIds = [...drops, ...adds].filter((id) => !hasLog(id));
    return {
        droppedIds: drops.filter((id) => hasLog(id)),
        addedIds: adds.filter((id) => hasLog(id)),
        missingIds,
    };
}

/**
 * The scenario that turns my real ESPN roster into a hand-edited roster (e.g. the Head-to-Head
 * list): drops = active ESPN players missing from it, adds = players in it that I don't own.
 */
export function scenarioFromRoster(
    espnRoster: { espnId: string; isInjuredReserve: boolean }[],
    edited: { espnId: string; name: string; teamId: string; teamAbbr: string }[],
): RosterScenario {
    const owned = new Set(espnRoster.map((p) => p.espnId));
    const kept = new Set(edited.map((p) => p.espnId));
    return {
        dropIds: espnRoster.filter((p) => !p.isInjuredReserve && !kept.has(p.espnId)).map((p) => p.espnId),
        adds: edited
            .filter((p) => !owned.has(p.espnId))
            .map(({ espnId, name, teamId, teamAbbr }) => ({ espnId, name, teamId, teamAbbr })),
    };
}
