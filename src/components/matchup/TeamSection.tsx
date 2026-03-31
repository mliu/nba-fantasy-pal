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
import { PlayerRow } from "./PlayerRow";
import { AddPlayerSearch } from "./AddPlayerSearch";
import type {
    PlayerEntry,
    PlayerStats,
    DisplayMode,
    ShootingDisplayMode,
} from "../../types";
import { STAT_COLS } from "../../types";
import { useMatchup, type TeamContextData } from "../../context/MatchupContext";

interface Props {
    side: "my" | "opp";
    label: string;
    accentColor: string;
}

function TotalsRow({
    players,
    statsArr,
    schedulesArr,
    displayMode,
    shootingDisplayMode,
}: {
    players: PlayerEntry[];
    statsArr: (PlayerStats | undefined)[];
    schedulesArr: (number | undefined)[];
    displayMode: DisplayMode;
    shootingDisplayMode: ShootingDisplayMode;
}) {
    let totalMin = 0,
        totalPts = 0,
        totalReb = 0,
        totalAst = 0,
        totalStl = 0,
        totalBlk = 0,
        totalTo = 0,
        total3PM = 0,
        totalDays = 0;
    let totalFgm = 0,
        totalFga = 0,
        totalFtm = 0,
        totalFta = 0;
    let hasAny = false;

    players.forEach((p, i) => {
        const s = statsArr[i];
        if (!s) return;
        hasAny = true;
        const days =
            p.customDays !== null ? p.customDays : (schedulesArr[i] ?? 0);
        totalDays += days;
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
    const fmtPct = (m: number, a: number) => {
        if (!a) return "—";
        return shootingDisplayMode === "ratio"
            ? `${m.toFixed(1)}/${a.toFixed(1)}`
            : `${((m / a) * 100).toFixed(1)}%`;
    };

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
            <TableCell sx={{ py: 0.75 }}>{hasAny ? totalDays : "-"}</TableCell>
            <TableCell align="right" sx={{ py: 0.75, ...totalsStyle }}>
                {hasAny ? fmtCount(totalMin) : "—"}
            </TableCell>
            <TableCell align="right" sx={{ py: 0.75, ...totalsStyle }}>
                {hasAny ? fmtCount(total3PM) : "—"}
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
                {hasAny ? fmtCount(totalPts) : "—"}
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

export function TeamSection({ side, label, accentColor }: Props) {
    const [editingName, setEditingName] = useState(false);
    const { myTeam, oppTeam, displayMode, shootingDisplayMode } = useMatchup();
    const team: TeamContextData = side === "my" ? myTeam : oppTeam;

    const {
        players,
        teamName,
        statsArr,
        schedulesArr,
        effectiveTeamIds,
        uniqueTeamIds,
        statsResults,
        scheduleResults,
        addPlayer,
        removePlayer,
        moveUp,
        moveDown,
        changeDays,
        setTeamName,
    } = team;

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
                        onChange={(e) => setTeamName(e.target.value)}
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
                                        uniqueTeamIds.indexOf(
                                            effectiveTeamIds[i],
                                        )
                                    ]?.isLoading ?? false
                                }
                                displayMode={displayMode}
                                shootingDisplayMode={shootingDisplayMode}
                                isFirst={i === 0}
                                isLast={i === players.length - 1}
                                onDelete={() => removePlayer(i)}
                                onMoveUp={() => moveUp(i)}
                                onMoveDown={() => moveDown(i)}
                                onChangeDays={(days) =>
                                    changeDays(
                                        i,
                                        days !== null &&
                                            days === (schedulesArr[i] ?? null)
                                            ? null
                                            : days,
                                    )
                                }
                            />
                        ))}
                        {players.length > 0 && (
                            <TotalsRow
                                players={players}
                                statsArr={statsArr}
                                schedulesArr={schedulesArr}
                                displayMode={displayMode}
                                shootingDisplayMode={shootingDisplayMode}
                            />
                        )}
                    </TableBody>
                </Table>
            </TableContainer>

            <Divider sx={{ borderColor: `${accentColor}22` }} />

            {/* Add player input */}
            <Box sx={{ px: 2, py: 1.25 }}>
                <AddPlayerSearch onSelect={addPlayer} excludeIds={players.map((p) => p.espnId)} />
            </Box>
        </Paper>
    );
}
