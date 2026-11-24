import type { EspnLeagueCredentials } from "../types";
import { ESPN_SEASON } from "../types";
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

interface RawLeague {
    teams?: RawTeam[];
    schedule?: {
        matchupPeriodId: number;
        home?: { teamId: number };
        away?: { teamId: number };
    }[];
    status?: { currentMatchupPeriod?: number };
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

export async function fetchLeague(creds: EspnLeagueCredentials): Promise<League> {
    if (!ESPN_PROXY_URL) throw new Error("ESPN proxy isn't configured (VITE_ESPN_PROXY_URL)");

    const url =
        `${ESPN_PROXY_URL}/apps/fantasy/v3/games/fba/seasons/${ESPN_SEASON}` +
        `/segments/0/leagues/${encodeURIComponent(creds.leagueId)}` +
        `?view=mTeam&view=mRoster&view=mMatchup`;
    const res = await fetch(url, {
        headers: { "X-ESPN-S2": creds.espnS2, "X-ESPN-SWID": creds.swid },
    });
    if (res.status === 401)
        throw new Error("ESPN rejected the credentials — copy espn_s2 and SWID again");
    if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error ?? `ESPN league request failed: ${res.status}`);
    }

    const data: RawLeague = await res.json();
    const swid = creds.swid.toUpperCase();

    const teams: LeagueTeam[] = (data.teams ?? []).map((t) => ({
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
    const period = data.status?.currentMatchupPeriod;
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
