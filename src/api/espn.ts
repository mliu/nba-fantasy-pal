import type { PlayerStats } from "../types";

// Vite dev proxy routes — all ESPN traffic is proxied to avoid CORS issues.
// See vite.config.ts for target mappings.
const SITE_API = "/espn-site/apis/site/v2/sports/basketball/nba";
const WEB_API = "/espn-web/apis/common/v3/sports/basketball/nba";
const SEARCH_API = "/espn-web/apis/search/v2";

// ─── Types for raw ESPN responses ────────────────────────────────────────────

interface EspnSearchResult {
    id: string;
    uid?: string;
    displayName?: string;
    name?: string;
    teamId?: string;
    teamAbbreviation?: string;
    teamAbbr?: string;
    position?: string;
    subtitle?: string;
    link?: { web?: string };
}

interface GameLogEventMeta {
    gameDate: string;
}

interface GameLogStatEvent {
    eventId: string;
    stats?: string[];
}

interface GameLogCategory {
    events?: GameLogStatEvent[];
}

interface GameLogSeasonType {
    categories?: GameLogCategory[];
}

interface GameLogResponse {
    labels?: string[];
    // keyed by game ID — contains metadata (dates) but not stats
    events?: Record<string, GameLogEventMeta>;
    seasonTypes?: GameLogSeasonType[];
}

// ─── Exported types ───────────────────────────────────────────────────────────

