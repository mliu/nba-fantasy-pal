import React, {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useState,
} from "react";
import { useQueries } from "@tanstack/react-query";
import {
    fetchPlayerGameLog,
    computePlayerStats,
    getTeamGamesInWeek,
    type PlayerSearchResult,
} from "../api/espn";
import type {
    PlayerEntry,
    PlayerGameLog,
    PlayerStats,
    TimeWindow,
    DisplayMode,
    ShootingDisplayMode,
    WeekKey,
} from "../types";
import { WEEKS } from "../types";
import { StorageService } from "../storage/StorageService";

const store = StorageService.getInstance();

export interface TeamContextData {
    players: PlayerEntry[];
    teamName: string;
    statsArr: (PlayerStats | undefined)[];
    schedulesArr: (number | undefined)[];
    effectiveTeamIds: string[];
    uniqueTeamIds: string[];
    statsResults: Array<{ isLoading: boolean; data?: PlayerGameLog }>;
    scheduleResults: Array<{ isLoading: boolean; data?: number }>;
    addPlayer: (result: PlayerSearchResult) => void;
    removePlayer: (idx: number) => void;
    moveUp: (idx: number) => void;
    moveDown: (idx: number) => void;
    changeDays: (idx: number, days: number | null) => void;
    setTeamName: (name: string) => void;
}

interface MatchupContextValue {
    myTeam: TeamContextData;
    oppTeam: TeamContextData;
    weekKey: WeekKey;
    timeWindow: TimeWindow;
    displayMode: DisplayMode;
    shootingDisplayMode: ShootingDisplayMode;
    setWeekKey: (w: WeekKey) => void;
    setTimeWindow: (tw: TimeWindow) => void;
    setDisplayMode: (m: DisplayMode) => void;
    setShootingDisplayMode: (s: ShootingDisplayMode) => void;
}

const MatchupContext = createContext<MatchupContextValue | null>(null);

function useTeamData(
    players: PlayerEntry[],
    setPlayers: (p: PlayerEntry[]) => void,
    teamName: string,
    setTeamName: (n: string) => void,
    timeWindow: TimeWindow,
    weekKey: WeekKey,
): TeamContextData {
    const week = WEEKS.find((w) => w.key === weekKey)!;

    const gameLogResults = useQueries({
        queries: players.map((p) => ({
            queryKey: ["playerStats", p.espnId],
            queryFn: () => fetchPlayerGameLog(p.espnId),
            staleTime: 1000 * 60 * 60 * 12,
            enabled: !!p.espnId,
        })),
    });

    const effectiveTeamIds = players.map(
        (p, i) => p.teamId || gameLogResults[i].data?.teamId || "",
    );
    const uniqueTeamIds = [...new Set(effectiveTeamIds.filter(Boolean))];

    const scheduleResults = useQueries({
        queries: uniqueTeamIds.map((teamId) => ({
            queryKey: ["teamSchedule", teamId, weekKey],
            queryFn: () => getTeamGamesInWeek(teamId, week.start, week.end),
            staleTime: Infinity,
        })),
    });

    const scheduleByTeamId = Object.fromEntries(
        uniqueTeamIds.map((teamId, i) => [teamId, scheduleResults[i].data]),
    );

    const statsArr = gameLogResults.map((r) =>
        r.data ? computePlayerStats(r.data, timeWindow) : undefined,
    );
    const schedulesArr = effectiveTeamIds.map((id) => scheduleByTeamId[id]);

    useEffect(() => {
        const needsUpdate = players.some(
            (p, i) => !p.teamId && gameLogResults[i].data?.teamId,
        );
        if (!needsUpdate) return;
        setPlayers(
            players.map((p, i) => {
                const fromStats = gameLogResults[i].data?.teamId;
                return !p.teamId && fromStats ? { ...p, teamId: fromStats } : p;
            }),
        );
    }, [gameLogResults]);

    const addPlayer = useCallback(
        (result: PlayerSearchResult) => {
            if (players.some((p) => p.espnId === result.espnId)) return;
            setPlayers([
                ...players,
                {
                    espnId: result.espnId,
                    name: result.name,
                    teamId: result.teamId,
                    teamAbbr: result.teamAbbr,
                    customDays: null,
                },
            ]);
        },
        [players, setPlayers],
    );

    const removePlayer = useCallback(
        (idx: number) => {
            setPlayers(players.filter((_, i) => i !== idx));
        },
        [players, setPlayers],
    );

    const moveUp = useCallback(
        (idx: number) => {
            if (idx === 0) return;
            const next = [...players];
            [next[idx - 1], next[idx]] = [next[idx], next[idx - 1]];
            setPlayers(next);
        },
        [players, setPlayers],
    );

    const moveDown = useCallback(
        (idx: number) => {
            if (idx === players.length - 1) return;
            const next = [...players];
            [next[idx], next[idx + 1]] = [next[idx + 1], next[idx]];
            setPlayers(next);
        },
        [players, setPlayers],
    );

    const changeDays = useCallback(
        (idx: number, days: number | null) => {
            const next = [...players];
            next[idx] = { ...next[idx], customDays: days };
            setPlayers(next);
        },
        [players, setPlayers],
    );

    return {
        players,
        teamName,
        statsArr,
        schedulesArr,
        effectiveTeamIds,
        uniqueTeamIds,
        statsResults: gameLogResults,
        scheduleResults,
        addPlayer,
        removePlayer,
        moveUp,
        moveDown,
        changeDays,
        setTeamName,
    };
}

