import type { EspnLeagueCredentials } from "../types";
import { ESPN_SEASON } from "../types";
import type { WeekOption, StatLine } from "../types";
import { EMPTY_LINE } from "../utils/categoryRanks";
import type { PlayerSearchResult } from "./espn";

// ESPN's league API doesn't allow browser requests, so it goes through the Worker in worker/
export const ESPN_PROXY_URL = import.meta.env.VITE_ESPN_PROXY_URL?.replace(/\/+$/, "") ?? "";

// Fantasy proTeamId → abbreviation (the IDs match the ESPN site API's NBA team IDs)
const PRO_TEAM_ABBR: Record<number, string> = {
    1: "ATL", 2: "BOS", 3: "NO", 4: "CHI", 5: "CLE", 6: "DAL", 7: "DEN", 8: "DET",
    9: "GS", 10: "HOU", 11: "IND", 12: "LAC", 13: "LAL", 14: "MIA", 15: "MIL",
    16: "MIN", 17: "BKN", 18: "NY", 19: "ORL", 20: "PHI", 21: "PHX", 22: "POR",
    23: "SAC", 24: "SA", 25: "OKC", 26: "UTAH", 27: "WSH", 28: "TOR", 29: "MEM",
    30: "CHA",
};

const IR_SLOT_ID = 13;

// ─── Types for raw ESPN responses ────────────────────────────────────────────

interface RawRosterEntry {
    lineupSlotId: number;
    playerPoolEntry?: {
        player?: { id: number; fullName: string; proTeamId: number };
    };
}

interface RawTeam {
    id: number;
    name?: string;
    location?: string;
    nickname?: string;
    owners?: string[];
    primaryOwner?: string;
    roster?: { entries?: RawRosterEntry[] };
}

interface RawMatchupSide {
    teamId: number;
    cumulativeScore?: { scoreByStat?: Record<string, { score?: number }> };
}

interface RawLeague {
    teams?: RawTeam[];
    schedule?: {
        matchupPeriodId: number;
        home?: RawMatchupSide;
        away?: RawMatchupSide;
    }[];
    status?: { currentMatchupPeriod?: number; latestScoringPeriod?: number };
}

// ─── Exported types ───────────────────────────────────────────────────────────

export interface LeaguePlayer extends PlayerSearchResult {
    isInjuredReserve: boolean;
}

export interface LeagueTeam {
    id: number;
    name: string;
    players: LeaguePlayer[];
}

export interface League {
    teams: LeagueTeam[];
    // Team owned by the SWID used to fetch, and its opponent this matchup period
    myTeamId: number | null;
    opponentTeamId: number | null;
}

// ─── API functions ────────────────────────────────────────────────────────────

const DAY_MS = 24 * 60 * 60 * 1000;

async function fetchLeagueData(
    creds: EspnLeagueCredentials,
    views: string[],
    scoringPeriodId?: number,
): Promise<RawLeague> {
    const query = [...views.map((v) => `view=${v}`), ...(scoringPeriodId ? [`scoringPeriodId=${scoringPeriodId}`] : [])];
    const url =
        `${ESPN_PROXY_URL}/apis/v3/games/fba/seasons/${ESPN_SEASON}` +
        `/segments/0/leagues/${encodeURIComponent(creds.leagueId)}?${query.join("&")}`;
    const res = await fetch(url, {
        headers: { "X-ESPN-S2": creds.espnS2, "X-ESPN-SWID": creds.swid },
    });
    if (res.status === 401)
        throw new Error("ESPN rejected the credentials — copy espn_s2 and SWID again");
    if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error ?? `ESPN league request failed: ${res.status}`);
    }
    return res.json();
}

const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();

/**
 * Loads the league. With `week`, the opponent is whoever you play in that matchup period, and for
 * past weeks the rosters are as they stood on the week's last day (via ESPN's scoringPeriodId).
 * App week N is ESPN matchup period N.
 */
