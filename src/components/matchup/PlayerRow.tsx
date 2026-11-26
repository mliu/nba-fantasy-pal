import React from "react";
import {
    TableRow,
    TableCell,
    IconButton,
    TextField,
    Skeleton,
    Tooltip,
    Box,
    Typography,
} from "@mui/material";
import DeleteIcon from "@mui/icons-material/DeleteOutline";
import ArrowUpwardIcon from "@mui/icons-material/KeyboardArrowUp";
import ArrowDownwardIcon from "@mui/icons-material/KeyboardArrowDown";
import type {
    PlayerEntry,
    PlayerStats,
    ShootingDisplayMode,
    StatLine,
} from "../../types";
import { STAT_COLS } from "../../types";

interface Props {
    player: PlayerEntry;
    // Stats to show (per game, projected or actual) — null when not loaded
    line: StatLine | null;
    isLoadingStats: boolean;
    days: number;
    // Read-only days show as plain text (e.g. games already played)
    daysEditable: boolean;
    isCustomDays: boolean;
    daysTooltip: string;
    decimals: number;
    shootingDisplayMode: ShootingDisplayMode;
    isFirst: boolean;
    isLast: boolean;
    onDelete: () => void;
    onMoveUp: () => void;
    onMoveDown: () => void;
    onChangeDays: (days: number | null) => void;
}

export function formatStat(
    line: StatLine,
    key: keyof PlayerStats,
    shootingDisplayMode: ShootingDisplayMode,
    decimals: number,
): string {
    if (key === "fgPct" || key === "ftPct") {
        const [made, att] =
            key === "fgPct" ? [line.fgm, line.fga] : [line.ftm, line.fta];
        if (shootingDisplayMode === "ratio")
            return `${made.toFixed(decimals)}/${att.toFixed(decimals)}`;
        return att ? `${((made / att) * 100).toFixed(1)}%` : "—";
    }
    return (line[key as keyof StatLine] as number).toFixed(decimals);
}

export function PlayerRow({
    player,
    line,
    isLoadingStats,
    days,
    daysEditable,
    isCustomDays: isCustom,
    daysTooltip,
    decimals,
    shootingDisplayMode,
    isFirst,
    isLast,
    onDelete,
    onMoveUp,
    onMoveDown,
    onChangeDays,
}: Props) {
    return (
        <TableRow>
            {/* Reorder controls */}
            <TableCell sx={{ py: 0.25, px: 0.5, width: 52 }}>
                <Box sx={{ display: "flex", flexDirection: "column", gap: 0 }}>
                    <IconButton
                        size="small"
                        onClick={onMoveUp}
                        disabled={isFirst}
                        sx={{ p: 0.25, opacity: isFirst ? 0.2 : 0.6 }}
                    >
                        <ArrowUpwardIcon sx={{ fontSize: 16 }} />
                    </IconButton>
                    <IconButton
                        size="small"
                        onClick={onMoveDown}
                        disabled={isLast}
                        sx={{ p: 0.25, opacity: isLast ? 0.2 : 0.6 }}
                    >
                        <ArrowDownwardIcon sx={{ fontSize: 16 }} />
                    </IconButton>
                </Box>
            </TableCell>

            {/* Player name */}
            <TableCell sx={{ py: 0.5, whiteSpace: "nowrap", minWidth: 140 }}>
                <Typography
                    variant="body2"
                    sx={{ fontWeight: 500, color: "#ff7edb", lineHeight: 1.2 }}
                >
                    {player.name}
                </Typography>
                <Typography
                    variant="caption"
                    sx={{
                        color: "rgba(255,255,255,0.35)",
                        fontSize: "0.68rem",
                    }}
                >
                    {player.teamAbbr}
                </Typography>
            </TableCell>

            {/* Days input */}
            <TableCell sx={{ py: 0.5, width: 64 }}>
                <Tooltip title={daysTooltip} arrow>
                    {daysEditable ? (
                        <TextField
                            type="number"
                            size="small"
                            value={days}
                            onChange={(e) => {
                                const n = parseInt(e.target.value, 10);
                                onChangeDays(
                                    isNaN(n) ? null : Math.max(0, Math.min(7, n)),
                                );
                            }}
                            inputProps={{
                                min: 0,
                                max: 7,
                                style: {
                                    textAlign: "center",
                                    padding: "3px 4px",
                                    width: 36,
                                    fontSize: "0.8rem",
                                },
                            }}
                            sx={{
                                "& .MuiInputBase-root": {
                                    height: 28,
                                    backgroundColor: isCustom
                                        ? "rgba(254,222,93,0.08)"
                                        : "transparent",
                                },
                                "& fieldset": {
                                    borderColor: isCustom
                                        ? "#fede5d66 !important"
                                        : undefined,
                                },
                            }}
                        />
                    ) : (
                        <Typography
                            variant="body2"
                            sx={{ textAlign: "center", fontSize: "0.8rem" }}
                        >
                            {days}
                        </Typography>
                    )}
                </Tooltip>
            </TableCell>

            {/* Stat cells */}
            {STAT_COLS.map(({ key, isRate }) => (
                <TableCell
                    key={key}
                    align="right"
                    sx={{
                        py: 0.5,
                        fontFamily: "monospace",
                        fontSize: "0.82rem",
                        minWidth: 46,
                    }}
                >
                    {isLoadingStats ? (
                        <Skeleton
                            width={32}
                            sx={{
                                ml: "auto",
                                bgcolor: "rgba(255,255,255,0.06)",
                            }}
                        />
                    ) : line ? (
                        <span
                            style={{ color: isRate ? "#72f1b8" : "#ffffffee" }}
                        >
                            {formatStat(
                                line,
                                key,
                                shootingDisplayMode,
                                decimals,
                            )}
                        </span>
                    ) : (
                        <span style={{ color: "rgba(255,255,255,0.2)" }}>
                            —
                        </span>
                    )}
                </TableCell>
            ))}

            {/* Delete */}
            <TableCell sx={{ py: 0.5, px: 0.5, width: 36 }}>
                <IconButton
                    size="small"
                    onClick={onDelete}
                    sx={{
                        color: "#fe4450",
                        opacity: 0.5,
                        "&:hover": { opacity: 1 },
                        p: 0.5,
                    }}
                >
                    <DeleteIcon sx={{ fontSize: 16 }} />
                </IconButton>
            </TableCell>
        </TableRow>
    );
}
