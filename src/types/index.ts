export type TimeWindow = "season" | "30" | "15" | "7";
export type DisplayMode = "avg" | "ev";
export type ShootingDisplayMode = "pct" | "ratio";
export type WeekKey = string;

export interface WeekOption {
    key: WeekKey;
    label: string;
    start: Date;
    end: Date;
}

// Regular season: week 1 starts on opening night; every week after that runs Mon–Sun.
const SEASON_START = new Date("2026-10-20T00:00:00");
const SEASON_END = new Date("2027-04-11T23:59:59");
const DAY_MS = 24 * 60 * 60 * 1000;

const fmtDay = (d: Date) =>
    d.toLocaleDateString("en-US", { month: "short", day: "numeric" });

// Weeks up to and including the one after the current week, so next week can be previewed.
function buildWeeks(today: Date): WeekOption[] {
    const weeks: WeekOption[] = [];
    let start = new Date(SEASON_START);
    for (let n = 1; start <= SEASON_END; n++) {
        const end = new Date(start);
        // advance to the following Sunday (week 1 is the partial week from opening night)
        end.setDate(end.getDate() + ((7 - end.getDay()) % 7));
        end.setHours(23, 59, 59, 0);
        weeks.push({
            key: `week${n}`,
            label: `Week ${n} (${fmtDay(start)} – ${fmtDay(end)})`,
            start,
            end,
        });
        const next = new Date(end.getTime() + 1000);
        next.setHours(0, 0, 0, 0);
        start = next;
    }
    const current = weeks.findIndex((w) => today <= w.end);
    const last = current < 0 ? weeks.length - 1 : Math.min(current + 1, weeks.length - 1);
    return weeks.slice(0, last + 1);
}

export const WEEKS: WeekOption[] = buildWeeks(new Date());

export function getCurrentWeekKey(today: Date = new Date()): WeekKey {
    const w = WEEKS.find((w) => today >= w.start && today <= w.end);
    return (w ?? WEEKS[WEEKS.length - 1]).key;
}

export const TIME_WINDOWS: { value: TimeWindow; label: string }[] = [
    { value: "season", label: "Season Avg" },
    { value: "30", label: "Last 30 Days" },
    { value: "15", label: "Last 15 Days" },
    { value: "7", label: "Last 7 Days" },
];

export interface PlayerEntry {
    espnId: string;
    name: string;
    teamId: string;
    teamAbbr: string;
    customDays: number | null;
}

export interface PlayerGame {
    gameDate: string;
    min: number;
    pts: number;
    reb: number;
    ast: number;
    stl: number;
    blk: number;
    to: number;
    fgm: number;
    fga: number;
    tpm: number;
    ftm: number;
    fta: number;
}

export interface PlayerGameLog {
    teamId: string;
    games: PlayerGame[];
}

export interface PlayerStats {
    min: number;
    pts: number;
    reb: number;
    ast: number;
    stl: number;
    blk: number;
    to: number;
    threePM: number;
    fgPct: number;
    ftPct: number;
    // raw shooting volume for weighted team averages
    fgm: number;
    fga: number;
    ftm: number;
    fta: number;
    gamesPlayed: number;
    teamId?: string;
}

export const STAT_COLS: {
    key: keyof PlayerStats;
    label: string;
    isRate: boolean;
}[] = [
    { key: "min", label: "MIN", isRate: false },
    { key: "threePM", label: "3PM", isRate: false },
    { key: "reb", label: "REB", isRate: false },
    { key: "ast", label: "AST", isRate: false },
    { key: "stl", label: "STL", isRate: false },
    { key: "blk", label: "BLK", isRate: false },
    { key: "to", label: "TO", isRate: false },
    { key: "pts", label: "PTS", isRate: false },
    { key: "fgPct", label: "FG%", isRate: true },
    { key: "ftPct", label: "FT%", isRate: true },
];
