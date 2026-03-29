import React, { useState } from "react";
import {
    Box,
    Paper,
    Typography,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    TextField,
    Divider,
    Tooltip,
} from "@mui/material";
import { useQueries } from "@tanstack/react-query";
import { PlayerRow } from "./PlayerRow";
import { AddPlayerSearch } from "./AddPlayerSearch";
import {
    getPlayerStats,
    getTeamGamesInWeek,
    type PlayerSearchResult,
} from "../../api/espn";
import type {
    PlayerEntry,
    PlayerStats,
    DisplayMode,
    TimeWindow,
    WeekKey,
} from "../../types";
import { STAT_COLS, WEEKS } from "../../types";

interface Props {
    label: string;
    teamName: string;
    players: PlayerEntry[];
    timeWindow: TimeWindow;
    weekKey: WeekKey;
    displayMode: DisplayMode;
    accentColor: string;
    onTeamNameChange: (name: string) => void;
    onPlayersChange: (players: PlayerEntry[]) => void;
}

function TotalsRow({
    players,
    statsArr,
    schedulesArr,
    displayMode,
}: {
    players: PlayerEntry[];
    statsArr: (PlayerStats | undefined)[];
    schedulesArr: (number | undefined)[];
    displayMode: DisplayMode;
}) {
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
    let hasAny = false;

    console.log(players);
    players.forEach((p, i) => {
        const s = statsArr[i];
        if (!s) return;
        hasAny = true;
        const days =
            p.customDays !== null ? p.customDays : (schedulesArr[i] ?? 0);
        const mult = displayMode === "ev" ? days : 1;

        totalMin += s.min * mult;
        totalPts += s.pts * mult;
        totalReb += s.reb * mult;
        totalAst += s.ast * mult;
        totalStl += s.stl * mult;
        totalBlk += s.blk * mult;
        totalTo += s.to * mult;
        total3PM += s.threePM * mult;
        // Use actual FGM/FGA averages weighted by days for proper team FG%/FT%
        totalFgm += s.fgm * mult;
        totalFga += s.fga * mult;
        totalFtm += s.ftm * mult;
        totalFta += s.fta * mult;
    });

    const fmtCount = (v: number) => v.toFixed(1);
    const fmtPct = (m: number, a: number) =>
        a > 0
            ? displayMode === "ev"
                ? `${m.toFixed(1)}/${a.toFixed(1)}`
                : `${((m / a) * 100).toFixed(1)}%`
            : "—";

    const totalsStyle = {
        color: "#fede5d",
        fontWeight: 700,
        fontFamily: "monospace",
        fontSize: "0.82rem",
    };

    return (
        <TableRow
            sx={{
                backgroundColor: "rgba(52,41,79,0.5)",
                "&:hover": {
                    backgroundColor: "rgba(52,41,79,0.65) !important",
                },
            }}
        >
            <TableCell sx={{ py: 0.75, px: 0.5 }} />
            <TableCell sx={{ py: 0.75 }}>
                <Typography
                    variant="caption"
                    sx={{
                        color: "#fede5d",
                        fontWeight: 700,
                        textTransform: "uppercase",
                        letterSpacing: "0.08em",
                        fontSize: "0.68rem",
                    }}
                >
                    {displayMode === "ev" ? "Week Total" : "Team Avg"}
                </Typography>
            </TableCell>
            <TableCell sx={{ py: 0.75 }} />
            <TableCell align="right" sx={{ py: 0.75, ...totalsStyle }}>
                {hasAny ? fmtCount(totalMin) : "—"}
            </TableCell>
            <TableCell align="right" sx={{ py: 0.75, ...totalsStyle }}>
                {hasAny ? fmtCount(totalPts) : "—"}
            </TableCell>
            <TableCell align="right" sx={{ py: 0.75, ...totalsStyle }}>
                {hasAny ? fmtCount(totalReb) : "—"}
            </TableCell>
            <TableCell align="right" sx={{ py: 0.75, ...totalsStyle }}>
                {hasAny ? fmtCount(totalAst) : "—"}
            </TableCell>
            <TableCell align="right" sx={{ py: 0.75, ...totalsStyle }}>
                {hasAny ? fmtCount(totalStl) : "—"}
            </TableCell>
            <TableCell align="right" sx={{ py: 0.75, ...totalsStyle }}>
                {hasAny ? fmtCount(totalBlk) : "—"}
            </TableCell>
            <TableCell align="right" sx={{ py: 0.75, ...totalsStyle }}>
                {hasAny ? fmtCount(totalTo) : "—"}
            </TableCell>
            <TableCell align="right" sx={{ py: 0.75, ...totalsStyle }}>
                {hasAny ? fmtCount(total3PM) : "—"}
            </TableCell>
            <TableCell align="right" sx={{ py: 0.75, ...totalsStyle }}>
                {hasAny ? fmtPct(totalFgm, totalFga) : "—"}
            </TableCell>
            <TableCell align="right" sx={{ py: 0.75, ...totalsStyle }}>
                {hasAny ? fmtPct(totalFtm, totalFta) : "—"}
            </TableCell>
            <TableCell sx={{ py: 0.75 }} />
        </TableRow>
    );
}

