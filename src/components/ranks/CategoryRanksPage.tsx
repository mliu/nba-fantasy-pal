import React, { useState } from "react";
import {
    Alert,
    Box,
    Button,
    Chip,
    FormControl,
    InputLabel,
    LinearProgress,
    MenuItem,
    Paper,
    Select,
    Typography,
} from "@mui/material";
import SyncAltIcon from "@mui/icons-material/SyncAlt";
import { AddPlayerSearch } from "../matchup/AddPlayerSearch";
import { BacktestTable, ProjectionTable } from "./ComparisonTables";
import { CategoryStrips } from "./CategoryStrips";
import { useCategoryRanks } from "../../hooks/useCategoryRanks";
import { StorageService } from "../../storage/StorageService";
import { TIME_WINDOWS } from "../../types";
import type { RosterScenario, TimeWindow } from "../../types";
import type { PlayerSearchResult } from "../../api/espn";

const store = StorageService.getInstance();

export function CategoryRanksPage() {
    const creds = store.getEspnCredentials();
    const [timeWindow, setTimeWindow] = useState<TimeWindow>(() => store.getTimeWindow());
    // The Head-to-Head roster is what everything is compared against. This tab mounts lazily, so
    // it's re-read each time the tab is opened.
    const [headToHead] = useState(() => store.getMyPlayers());
    // The roster being edited; null until edited, meaning "same as Head-to-Head"
    const [edited, setEdited] = useState<RosterScenario | null>(() => store.getScenario());
    const setScenario = (s: RosterScenario | null) => {
        setEdited(s);
        store.setScenario(s);
    };

    const data = useCategoryRanks(creds, timeWindow, edited, headToHead);
    const scenario = data.scenario;

    if (!creds) {
        return (
            <Box sx={{ p: 2.5 }}>
                <Alert severity="info">
                    Connect your ESPN league first: use "Import from ESPN" on the Head-to-Head tab, then come back here.
                </Alert>
            </Box>
        );
    }

    const toggleDrop = (id: string) =>
        setScenario({
            ...scenario,
            dropIds: scenario.dropIds.includes(id) ? scenario.dropIds.filter((x) => x !== id) : [...scenario.dropIds, id],
        });
    const addPlayer = (p: PlayerSearchResult) => {
        // Someone from my ESPN roster who was removed: restore him rather than adding a duplicate
        if (scenario.dropIds.includes(p.espnId)) return toggleDrop(p.espnId);
        if (scenario.adds.some((a) => a.espnId === p.espnId)) return;
        setScenario({
            ...scenario,
            adds: [...scenario.adds, { espnId: p.espnId, name: p.name, teamId: p.teamId, teamAbbr: p.teamAbbr }],
        });
    };
    // Back to exactly the Head-to-Head roster
    const loadFromHeadToHead = () => setScenario(null);
    const removeAdd = (id: string) => setScenario({ ...scenario, adds: scenario.adds.filter((a) => a.espnId !== id) });

    // Players in the Head-to-Head roster that I've taken out of the editor, so they can be put back
    const rosterOf = (spec: RosterScenario) =>
        new Map<string, string>([
            ...data.myRoster.filter((p) => !p.isInjuredReserve && !spec.dropIds.includes(p.espnId)).map((p) => [p.espnId, p.name] as const),
            ...spec.adds.map((a) => [a.espnId, a.name] as const),
        ]);
    const inScenario = rosterOf(scenario);
    // IR players moved into the lineup for this scenario are just adds, since only active players count
    const activatedIds = new Set(
        data.myRoster.filter((p) => p.isInjuredReserve && scenario.adds.some((a) => a.espnId === p.espnId)).map((p) => p.espnId),
    );
    const activateIR = (p: { espnId: string; name: string; teamId: string; teamAbbr: string }) =>
        setScenario({
            ...scenario,
            adds: [...scenario.adds, { espnId: p.espnId, name: p.name, teamId: p.teamId, teamAbbr: p.teamAbbr }],
        });
    const irCount = data.myRoster.filter((p) => p.isInjuredReserve && !activatedIds.has(p.espnId)).length;
    const removed = [...rosterOf(data.baseline)].filter(([id]) => !inScenario.has(id));
    const restore = (id: string) => {
        const base = data.baseline.adds.find((a) => a.espnId === id);
        // a Head-to-Head-only player goes back as an add; an ESPN-roster player just stops being dropped
        if (base) setScenario({ ...scenario, adds: [...scenario.adds, base] });
        else toggleDrop(id);
    };
    const loadingLogs = data.progress.loaded < data.progress.total;
    const rosterIds = data.myRoster.map((p) => p.espnId);

    return (
        <Box sx={{ p: { xs: 1.5, md: 2.5 } }}>
            <Box sx={{ display: "flex", flexWrap: "wrap", gap: 2, alignItems: "center", mb: 2 }}>
                <FormControl size="small" sx={{ minWidth: 160 }}>
                    <InputLabel>Stats Window</InputLabel>
                    <Select value={timeWindow} label="Stats Window" onChange={(e) => setTimeWindow(e.target.value as TimeWindow)}>
                        {TIME_WINDOWS.map((tw) => (
                            <MenuItem key={tw.value} value={tw.value}>{tw.label}</MenuItem>
                        ))}
                    </Select>
                </FormControl>
                <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.5)" }}>
                    Ranks: 12 = strongest, 1 = weakest. Stats window applies to the projection only; the backtest uses what players actually did.
                </Typography>
            </Box>

            {data.error && <Alert severity="error" sx={{ mb: 2 }}>{data.error}</Alert>}
            {(data.isLoading || loadingLogs) && (
                <Box sx={{ mb: 2 }}>
                    <LinearProgress
                        variant={data.progress.total ? "determinate" : "indeterminate"}
                        value={data.progress.total ? (100 * data.progress.loaded) / data.progress.total : 0}
                    />
                    <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.5)" }}>
                        {data.progress.total
                            ? `Loading player stats ${data.progress.loaded}/${data.progress.total} (cached after the first load)`
                            : "Loading league…"}
                    </Typography>
                </Box>
            )}
            {data.missingLogIds.length > 0 && (
                <Alert severity="warning" sx={{ mb: 2 }}>
                    No game log for {data.missingLogIds.length} player(s) (e.g. no games yet) — they're left out of totals.
                </Alert>
            )}

            {/* Scenario editor: edits a draft, never your real roster */}
            <Paper variant="outlined" sx={{ p: 2, mb: 2.5, borderColor: "rgba(73,84,149,0.4)" }}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 1 }}>
                    <Typography sx={{ fontWeight: 700, fontSize: "0.95rem" }}>Scenario</Typography>
                    <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.5)" }}>
                        Starts as your Head-to-Head roster. Click a player to remove him; search to add players (shown in green with a +). Click an IR player to move him into the lineup. This is a draft — your Head-to-Head roster isn't changed.
                    </Typography>
                    <Button
                        size="small"
                        sx={{ ml: "auto" }}
                        startIcon={<SyncAltIcon sx={{ fontSize: 16 }} />}
                        disabled={edited === null}
                        onClick={loadFromHeadToHead}
                    >
                        Load from Head-to-Head
                    </Button>
                </Box>

                <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.6)" }}>
                    Your roster{data.league ? ` (${data.league.teams.find((t) => t.id === data.myTeamId)?.name ?? ""})` : ""}
                </Typography>
                {data.myRoster.length > 0 && (
                    <Chip
                        size="small"
                        label={`${inScenario.size} active${irCount ? ` · ${irCount} IR` : ""}`}
                        sx={{ ml: 1, height: 18, fontSize: "0.7rem" }}
                    />
                )}
                <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.75, mt: 0.5, mb: 1.5 }}>
                    {data.myRoster
                        // an IR player who's been activated shows below, as a scenario add
                        .filter((p) => !scenario.dropIds.includes(p.espnId) && !activatedIds.has(p.espnId))
                        .map((p) => (
                            <Chip
                                key={p.espnId}
                                size="small"
                                label={`${p.name}${p.isInjuredReserve ? " (IR)" : ""}`}
                                onClick={() => (p.isInjuredReserve ? activateIR(p) : toggleDrop(p.espnId))}
                                title={p.isInjuredReserve ? "On IR: click to add him to the scenario lineup" : undefined}
                                variant="outlined"
                                sx={p.isInjuredReserve ? { opacity: 0.65, borderStyle: "dashed" } : undefined}
                            />
                        ))}
                    {scenario.adds.map((a) => {
                        // Players already on the Head-to-Head roster aren't scenario additions
                        const isNew = !data.baseline.adds.some((b) => b.espnId === a.espnId);
                        return (
                            <Chip
                                key={a.espnId}
                                size="small"
                                label={`${isNew ? "+ " : ""}${a.name}${activatedIds.has(a.espnId) ? " (from IR)" : ""}`}
                                onClick={() => removeAdd(a.espnId)}
                                variant="outlined"
                                color={isNew ? "success" : "default"}
                                title={
                                    activatedIds.has(a.espnId)
                                        ? "Moved off IR in this scenario only (click to put him back)"
                                        : isNew
                                          ? "Added in this scenario only (click to remove)"
                                          : undefined
                                }
                            />
                        );
                    })}
                    {!data.myRoster.length && (
                        <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.4)" }}>Loading roster…</Typography>
                    )}
                </Box>

                {removed.length > 0 && (
                    <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.75, alignItems: "center", mb: 1.5 }}>
                        <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.6)" }}>Removed (click to re-add):</Typography>
                        {removed.map(([id, name]) => (
                            <Chip key={id} size="small" color="error" label={name} onClick={() => restore(id)} />
                        ))}
                    </Box>
                )}

                <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1, alignItems: "center" }}>
                    <AddPlayerSearch onSelect={addPlayer} excludeIds={[...rosterIds.filter((id) => !scenario.dropIds.includes(id)), ...scenario.adds.map((a) => a.espnId)]} />
                </Box>
            </Paper>

            {data.projection && <ProjectionTable cmp={data.projection} />}
            {data.projection && (
                <CategoryStrips cmp={data.projection} others={data.standings.filter((t) => t.id !== data.myTeamId)} />
            )}
            <BacktestTable weeks={data.backtest} />
        </Box>
    );
}
