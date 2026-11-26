import type { CatKey } from "../../utils/categoryRanks";
import { CATEGORIES } from "../../utils/categoryRanks";

const isRate = (k: CatKey) => CATEGORIES.find((c) => c.key === k)!.isRate;

// ".450" like Lineup Experts; counting stats as integers (weekly) or one decimal (per game)
export function fmtValue(k: CatKey, v: number, decimals = 0): string {
    return isRate(k) ? v.toFixed(3).replace(/^0/, "") : v.toFixed(decimals);
}

export function fmtDelta(k: CatKey, v: number, decimals = 0): string {
    const sign = v > 0 ? "+" : v < 0 ? "−" : "";
    const abs = Math.abs(v);
    return sign + (isRate(k) ? abs.toFixed(3).replace(/^0/, "") : abs.toFixed(decimals));
}

export const GOOD = "#72f1b8";
export const BAD = "#fe4450";

// rank delta: positive = moved toward 1st
export const deltaColor = (d: number) => (d > 0 ? GOOD : d < 0 ? BAD : "rgba(255,255,255,0.55)");
export const fmtRankDelta = (d: number) => (d > 0 ? `+${d}` : d < 0 ? `−${Math.abs(d)}` : "–");
