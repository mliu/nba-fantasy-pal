import React from "react";
import { Box, Paper, Tooltip, Typography } from "@mui/material";
import type { StatLine } from "../../types";
import { CATEGORIES, lineToCats } from "../../utils/categoryRanks";
import type { ScenarioComparison } from "../../utils/scenario";
import { fmtValue, rk } from "./format";

// Mark colors, validated against the app's dark surface (#241b2f) with the dataviz validator:
// lightness band, chroma, CVD separation and 3:1 contrast all pass for this pair.
const OTHERS = "#9c9c9c";
const HEAD_TO_HEAD = "#e24d8b";
const SCENARIO = "#338ced";
const SURFACE = "#241b2f";

const W = 300;
const H = 54;
const PAD = 14;
const MID = 20;

// Round-number tick values inside [min, max], about `target` of them
function niceTicks(min: number, max: number, target = 4): { values: number[]; step: number } {
    const range = max - min;
    if (!(range > 0)) return { values: [], step: 1 };
    const raw = range / target;
    const mag = Math.pow(10, Math.floor(Math.log10(raw)));
    const norm = raw / mag;
    const step = (norm < 1.5 ? 1 : norm < 3 ? 2 : norm < 7 ? 5 : 10) * mag;
    const values: number[] = [];
    for (let v = Math.ceil(min / step) * step; v <= max + step * 1e-9; v += step) values.push(v);
    return { values, step };
}

interface Props {
    cmp: ScenarioComparison;
    others: { id: number; name: string; line: StatLine }[];
}

function Key({ color, label }: { color: string; label: string }) {
    return (
        <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
            <svg width="12" height="12" aria-hidden>
                <circle cx="6" cy="6" r="5" fill={color} />
            </svg>
            <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.75)" }}>{label}</Typography>
        </Box>
    );
}

// One dot on the line, with a hit area larger than the mark so hovering is easy
function Dot({ x, r, color, tip }: { x: number; r: number; color: string; tip: string }) {
    return (
        <Tooltip arrow title={tip} placement="top">
            <g tabIndex={0} aria-label={tip} style={{ outline: "none", cursor: "default" }}>
                <circle cx={x} cy={MID} r={12} fill="transparent" />
                <circle cx={x} cy={MID} r={r} fill={color} stroke={SURFACE} strokeWidth={2} />
            </g>
        </Tooltip>
    );
}

export function CategoryStrips({ cmp, others }: Props) {
    return (
        <Paper variant="outlined" sx={{ p: 2, mb: 2.5, borderColor: "rgba(73,84,149,0.4)" }}>
            <Box sx={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 2, mb: 1.5 }}>
                <Typography sx={{ fontWeight: 700, fontSize: "0.95rem" }}>Projection by category</Typography>
                <Key color={OTHERS} label="Other teams" />
                <Key color={HEAD_TO_HEAD} label="Head-to-Head" />
                <Key color={SCENARIO} label="Scenario" />
                <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.5)", ml: "auto" }}>
                    Right = stronger. Hover a dot for the team and value.
                </Typography>
            </Box>

            <Box
                sx={{
                    display: "grid",
                    gap: 2,
                    gridTemplateColumns: { xs: "1fr", sm: "repeat(2, 1fr)", lg: "repeat(3, 1fr)" },
                }}
            >
                {CATEGORIES.map((c) => {
                    const mine = cmp.current.ranks[c.key];
                    const scen = cmp.scenario.ranks[c.key];
                    const rivals = others.map((o) => ({ name: o.name, v: lineToCats(o.line)[c.key] }));
                    const all = [...rivals.map((r) => r.v), mine.value, scen.value];
                    const min = Math.min(...all);
                    const max = Math.max(...all);
                    // Stronger is always to the right, so turnovers (fewer is better) run backwards
                    const x = (v: number) => {
                        const t = max === min ? 0.5 : (v - min) / (max - min);
                        return PAD + (c.higherBetter ? t : 1 - t) * (W - 2 * PAD);
                    };
                    const fmt = (v: number) => fmtValue(c.key, v, 1);
                    const ticks = niceTicks(min, max);
                    // Whole numbers when the ticks are, otherwise the usual one decimal
                    const tickLabel = (v: number) => fmtValue(c.key, v, ticks.step >= 1 ? 0 : 1);
                    // When the two highlighted dots coincide, ring the Head-to-Head one so both show
                    const overlap = Math.abs(x(mine.value) - x(scen.value)) < 9;

                    return (
                        <Box key={c.key}>
                            <Box sx={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
                                <Typography sx={{ fontWeight: 700, fontSize: "0.8rem" }}>{c.label}</Typography>
                                <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.7)" }}>
                                    {fmt(mine.value)} ({rk(mine.rank)}) → {fmt(scen.value)} ({rk(scen.rank)})
                                </Typography>
                            </Box>
                            <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label={`${c.label} projection by team`}>
                                <line x1={PAD} x2={W - PAD} y1={MID} y2={MID} stroke="rgba(255,255,255,0.25)" strokeWidth={1.5} strokeLinecap="round" />
                                {ticks.values.map((v) => (
                                    <g key={v} aria-hidden>
                                        <line x1={x(v)} x2={x(v)} y1={MID + 9} y2={MID + 14} stroke="rgba(255,255,255,0.35)" strokeWidth={1} />
                                        <text x={x(v)} y={MID + 25} textAnchor="middle" fontSize={8} fill="rgba(255,255,255,0.55)">
                                            {tickLabel(v)}
                                        </text>
                                    </g>
                                ))}
                                {rivals.map((r) => (
                                    <Dot key={r.name} x={x(r.v)} r={4.5} color={OTHERS} tip={`${r.name}: ${fmt(r.v)}`} />
                                ))}
                                <Dot
                                    x={x(mine.value)}
                                    r={overlap ? 8.5 : 6}
                                    color={HEAD_TO_HEAD}
                                    tip={`Head-to-Head: ${fmt(mine.value)} (rank ${rk(mine.rank)})`}
                                />
                                <Dot
                                    x={x(scen.value)}
                                    r={6}
                                    color={SCENARIO}
                                    tip={`Scenario: ${fmt(scen.value)} (rank ${rk(scen.rank)})`}
                                />
                            </svg>
                        </Box>
                    );
                })}
            </Box>
        </Paper>
    );
}
