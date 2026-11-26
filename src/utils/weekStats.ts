import type { PlayerGame, PlayerGameLog, StatLine } from "../types";
import { sumLines } from "./categoryRanks";

const pad = (n: number) => String(n).padStart(2, "0");

/** A local Date's calendar day as YYYY-MM-DD */
export const localDay = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

// NBA games are scheduled in Eastern time; a 10pm ET tip is already the next day in UTC.
const etDay = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
});
export const gameDayET = (iso: string) => etDay.format(new Date(iso));

export function gameToLine(g: PlayerGame): StatLine {
    return {
        min: g.min, pts: g.pts, reb: g.reb, ast: g.ast, stl: g.stl, blk: g.blk, to: g.to,
        threePM: g.tpm, fgm: g.fgm, fga: g.fga, ftm: g.ftm, fta: g.fta,
    };
}

/** A player's actual totals for the games he played in [start, end] (inclusive calendar days) */
export function weekLineFromLog(
    log: PlayerGameLog,
    start: Date,
    end: Date,
): { line: StatLine; games: number } {
    const from = localDay(start);
    const to = localDay(end);
    const played = log.games.filter((g) => {
        const day = gameDayET(g.gameDate);
        return day >= from && day <= to;
    });
    return { line: sumLines(played.map(gameToLine)), games: played.length };
}
