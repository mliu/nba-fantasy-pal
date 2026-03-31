export type TimeWindow = "season" | "30" | "15" | "7";
export type DisplayMode = "avg" | "ev";
export type ShootingDisplayMode = "pct" | "ratio";
export type WeekKey = "week1" | "week2";

export interface WeekOption {
    key: WeekKey;
    label: string;
    start: Date;
    end: Date;
}

export const WEEKS: WeekOption[] = [
    {
        key: "week1",
        label: "Week 1 (Mar 30 – Apr 5)",
        start: new Date("2026-03-30T00:00:00"),
        end: new Date("2026-04-05T23:59:59"),
    },
    {
        key: "week2",
        label: "Week 2 (Apr 6 – Apr 12)",
        start: new Date("2026-04-06T00:00:00"),
        end: new Date("2026-04-12T23:59:59"),
    },
];

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