export function MatchupProvider({ children }: { children: React.ReactNode }) {
    const [myPlayers, setMyPlayersState] = useState<PlayerEntry[]>(() =>
        store.getMyPlayers(),
    );
    const [oppPlayers, setOppPlayersState] = useState<PlayerEntry[]>(() =>
        store.getOppPlayers(),
    );
    const [myTeamName, setMyTeamNameState] = useState(() =>
        store.getMyTeamName(),
    );
    const [oppTeamName, setOppTeamNameState] = useState(() =>
        store.getOppTeamName(),
    );
    const [weekKey, setWeekKeyState] = useState<WeekKey>(() =>
        store.getSelectedWeek(),
    );
    const [timeWindow, setTimeWindowState] = useState<TimeWindow>(() =>
        store.getTimeWindow(),
    );
    const [displayMode, setDisplayModeState] = useState<DisplayMode>(() =>
        store.getDisplayMode(),
    );
    const [shootingDisplayMode, setShootingDisplayMode] =
        useState<ShootingDisplayMode>("pct");

    const setMyPlayers = useCallback((p: PlayerEntry[]) => {
        setMyPlayersState(p);
        store.setMyPlayers(p);
    }, []);
    const setOppPlayers = useCallback((p: PlayerEntry[]) => {
        setOppPlayersState(p);
        store.setOppPlayers(p);
    }, []);
    const setMyTeamName = useCallback((n: string) => {
        setMyTeamNameState(n);
        store.setMyTeamName(n);
    }, []);
    const setOppTeamName = useCallback((n: string) => {
        setOppTeamNameState(n);
        store.setOppTeamName(n);
    }, []);
    const setWeekKey = useCallback((w: WeekKey) => {
        setWeekKeyState(w);
        store.setSelectedWeek(w);
    }, []);
    const setTimeWindow = useCallback((tw: TimeWindow) => {
        setTimeWindowState(tw);
        store.setTimeWindow(tw);
    }, []);
    const setDisplayMode = useCallback((m: DisplayMode) => {
        setDisplayModeState(m);
        store.setDisplayMode(m);
    }, []);

    const myTeam = useTeamData(
        myPlayers,
        setMyPlayers,
        myTeamName,
        setMyTeamName,
        timeWindow,
        weekKey,
    );
    const oppTeam = useTeamData(
        oppPlayers,
        setOppPlayers,
        oppTeamName,
        setOppTeamName,
        timeWindow,
        weekKey,
    );

    return (
        <MatchupContext.Provider
            value={{
                myTeam,
                oppTeam,
                weekKey,
                timeWindow,
                displayMode,
                shootingDisplayMode,
                setWeekKey,
                setTimeWindow,
                setDisplayMode,
                setShootingDisplayMode,
            }}
        >
            {children}
        </MatchupContext.Provider>
    );
}

export function useMatchup() {
    const ctx = useContext(MatchupContext);
    if (!ctx) throw new Error("useMatchup must be used within MatchupProvider");
    return ctx;
}
