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
import { PlayerRow, formatStat } from "./PlayerRow";
import { AddPlayerSearch } from "./AddPlayerSearch";
import { BulkAddDialog } from "./BulkAddDialog";
import type {
    PlayerStats,
    DisplayMode,
    RestView,
    ShootingDisplayMode,
    StatLine,
} from "../../types";
import { EMPTY_LINE, addLines, scaleStats } from "../../api/espn";
import { STAT_COLS } from "../../types";
import { useMatchup, type TeamContextData } from "../../context/MatchupContext";

interface Props {
    side: "my" | "opp";
    label: string;
    accentColor: string;
}

// What a set of rows shows: per-game averages, full-week projection, or the two halves of the week
type LineKind = "avg" | "ev" | "sofar" | "remaining";

interface RowData {
    line: StatLine | null;
    days: number;
}

interface Totals extends StatLine {
    hasAny: boolean;
    days: number;
}

const effectiveDays = (custom: number | null | undefined, auto: number | undefined) =>
    custom ?? auto ?? 0;

function teamRows(team: TeamContextData, kind: LineKind): RowData[] {
    return team.players.map((p, i) => {
        const stats = team.statsArr[i];
        switch (kind) {
            case "avg":
            case "ev": {
                const days = effectiveDays(p.customDays, team.schedulesArr[i]);
                const mult = kind === "ev" ? days : 1;
                return { line: stats ? scaleStats(stats, mult) : null, days };
            }
            case "sofar": {
                const wtd = team.weekToDateArr[i];
                return { line: wtd?.line ?? null, days: wtd?.games ?? 0 };
            }
            case "remaining": {
                const days = effectiveDays(p.customRestDays, team.remainingArr[i]);
                return { line: stats ? scaleStats(stats, days) : null, days };
            }
        }
    });
}

function computeTotals(rows: RowData[]): Totals {
    // Summing FGM/FGA (not averaging percentages) gives proper team FG%/FT%
    return rows.reduce<Totals>(
        (t, r) =>
            r.line
                ? { ...addLines(t, r.line), hasAny: true, days: t.days + r.days }
                : t,
        { ...EMPTY_LINE, hasAny: false, days: 0 },
    );
}

function combineTotals(a: Totals, b: Totals): Totals {
    return { ...addLines(a, b), hasAny: a.hasAny || b.hasAny, days: a.days + b.days };
}

interface TotalsRowSpec {
    label: string;
    totals: Totals;
    // Opponent's matching row, for win/lose coloring (null = no coloring)
    oppTotals: Totals | null;
    decimals: number;
}

function totalsRowSpecs(
    team: TeamContextData,
    other: TeamContextData,
    displayMode: DisplayMode,
): TotalsRowSpec[] {
    if (displayMode !== "rest") {
        return [{
            label: displayMode === "ev" ? "Week Total" : "Team Avg",
            totals: computeTotals(teamRows(team, displayMode)),
            oppTotals: displayMode === "ev" ? computeTotals(teamRows(other, "ev")) : null,
            decimals: 1,
        }];
    }
    const halves = (t: TeamContextData) => {
        const sofar = computeTotals(teamRows(t, "sofar"));
        const remaining = computeTotals(teamRows(t, "remaining"));
        return { sofar, remaining, projected: combineTotals(sofar, remaining) };
    };
    const mine = halves(team);
    const theirs = halves(other);
    return [
        { label: "Week So Far", totals: mine.sofar, oppTotals: theirs.sofar, decimals: 0 },
        { label: "Rest of Week", totals: mine.remaining, oppTotals: theirs.remaining, decimals: 1 },
        { label: "Projected Total", totals: mine.projected, oppTotals: theirs.projected, decimals: 1 },
    ];
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
    const statKey = key as keyof StatLine;
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
    spec: { label, totals, oppTotals, decimals },
    shootingDisplayMode,
}: {
    spec: TotalsRowSpec;
    shootingDisplayMode: ShootingDisplayMode;
}) {
    const { hasAny } = totals;

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
                    {label}
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
                        backgroundColor: oppTotals
                            ? edgeBackground(categoryEdge(key, totals, oppTotals))
                            : undefined,
                    }}
                >
                    {hasAny ? formatStat(totals, key, shootingDisplayMode, decimals) : "—"}
                </TableCell>
            ))}
            <TableCell sx={{ py: 0.75 }} />
        </TableRow>
    );
}

const plural = (n: number, word: string) => `${n} ${word}${n !== 1 ? "s" : ""}`;

export function TeamSection({ side, label, accentColor }: Props) {
    const [editingName, setEditingName] = useState(false);
    const [bulkOpen, setBulkOpen] = useState(false);
    const { myTeam, oppTeam, displayMode, shootingDisplayMode, restView } =
        useMatchup();
    const team: TeamContextData = side === "my" ? myTeam : oppTeam;
    const otherTeam: TeamContextData = side === "my" ? oppTeam : myTeam;

    const {
        players,
        teamName,
        schedulesArr,
        remainingArr,
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
        changeRestDays,
        setTeamName,
    } = team;

    const rowKind: LineKind =
        displayMode === "rest" ? restView : displayMode;
    const rows = teamRows(team, rowKind);

    const daysTooltip = (i: number): string => {
        const isLoadingSchedule =
            scheduleResults[uniqueTeamIds.indexOf(effectiveTeamIds[i])]
                ?.isLoading ?? false;
        if (isLoadingSchedule) return "Loading schedule…";
        const scheduled = schedulesArr[i] ?? 0;
        const remaining = remainingArr[i] ?? 0;
        switch (rowKind) {
            case "sofar":
                return `${plural(rows[i].days, "game")} played this week`;
            case "remaining":
                return players[i].customRestDays != null
                    ? `Override active (auto: ${remaining})`
                    : `${plural(remaining, "game")} left this week`;
            default:
                return players[i].customDays !== null
                    ? `Override active (auto: ${scheduled})`
                    : `${plural(scheduled, "scheduled game")} this week`;
        }
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
                                title={
                                    rowKind === "sofar"
                                        ? "Games played this week"
                                        : rowKind === "remaining"
                                          ? "Games left this week (editable)"
                                          : "Games playing this week (editable)"
                                }
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
                                line={rows[i].line}
                                isLoadingStats={statsResults[i].isLoading}
                                days={rows[i].days}
                                daysEditable={rowKind !== "sofar"}
                                isCustomDays={
                                    (rowKind === "remaining"
                                        ? player.customRestDays
                                        : player.customDays) != null
                                }
                                daysTooltip={daysTooltip(i)}
                                decimals={rowKind === "sofar" ? 0 : 1}
                                shootingDisplayMode={shootingDisplayMode}
                                isFirst={i === 0}
                                isLast={i === players.length - 1}
                                onDelete={() => removePlayer(i)}
                                onMoveUp={() => moveUp(i)}
                                onMoveDown={() => moveDown(i)}
                                onChangeDays={(days) => {
                                    // Typing the automatic value clears the override
                                    const [auto, change] =
                                        rowKind === "remaining"
                                            ? [remainingArr[i], changeRestDays]
                                            : [schedulesArr[i], changeDays];
                                    change(
                                        i,
                                        days !== null && days === (auto ?? null)
                                            ? null
                                            : days,
                                    );
                                }}
                            />
                        ))}
                        {players.length > 0 &&
                            totalsRowSpecs(team, otherTeam, displayMode).map(
                                (spec) => (
                                    <TotalsRow
                                        key={spec.label}
                                        spec={spec}
                                        shootingDisplayMode={shootingDisplayMode}
                                    />
                                ),
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