export function TeamSection({
    label,
    teamName,
    players,
    timeWindow,
    weekKey,
    displayMode,
    accentColor,
    onTeamNameChange,
    onPlayersChange,
}: Props) {
    const [editingName, setEditingName] = useState(false);
    const week = WEEKS.find((w) => w.key === weekKey)!;

    // Batch-fetch stats for every player in this team
    const statsResults = useQueries({
        queries: players.map((p) => ({
            queryKey: ["playerStats", p.espnId, timeWindow],
            queryFn: () => getPlayerStats(p.espnId, timeWindow),
            staleTime: 1000 * 60 * 10,
            enabled: !!p.espnId,
        })),
    });

    // Batch-fetch schedules — one query per unique teamId to avoid duplicate key warnings
    const uniqueTeamIds = [
        ...new Set(players.map((p) => p.teamId).filter(Boolean)),
    ];
    const scheduleResults = useQueries({
        queries: uniqueTeamIds.map((teamId) => ({
            queryKey: ["teamSchedule", teamId, weekKey],
            queryFn: () => getTeamGamesInWeek(teamId, week.start, week.end),
            staleTime: 1000 * 60 * 30,
        })),
    });

    const scheduleByTeamId = Object.fromEntries(
        uniqueTeamIds.map((teamId, i) => [teamId, scheduleResults[i].data]),
    );

    const statsArr = statsResults.map((r) => r.data);
    const schedulesArr = players.map((p) => scheduleByTeamId[p.teamId]);

    // ── Mutation helpers ──────────────────────────────────────────────────────

    const addPlayer = (result: PlayerSearchResult) => {
        if (players.some((p) => p.espnId === result.espnId)) return;
        onPlayersChange([
            ...players,
            {
                espnId: result.espnId,
                name: result.name,
                teamId: result.teamId,
                teamAbbr: result.teamAbbr,
                customDays: null,
            },
        ]);
    };

    const removePlayer = (idx: number) => {
        onPlayersChange(players.filter((_, i) => i !== idx));
    };

    const moveUp = (idx: number) => {
        if (idx === 0) return;
        const next = [...players];
        [next[idx - 1], next[idx]] = [next[idx], next[idx - 1]];
        onPlayersChange(next);
    };

    const moveDown = (idx: number) => {
        if (idx === players.length - 1) return;
        const next = [...players];
        [next[idx], next[idx + 1]] = [next[idx + 1], next[idx]];
        onPlayersChange(next);
    };

    const changeDays = (idx: number, days: number | null) => {
        const next = [...players];
        next[idx] = { ...next[idx], customDays: days };
        onPlayersChange(next);
    };

    return (
        <Paper
            elevation={0}
            sx={{
                border: `1px solid ${accentColor}33`,
                borderRadius: 2,
                overflow: "hidden",
                flex: 1,
                minWidth: 0,
            }}
        >
            {/* Header */}
            <Box
                sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 1.5,
                    px: 2,
                    py: 1.25,
                    borderBottom: `1px solid ${accentColor}33`,
                    background: `linear-gradient(90deg, ${accentColor}18 0%, transparent 100%)`,
                }}
            >
                <Box
                    sx={{
                        width: 3,
                        height: 20,
                        borderRadius: 1,
                        backgroundColor: accentColor,
                        flexShrink: 0,
                    }}
                />
                <Typography
                    variant="caption"
                    sx={{
                        color: "rgba(255,255,255,0.4)",
                        textTransform: "uppercase",
                        letterSpacing: "0.1em",
                        fontSize: "0.65rem",
                    }}
                >
                    {label}
                </Typography>
                {editingName ? (
                    <TextField
                        size="small"
                        value={teamName}
                        autoFocus
                        onChange={(e) => onTeamNameChange(e.target.value)}
                        onBlur={() => setEditingName(false)}
                        onKeyDown={(e) => {
                            if (e.key === "Enter") setEditingName(false);
                        }}
                        sx={{
                            "& .MuiInputBase-root": { height: 28 },
                            "& input": {
                                fontWeight: 600,
                                fontSize: "0.9rem",
                                color: accentColor,
                                py: 0,
                            },
                        }}
                    />
                ) : (
                    <Typography
                        variant="subtitle1"
                        sx={{
                            fontWeight: 600,
                            color: accentColor,
                            cursor: "pointer",
                            "&:hover": { opacity: 0.8 },
                        }}
                        onClick={() => setEditingName(true)}
                    >
                        {teamName}
                    </Typography>
                )}
                <Typography
                    variant="caption"
                    sx={{ color: "rgba(255,255,255,0.25)", ml: 0.5 }}
                >
                    {players.length} player{players.length !== 1 ? "s" : ""}
                </Typography>
            </Box>

            {/* Table */}
            <TableContainer>
                <Table size="small" sx={{ tableLayout: "auto" }}>
                    <TableHead>
                        <TableRow>
                            <TableCell sx={{ width: 52 }} />
                            <TableCell>Player</TableCell>
                            <Tooltip
                                title="Games playing this week (editable)"
                                arrow
                            >
                                <TableCell align="center" sx={{ width: 64 }}>
                                    Days
                                </TableCell>
                            </Tooltip>
                            {STAT_COLS.map(({ key, label: colLabel }) => (
                                <TableCell key={key} align="right">
                                    {colLabel}
                                </TableCell>
                            ))}
                            <TableCell sx={{ width: 36 }} />
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {players.length === 0 && (
                            <TableRow>
                                <TableCell
                                    colSpan={13}
                                    align="center"
                                    sx={{
                                        py: 3,
                                        color: "rgba(255,255,255,0.2)",
                                        fontSize: "0.8rem",
                                    }}
                                >
                                    No players added yet — search below to add
                                </TableCell>
                            </TableRow>
                        )}
                        {players.map((player, i) => (
                            <PlayerRow
                                key={player.espnId}
                                player={player}
                                stats={statsArr[i] ?? null}
                                isLoadingStats={statsResults[i].isLoading}
                                scheduledGames={schedulesArr[i] ?? 0}
                                isLoadingSchedule={
                                    scheduleResults[
                                        uniqueTeamIds.indexOf(player.teamId)
                                    ]?.isLoading ?? false
                                }
                                displayMode={displayMode}
                                isFirst={i === 0}
                                isLast={i === players.length - 1}
                                onDelete={() => removePlayer(i)}
                                onMoveUp={() => moveUp(i)}
                                onMoveDown={() => moveDown(i)}
                                onChangeDays={(days) => changeDays(i, days)}
                            />
                        ))}
                        {players.length > 0 && (
                            <TotalsRow
                                players={players}
                                statsArr={statsArr}
                                schedulesArr={schedulesArr}
                                displayMode={displayMode}
                            />
                        )}
                    </TableBody>
                </Table>
            </TableContainer>

            <Divider sx={{ borderColor: `${accentColor}22` }} />

            {/* Add player input */}
            <Box sx={{ px: 2, py: 1.25 }}>
                <AddPlayerSearch onSelect={addPlayer} />
            </Box>
        </Paper>
    );
}
