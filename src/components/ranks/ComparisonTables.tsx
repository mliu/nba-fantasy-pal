import React from "react";
import { Box, Paper, Table, TableBody, TableCell, TableHead, TableRow, Tooltip, Typography } from "@mui/material";
import type { BacktestWeek } from "../../hooks/useCategoryRanks";
import { CATEGORIES, rankDelta, summarize } from "../../utils/categoryRanks";
import type { CatRanks } from "../../utils/categoryRanks";
import type { ScenarioComparison } from "../../utils/scenario";
import { deltaColor, fmtDelta, fmtRankDelta, fmtValue } from "./format";

const LEAGUE_SIZE = 12;

// Internally rank 1 = best; shown Lineup Experts style, where 12 = strongest
const rk = (rank: number) => LEAGUE_SIZE + 1 - rank;

// Red (weakest) → amber → green (strongest). `shown` is the displayed rank, possibly fractional.
function strengthColor(shown: number): string {
    const t = Math.min(1, Math.max(0, (shown - 1) / (LEAGUE_SIZE - 1)));
    return `hsla(${Math.round(t * 130)}, 70%, 45%, 0.45)`;
}

const headCell = { color: "rgba(255,255,255,0.6)", fontWeight: 700, fontSize: "0.72rem", textAlign: "center" as const, px: 1, py: 0.75 };
const cell = { textAlign: "center" as const, px: 1, py: 0.6, fontSize: "0.82rem", whiteSpace: "nowrap" as const };
const labelCell = { ...cell, textAlign: "left" as const, fontWeight: 600, color: "rgba(255,255,255,0.8)" };

function Card({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
    return (
        <Paper variant="outlined" sx={{ p: 2, mb: 2.5, borderColor: "rgba(73,84,149,0.4)", overflowX: "auto" }}>
            <Typography sx={{ fontWeight: 700, fontSize: "0.95rem" }}>{title}</Typography>
            {subtitle && (
                <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.5)", display: "block", mb: 1 }}>
                    {subtitle}
                </Typography>
            )}
            {children}
        </Paper>
    );
}

function Header({ first }: { first: string }) {
    return (
        <TableHead>
            <TableRow>
                <TableCell sx={{ ...headCell, textAlign: "left" }}>{first}</TableCell>
                {CATEGORIES.map((c) => (
                    <TableCell key={c.key} sx={headCell}>{c.label}</TableCell>
                ))}
                <TableCell sx={headCell}>Roto pts</TableCell>
            </TableRow>
        </TableHead>
    );
}

// ── Projection ───────────────────────────────────────────────────────────────

export function ProjectionTable({ cmp }: { cmp: ScenarioComparison }) {
    const { current, scenario } = cmp;
    const d = rankDelta(current.ranks, scenario.ranks);
    const sc = summarize(scenario.ranks, LEAGUE_SIZE).points;
    const cu = summarize(current.ranks, LEAGUE_SIZE).points;

    return (
        <Card
            title="Projection"
            subtitle="Per-game averages: each team's non-IR players' per-game stats summed, ranked against the other 11 teams."
        >
            <Table size="small">
                <Header first="" />
                <TableBody>
                    <TableRow>
                        <TableCell sx={labelCell}>Head-to-Head</TableCell>
                        {CATEGORIES.map((c) => (
                            <TableCell key={c.key} sx={cell}>
                                {fmtValue(c.key, current.ranks[c.key].value, 1)}{" "}
                                <span style={{ color: "rgba(255,255,255,0.5)" }}>({rk(current.ranks[c.key].rank)})</span>
                            </TableCell>
                        ))}
                        <TableCell sx={cell}>{cu}</TableCell>
                    </TableRow>
                    <TableRow>
                        <TableCell sx={labelCell}>Scenario</TableCell>
                        {CATEGORIES.map((c) => (
                            <Tooltip key={c.key} arrow title={<Gap ranks={scenario.ranks} k={c.key} />}>
                                <TableCell sx={{ ...cell, color: deltaColor(d[c.key]), fontWeight: d[c.key] ? 700 : 400 }}>
                                    {fmtValue(c.key, scenario.ranks[c.key].value, 1)} ({rk(scenario.ranks[c.key].rank)})
                                </TableCell>
                            </Tooltip>
                        ))}
                        <TableCell sx={{ ...cell, color: deltaColor(sc - cu), fontWeight: 700 }}>{sc}</TableCell>
                    </TableRow>
                    <TableRow>
                        <TableCell sx={labelCell}>Change</TableCell>
                        {CATEGORIES.map((c) => (
                            <TableCell key={c.key} sx={{ ...cell, color: deltaColor(d[c.key]) }}>
                                <div>{fmtRankDelta(d[c.key])}</div>
                                <div style={{ fontSize: "0.68rem", opacity: 0.8 }}>
                                    {fmtDelta(c.key, scenario.ranks[c.key].value - current.ranks[c.key].value, 1)}
                                </div>
                            </TableCell>
                        ))}
                        <TableCell sx={{ ...cell, color: deltaColor(sc - cu), fontWeight: 700 }}>{fmtRankDelta(sc - cu)}</TableCell>
                    </TableRow>
                </TableBody>
            </Table>
        </Card>
    );
}

function Gap({ ranks, k }: { ranks: CatRanks; k: (typeof CATEGORIES)[number]["key"] }) {
    const r = ranks[k];
    return (
        <Box sx={{ fontSize: "0.75rem" }}>
            {r.gapUp != null && <div>To pass next team up: {fmtValue(k, r.gapUp, 1)}</div>}
            {r.gapDown != null && <div>Lead over next team down: {fmtValue(k, r.gapDown, 1)}</div>}
            {r.gapUp == null && r.gapDown == null && <div>No other teams</div>}
        </Box>
    );
}

