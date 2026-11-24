import React, { useState } from "react";
import {
    Box,
    Button,
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
import DeleteSweepIcon from "@mui/icons-material/DeleteSweepOutlined";
import { PlayerRow } from "./PlayerRow";
import { AddPlayerSearch } from "./AddPlayerSearch";
import { BulkAddDialog } from "./BulkAddDialog";
import type {
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

interface Totals {
    hasAny: boolean;
    days: number;
    min: number;
    pts: number;
    reb: number;
    ast: number;
    stl: number;
    blk: number;
    to: number;
    threePM: number;
    fgm: number;
    fga: number;
    ftm: number;
    fta: number;
}

function computeTotals(
    team: TeamContextData,
    displayMode: DisplayMode,
): Totals {
    const t: Totals = {
        hasAny: false,
        days: 0,
        min: 0,
        pts: 0,
        reb: 0,
        ast: 0,
        stl: 0,
        blk: 0,
        to: 0,
        threePM: 0,
        fgm: 0,
        fga: 0,
        ftm: 0,
        fta: 0,
    };

    team.players.forEach((p, i) => {
        const s = team.statsArr[i];
        if (!s) return;
        t.hasAny = true;
        const days =
            p.customDays !== null ? p.customDays : (team.schedulesArr[i] ?? 0);
        t.days += days;
        const mult = displayMode === "ev" ? days : 1;

        t.min += s.min * mult;
        t.pts += s.pts * mult;
        t.reb += s.reb * mult;
        t.ast += s.ast * mult;
        t.stl += s.stl * mult;
        t.blk += s.blk * mult;
        t.to += s.to * mult;
        t.threePM += s.threePM * mult;
        // Use actual FGM/FGA averages weighted by days for proper team FG%/FT%
        t.fgm += s.fgm * mult;
        t.fga += s.fga * mult;
        t.ftm += s.ftm * mult;
        t.fta += s.fta * mult;
    });

    return t;
}

// Margin (from this team's perspective) at which a category's color is fully saturated
const FULL_COUNT_MARGIN = 0.3; // 30% relative difference
const FULL_PCT_MARGIN = 0.05; // 5 percentage points

/**
 * Signed edge in [-1, 1] for a category: positive means this team is winning it.
 * Returns null when there's nothing to compare (or the category isn't scored).
 */
function categoryEdge(
    key: keyof PlayerStats,
    mine: Totals,
    theirs: Totals,
): number | null {
    if (!mine.hasAny || !theirs.hasAny) return null;
    const clamp = (v: number) => Math.max(-1, Math.min(1, v));

    if (key === "fgPct" || key === "ftPct") {
        const [m, a] = key === "fgPct" ? (["fgm", "fga"] as const) : (["ftm", "fta"] as const);
        if (!mine[a] || !theirs[a]) return null;
        const diff = mine[m] / mine[a] - theirs[m] / theirs[a];
        return clamp(diff / FULL_PCT_MARGIN);
    }

    if (key === "min") return null;
    const statKey = key as Exclude<keyof Totals, "hasAny">;
    const a = mine[statKey];
    const b = theirs[statKey];
    const denom = Math.max(a, b);
    if (!denom) return null;
    // Fewer turnovers wins the category
    const diff = (key === "to" ? b - a : a - b) / denom;
    return clamp(diff / FULL_COUNT_MARGIN);
}

function edgeBackground(edge: number | null): string | undefined {
    if (edge === null || edge === 0) return undefined;
    const rgb = edge > 0 ? "114,241,184" : "254,68,80";
    const alpha = 0.08 + 0.5 * Math.abs(edge);
    return `rgba(${rgb},${alpha.toFixed(3)})`;
}

function TotalsRow({
    totals,
    oppTotals,
    displayMode,
    shootingDisplayMode,
}: {
    totals: Totals;
    oppTotals: Totals;
    displayMode: DisplayMode;
    shootingDisplayMode: ShootingDisplayMode;
}) {
    const { hasAny } = totals;
    const showEdges = displayMode === "ev";

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

    const cellValue = (key: keyof PlayerStats): string => {
        if (!hasAny) return "—";
        if (key === "fgPct") return fmtPct(totals.fgm, totals.fga);
        if (key === "ftPct") return fmtPct(totals.ftm, totals.fta);
        return fmtCount(totals[key as Exclude<keyof Totals, "hasAny">] as number);
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
            <TableCell sx={{ py: 0.75 }}>{hasAny ? totals.days : "-"}</TableCell>
            {STAT_COLS.map(({ key }) => (
                <TableCell
                    key={key}
                    align="right"
                    sx={{
                        py: 0.75,
                        ...totalsStyle,
                        backgroundColor: showEdges
                            ? edgeBackground(categoryEdge(key, totals, oppTotals))
                            : undefined,
                    }}
                >
                    {cellValue(key)}
                </TableCell>
            ))}
            <TableCell sx={{ py: 0.75 }} />
        </TableRow>
    );
}

export function TeamSection({ side, label, accentColor }: Props) {
    const [editingName, setEditingName] = useState(false);
    const [bulkOpen, setBulkOpen] = useState(false);
    const { myTeam, oppTeam, displayMode, shootingDisplayMode } = useMatchup();
    const team: TeamContextData = side === "my" ? myTeam : oppTeam;
    const otherTeam: TeamContextData = side === "my" ? oppTeam : myTeam;

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
        addPlayers,
        removePlayer,
        clearPlayers,
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
                {players.length > 0 && (
                    <Button
                        size="small"
                        startIcon={<DeleteSweepIcon sx={{ fontSize: 16 }} />}
                        onClick={() => {
                            if (window.confirm(`Remove all players from ${teamName}?`))
                                clearPlayers();
                        }}
                        sx={{
                            ml: "auto",
                            color: "#fe4450",
                            opacity: 0.6,
                            fontSize: "0.7rem",
                            "&:hover": { opacity: 1 },
                        }}
                    >
                        Remove all
                    </Button>
                )}
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
                                totals={computeTotals(team, displayMode)}
                                oppTotals={computeTotals(otherTeam, displayMode)}
                                displayMode={displayMode}
                                shootingDisplayMode={shootingDisplayMode}
                            />
                        )}
                    </TableBody>
                </Table>
            </TableContainer>

            <Divider sx={{ borderColor: `${accentColor}22` }} />

            {/* Add player input */}
            <Box sx={{ px: 2, py: 1.25, display: "flex", gap: 1, alignItems: "center" }}>
                <AddPlayerSearch onSelect={addPlayer} excludeIds={players.map((p) => p.espnId)} />
                <Button size="small" onClick={() => setBulkOpen(true)}>
                    Add multiple
                </Button>
            </Box>
            <BulkAddDialog
                open={bulkOpen}
                onClose={() => setBulkOpen(false)}
                onAdd={addPlayers}
            />
        </Paper>
    );
}