export async function fetchLeague(creds: EspnLeagueCredentials, week?: WeekOption): Promise<League> {
    if (!ESPN_PROXY_URL) throw new Error("ESPN proxy isn't configured (VITE_ESPN_PROXY_URL)");

    const data = await fetchLeagueData(creds, ["mTeam", "mRoster", "mMatchupScore", "mStatus"]);
    const swid = creds.swid.toUpperCase();

    const currentPeriod = data.status?.currentMatchupPeriod;
    const period = week ? Number(week.key.replace(/\D/g, "")) : currentPeriod;

    // Past week: ESPN's default roster is today's, so ask for the roster on the week's last day.
    // latestScoringPeriod is today's scoring period, so offset from it by calendar days.
    let rosterData = data;
    const latest = data.status?.latestScoringPeriod;
    if (week && period && currentPeriod && period < currentPeriod && latest) {
        const daysAgo = Math.round((startOfDay(new Date()) - startOfDay(week.end)) / DAY_MS);
        rosterData = await fetchLeagueData(creds, ["mTeam", "mRoster"], Math.max(1, latest - daysAgo));
    }

    const teams: LeagueTeam[] = (rosterData.teams ?? []).map((t) => ({
        id: t.id,
        name: t.name || [t.location, t.nickname].filter(Boolean).join(" ") || `Team ${t.id}`,
        players: (t.roster?.entries ?? []).flatMap((e) => {
            const p = e.playerPoolEntry?.player;
            if (!p) return [];
            return [{
                espnId: String(p.id),
                name: p.fullName,
                teamId: p.proTeamId ? String(p.proTeamId) : "",
                teamAbbr: PRO_TEAM_ABBR[p.proTeamId] ?? "FA",
                isInjuredReserve: e.lineupSlotId === IR_SLOT_ID,
            }];
        }),
    }));

    const mine = (data.teams ?? []).find((t) =>
        [...(t.owners ?? []), t.primaryOwner ?? ""].some((o) => o.toUpperCase() === swid),
    );
    const matchup = mine
        ? data.schedule?.find(
              (m) =>
                  m.matchupPeriodId === period &&
                  (m.home?.teamId === mine.id || m.away?.teamId === mine.id),
          )
        : undefined;
    const opponentTeamId = matchup
        ? (matchup.home?.teamId === mine!.id ? matchup.away?.teamId : matchup.home?.teamId) ?? null
        : null;

    return { teams, myTeamId: mine?.id ?? null, opponentTeamId };
}

// ─── Actual weekly category totals ───────────────────────────────────────────

// ESPN stat IDs for basketball; FGM/FGA/FTM/FTA come along with the scoring categories
const STAT_IDS: Record<number, keyof StatLine> = {
    0: "pts", 1: "blk", 2: "stl", 3: "ast", 6: "reb", 11: "to",
    13: "fgm", 14: "fga", 15: "ftm", 16: "fta", 17: "threePM",
};

export interface LeagueActuals {
    currentPeriod: number;
    // matchup period → team id → that team's actual totals. Completed periods only.
    byPeriod: Record<number, Record<number, StatLine>>;
}

/** Every team's actual totals for every completed matchup period, from one request. */
export async function fetchLeagueActuals(creds: EspnLeagueCredentials): Promise<LeagueActuals> {
    if (!ESPN_PROXY_URL) throw new Error("ESPN proxy isn't configured (VITE_ESPN_PROXY_URL)");
    const data = await fetchLeagueData(creds, ["mMatchup", "mMatchupScore", "mStatus"]);
    const currentPeriod = data.status?.currentMatchupPeriod ?? 0;

    const byPeriod: LeagueActuals["byPeriod"] = {};
    for (const m of data.schedule ?? []) {
        if (m.matchupPeriodId >= currentPeriod) continue; // in progress or upcoming
        for (const side of [m.home, m.away]) {
            const scores = side?.cumulativeScore?.scoreByStat;
            if (!side || !scores) continue;
            const line = { ...EMPTY_LINE };
            for (const [statId, key] of Object.entries(STAT_IDS)) line[key] = scores[statId]?.score ?? 0;
            (byPeriod[m.matchupPeriodId] ??= {})[side.teamId] = line;
        }
    }
    return { currentPeriod, byPeriod };
}

/** Ids of my non-IR players at the end of a (past) week — who was on my team, roughly. */
export async function fetchMyRosterAtWeekEnd(
    creds: EspnLeagueCredentials,
    week: WeekOption,
): Promise<{ myTeamId: number | null; playerIds: string[] }> {
    const league = await fetchLeague(creds, week);
    const mine = league.teams.find((t) => t.id === league.myTeamId);
    return {
        myTeamId: league.myTeamId,
        playerIds: (mine?.players ?? []).filter((p) => !p.isInjuredReserve).map((p) => p.espnId),
    };
}