// ── Backtest ─────────────────────────────────────────────────────────────────

export function BacktestTable({ weeks }: { weeks: BacktestWeek[] }) {
    if (!weeks.length) {
        return (
            <Card title="Backtest" subtitle="No completed weeks to replay yet." >
                <span />
            </Card>
        );
    }

    const before = weeks.map((w) => summarize(w.comparison.current.ranks, LEAGUE_SIZE));
    const after = weeks.map((w) => summarize(w.comparison.scenario.ranks, LEAGUE_SIZE));
    const avg = (xs: number[]) => xs.reduce((s, x) => s + x, 0) / xs.length;
    // average rank per category across weeks
    const avgRank = (pick: (w: BacktestWeek) => CatRanks) =>
        CATEGORIES.map((c) => avg(weeks.map((w) => pick(w)[c.key].rank)));
    const avgBefore = avgRank((w) => w.comparison.current.ranks);
    const avgAfter = avgRank((w) => w.comparison.scenario.ranks);
    const ptsBefore = avg(before.map((s) => s.points));
    const ptsAfter = avg(after.map((s) => s.points));

    return (
        <Card
            title="Backtest"
            subtitle="Each completed week replayed with your actual totals, minus dropped players' actual stats and plus added players' — re-ranked against the league's actual totals. Cells show your rank (12 = strongest, red → green) and, where the swap changes it, rank → new rank in bold."
        >
            <Table size="small">
                <Header first="Week" />
                <TableBody>
                    {weeks.map((w, i) => {
                        const d = rankDelta(w.comparison.current.ranks, w.comparison.scenario.ranks);
                        const pd = after[i].points - before[i].points;
                        return (
                            <TableRow key={w.period}>
                                <TableCell sx={labelCell}>
                                    <Tooltip arrow title={<SwapNote w={w} />}>
                                        <span>{w.label}</span>
                                    </Tooltip>
                                </TableCell>
                                {CATEGORIES.map((c) => {
                                    const a = w.comparison.current.ranks[c.key];
                                    const b = w.comparison.scenario.ranks[c.key];
                                    return (
                                        <Tooltip
                                            key={c.key}
                                            arrow
                                            title={`${fmtValue(c.key, a.value)} → ${fmtValue(c.key, b.value)} (${fmtDelta(c.key, b.value - a.value)})`}
                                        >
                                            <TableCell sx={{ ...cell, backgroundColor: strengthColor(rk(b.rank)), fontWeight: d[c.key] ? 700 : 400 }}>
                                                {a.rank === b.rank ? rk(a.rank) : `${rk(a.rank)} → ${rk(b.rank)}`}
                                            </TableCell>
                                        </Tooltip>
                                    );
                                })}
                                <TableCell sx={{ ...cell, color: deltaColor(pd) }}>
                                    {before[i].points} → {after[i].points}
                                </TableCell>
                            </TableRow>
                        );
                    })}
                    <TableRow sx={{ "& td": { borderTop: "2px solid rgba(73,84,149,0.6)" } }}>
                        <TableCell sx={labelCell}>Avg rank H2H</TableCell>
                        {avgBefore.map((v, i) => (
                            <TableCell key={i} sx={{ ...cell, backgroundColor: strengthColor(rk(v)) }}>{rk(v).toFixed(1)}</TableCell>
                        ))}
                        <TableCell sx={cell}>{ptsBefore.toFixed(1)}</TableCell>
                    </TableRow>
                    <TableRow>
                        <TableCell sx={labelCell}>Avg rank scenario</TableCell>
                        {avgAfter.map((v, i) => (
                            <TableCell key={i} sx={{ ...cell, backgroundColor: strengthColor(rk(v)), fontWeight: 700 }}>
                                {rk(v).toFixed(1)}
                            </TableCell>
                        ))}
                        <TableCell sx={{ ...cell, color: deltaColor(ptsAfter - ptsBefore), fontWeight: 700 }}>
                            {ptsAfter.toFixed(1)}
                        </TableCell>
                    </TableRow>
                    <TableRow>
                        <TableCell sx={labelCell}>Change</TableCell>
                        {avgBefore.map((v, i) => (
                            <TableCell key={i} sx={{ ...cell, color: deltaColor(v - avgAfter[i]) }}>
                                {fmtDelta("pts", v - avgAfter[i], 1)}
                            </TableCell>
                        ))}
                        <TableCell sx={{ ...cell, color: deltaColor(ptsAfter - ptsBefore), fontWeight: 700 }}>
                            {fmtDelta("pts", ptsAfter - ptsBefore, 1)}
                        </TableCell>
                    </TableRow>
                </TableBody>
            </Table>
            <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.45)", display: "block", mt: 1 }}>
                Roto pts = 12 − rank + 1 summed over the 9 categories (max 108). The "Change" row is green where the scenario is better.
                Whether a player was on your team that week uses your end-of-week roster, so mid-week moves aren't reflected.
            </Typography>
        </Card>
    );
}

function SwapNote({ w }: { w: BacktestWeek }) {
    return (
        <Box sx={{ fontSize: "0.75rem" }}>
            <div>Players removed: {w.droppedIds.length}</div>
            <div>Players added: {w.addedIds.length}</div>
            {w.missingIds.length > 0 && <div>No stats for {w.missingIds.length} player(s)</div>}
        </Box>
    );
}