export interface PlayerSearchResult {
    espnId: string;
    name: string;
    teamId: string;
    teamAbbr: string;
    position?: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function idxOf(labels: string[], ...candidates: string[]): number {
    for (const c of candidates) {
        const i = labels.findIndex((l) => l.toUpperCase() === c.toUpperCase());
        if (i >= 0) return i;
    }
    return -1;
}

function val(arr: string[], idx: number): number {
    if (idx < 0 || idx >= arr.length) return 0;
    return parseFloat(arr[idx]) || 0;
}

// ─── API functions ────────────────────────────────────────────────────────────

export async function searchPlayers(
    query: string,
): Promise<PlayerSearchResult[]> {
    if (!query.trim()) return [];

    const url = `${SEARCH_API}?query=${encodeURIComponent(query)}&sport=basketball&limit=10&lang=en&region=us`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Search failed: ${res.status}`);

    const data = await res.json();
    const out: PlayerSearchResult[] = [];

    // ESPN search returns an array of result groups keyed by "type"
    for (const group of data.results ?? []) {
        if (!["players", "player"].includes(group.type)) continue;
        for (const item of (group.contents ?? []) as EspnSearchResult[]) {
            // Extract numeric ESPN ID from uid (e.g. "s:40~l:46~a:5104157") or link URL
            const uidMatch = item.uid?.match(/~a:(\d+)/);
            const linkMatch = item.link?.web?.match(/\/id\/(\d+)\//);
            const numericId = uidMatch?.[1] ?? linkMatch?.[1];
            if (!numericId) continue;

            // Skip items with no team association (retired players, coaches, etc.)
            const teamName = item.subtitle ?? "";
            if (
                !item.teamId &&
                !item.teamAbbreviation &&
                !item.teamAbbr &&
                !teamName
            )
                continue;

            out.push({
                espnId: numericId,
                name: item.displayName ?? item.name ?? "Unknown",
                teamId: String(item.teamId ?? ""),
                teamAbbr: item.teamAbbreviation ?? item.teamAbbr ?? teamName,
                position: item.position ?? "",
            });
        }
    }

    console.log(out);

    return out;
}

// Parse "made-attempted" stat strings like "7-15" → [7, 15]
function parseMadeAttempted(arr: string[], idx: number): [number, number] {
    if (idx < 0 || idx >= arr.length) return [0, 0];
    const parts = arr[idx].split("-");
    return [parseFloat(parts[0]) || 0, parseFloat(parts[1]) || 0];
}

export async function getPlayerStats(
    espnId: string,
    timeWindow: "season" | "30" | "15" | "7",
): Promise<PlayerStats> {
    const url = `${WEB_API}/athletes/${espnId}/gamelog`;
    const res = await fetch(url);
    if (!res.ok)
        throw new Error(`Gamelog failed for player ${espnId}: ${res.status}`);

    const data: GameLogResponse = await res.json();

    const labels = data.labels;
    if (!labels?.length) throw new Error(`No stat labels for player ${espnId}`);

    // Locate stat column indices
    const minIdx = idxOf(labels, "MIN", "MINUTES");
    const ptsIdx = idxOf(labels, "PTS", "POINTS");
    const rebIdx = idxOf(labels, "REB", "REBOUNDS", "TREB");
    const astIdx = idxOf(labels, "AST", "ASSISTS");
    const stlIdx = idxOf(labels, "STL", "STEALS");
    const blkIdx = idxOf(labels, "BLK", "BLOCKS");
    const toIdx = idxOf(labels, "TO", "TOV", "TURNOVERS");
    // FG/3PT/FT columns are "made-attempted" strings
    const fgIdx = idxOf(labels, "FG");
    const threePIdx = idxOf(labels, "3PT", "3PM", "3P");
    const ftIdx = idxOf(labels, "FT");

    // Root events map: gameId → metadata (dates)
    const eventMeta = data.events ?? {};

    // Stat events live in seasonTypes[0].categories (descending by date).
    // Each category.events entry has the stats array and an eventId to join with eventMeta.
    const categories = data.seasonTypes?.[0]?.categories ?? [];

    // Determine cut-off date for time-window filtering
    const now = new Date();
    let cutoff: Date | null = null;
    if (timeWindow !== "season") {
        cutoff = new Date(now);
        cutoff.setDate(cutoff.getDate() - parseInt(timeWindow, 10));
    }

    // Collect matching stat events. Categories are descending, so stop a category
    // once its first event is already older than the cutoff.
    const effectiveStatEvents: GameLogStatEvent[] = [];
    outer: for (const category of categories) {
        for (const statEvent of category.events ?? []) {
            const meta = eventMeta[statEvent.eventId];
            if (!meta) continue;
            if (cutoff && new Date(meta.gameDate) < cutoff) break outer;
            effectiveStatEvents.push(statEvent);
        }
    }

    // Fall back to full season if no games in the requested window
    if (effectiveStatEvents.length === 0 && timeWindow !== "season") {
        for (const category of categories) {
            effectiveStatEvents.push(...(category.events ?? []));
        }
    }

    if (!effectiveStatEvents.length)
        throw new Error(`No games found for player ${espnId}`);

    let totalMin = 0,
        totalPts = 0,
        totalReb = 0,
        totalAst = 0,
        totalStl = 0,
        totalBlk = 0,
        totalTo = 0,
        total3PM = 0;
    let totalFgm = 0,
        totalFga = 0,
        totalFtm = 0,
        totalFta = 0;

    for (const event of effectiveStatEvents) {
        const s = event.stats ?? [];
        totalMin += val(s, minIdx);
        totalPts += val(s, ptsIdx);
        totalReb += val(s, rebIdx);
        totalAst += val(s, astIdx);
        totalStl += val(s, stlIdx);
        totalBlk += val(s, blkIdx);
        totalTo += val(s, toIdx);
        const [fgm, fga] = parseMadeAttempted(s, fgIdx);
        const [tpm] = parseMadeAttempted(s, threePIdx);
        const [ftm, fta] = parseMadeAttempted(s, ftIdx);
        totalFgm += fgm;
        totalFga += fga;
        total3PM += tpm;
        totalFtm += ftm;
        totalFta += fta;
    }

    const n = effectiveStatEvents.length;

    return {
        min: totalMin / n,
        pts: totalPts / n,
        reb: totalReb / n,
        ast: totalAst / n,
        stl: totalStl / n,
        blk: totalBlk / n,
        to: totalTo / n,
        threePM: total3PM / n,
        fgPct: totalFga > 0 ? (totalFgm / totalFga) * 100 : 0,
        ftPct: totalFta > 0 ? (totalFtm / totalFta) * 100 : 0,
        fgm: totalFgm / n,
        fga: totalFga / n,
        ftm: totalFtm / n,
        fta: totalFta / n,
        gamesPlayed: n,
    };
}

export async function getTeamGamesInWeek(
    teamId: string,
    weekStart: Date,
    weekEnd: Date,
): Promise<number> {
    const url = `${SITE_API}/teams/${teamId}/schedule?season=2026`;
    const res = await fetch(url);
    if (!res.ok)
        throw new Error(`Schedule failed for team ${teamId}: ${res.status}`);

    const data = await res.json();

    let count = 0;
    for (const event of data.events ?? []) {
        const d = new Date(event.date ?? event.gameDate ?? "");
        if (!isNaN(d.getTime()) && d >= weekStart && d <= weekEnd) {
            count++;
        }
    }
    return count;
}
