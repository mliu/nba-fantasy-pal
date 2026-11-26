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
                        Starts as your Head-to-Head roster. Click a player to remove him; search to add players. This is a draft — your Head-to-Head roster isn't changed.
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
                <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.75, mt: 0.5, mb: 1.5 }}>
                    {data.myRoster
                        .filter((p) => !scenario.dropIds.includes(p.espnId))
                        .map((p) => (
                            <Chip
                                key={p.espnId}
                                size="small"
                                label={`${p.name}${p.isInjuredReserve ? " (IR)" : ""}`}
                                disabled={p.isInjuredReserve}
                                onClick={() => toggleDrop(p.espnId)}
                                variant="outlined"
                            />
                        ))}
                    {scenario.adds.map((a) => (
                        <Chip
                            key={a.espnId}
                            size="small"
                            label={a.name}
                            onClick={() => removeAdd(a.espnId)}
                            variant="outlined"
                        />
                    ))}
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
            <BacktestTable weeks={data.backtest} />
        </Box>
    );
}
