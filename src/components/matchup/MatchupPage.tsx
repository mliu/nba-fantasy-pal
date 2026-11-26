import React, { useState } from "react";
import {
    Box,
    Button,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    ToggleButton,
    ToggleButtonGroup,
    Typography,
    Chip,
} from "@mui/material";
import BarChartIcon from "@mui/icons-material/BarChart";
import EventNoteIcon from "@mui/icons-material/EventNote";
import CloudDownloadIcon from "@mui/icons-material/CloudDownloadOutlined";
import UpdateIcon from "@mui/icons-material/Update";
import { TeamSection } from "./TeamSection";
import { EspnImportDialog } from "./EspnImportDialog";
import { MatchupProvider, useMatchup } from "../../context/MatchupContext";
import type {
    TimeWindow,
    DisplayMode,
    WeekKey,
    ShootingDisplayMode,
    RestView,
} from "../../types";
import { WEEKS, TIME_WINDOWS } from "../../types";

function MatchupContent() {
    const {
        weekKey,
        timeWindow,
        displayMode,
        shootingDisplayMode,
        restView,
        setWeekKey,
        setTimeWindow,
        setDisplayMode,
        setShootingDisplayMode,
        setRestView,
    } = useMatchup();
    const selectedWeek = WEEKS.find((w) => w.key === weekKey)!;
    const [importOpen, setImportOpen] = useState(false);

    return (
        <Box sx={{ p: { xs: 1.5, md: 2.5 }, maxWidth: "100%" }}>
            {/* ── Controls bar ── */}
            <Box
                sx={{
                    display: "flex",
                    flexWrap: "wrap",
                    gap: 2,
                    alignItems: "center",
                    mb: 2.5,
                    pb: 2,
                    borderBottom: "1px solid rgba(73,84,149,0.4)",
                }}
            >
                {/* Week selector */}
                <FormControl size="small" sx={{ minWidth: 210 }}>
                    <InputLabel>Matchup Week</InputLabel>
                    <Select
                        value={weekKey}
                        label="Matchup Week"
                        onChange={(e) => setWeekKey(e.target.value as WeekKey)}
                    >
                        {WEEKS.map((w) => (
                            <MenuItem key={w.key} value={w.key}>
                                {w.label}
                            </MenuItem>
                        ))}
                    </Select>
                </FormControl>

                {/* Time window selector */}
                <FormControl size="small" sx={{ minWidth: 150 }}>
                    <InputLabel>Stats Window</InputLabel>
                    <Select
                        value={timeWindow}
                        label="Stats Window"
                        onChange={(e) =>
                            setTimeWindow(e.target.value as TimeWindow)
                        }
                    >
                        {TIME_WINDOWS.map((tw) => (
                            <MenuItem key={tw.value} value={tw.value}>
                                {tw.label}
                            </MenuItem>
                        ))}
                    </Select>
                </FormControl>

                {/* Per Game / EV toggle */}
                <ToggleButtonGroup
                    value={displayMode}
                    exclusive
                    onChange={(_, v) => {
                        if (v) setDisplayMode(v as DisplayMode);
                    }}
                    size="small"
                >
                    <ToggleButton value="avg">
                        <BarChartIcon sx={{ fontSize: 15, mr: 0.75 }} />
                        Per Game
                    </ToggleButton>
                    <ToggleButton value="ev">
                        <EventNoteIcon sx={{ fontSize: 15, mr: 0.75 }} />
                        Week EV
                    </ToggleButton>
                    <ToggleButton value="rest">
                        <UpdateIcon sx={{ fontSize: 15, mr: 0.75 }} />
                        Rest of Week
                    </ToggleButton>
                </ToggleButtonGroup>

                {/* Rest of Week: which stats the player rows show */}
                {displayMode === "rest" && (
                    <ToggleButtonGroup
                        value={restView}
                        exclusive
                        onChange={(_, v) => {
                            if (v) setRestView(v as RestView);
                        }}
                        size="small"
                    >
                        <ToggleButton value="sofar">Week so far</ToggleButton>
                        <ToggleButton value="remaining">Remaining</ToggleButton>
                    </ToggleButtonGroup>
                )}

                {/* FG% / FT% display toggle */}
                <ToggleButtonGroup
                    value={shootingDisplayMode}
                    exclusive
                    onChange={(_, v) => {
                        if (v) setShootingDisplayMode(v as ShootingDisplayMode);
                    }}
                    size="small"
                >
                    <ToggleButton value="pct">FG/FT %</ToggleButton>
                    <ToggleButton value="ratio">M/A</ToggleButton>
                </ToggleButtonGroup>

                <Button
                    size="small"
                    startIcon={<CloudDownloadIcon sx={{ fontSize: 16 }} />}
                    onClick={() => setImportOpen(true)}
                >
                    Import from ESPN
                </Button>

                {/* Context chip */}
                <Box sx={{ ml: "auto", display: "flex", gap: 1 }}>
                    <Chip
                        label={`${selectedWeek.start.toLocaleDateString("en-US", { month: "short", day: "numeric" })} – ${selectedWeek.end.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`}
                        size="small"
                        sx={{
                            backgroundColor: "rgba(54,249,246,0.1)",
                            color: "#36f9f6",
                            border: "1px solid rgba(54,249,246,0.25)",
                            fontSize: "0.72rem",
                        }}
                    />
                </Box>
            </Box>

            {/* ── Team sections ── */}
            <Box
                sx={{
                    display: "flex",
                    gap: 2.5,
                    flexDirection: { xs: "column", lg: "row" },
                    alignItems: "flex-start",
                }}
            >
                <TeamSection
                    side="my"
                    label="Your Team"
                    accentColor="#ff7edb"
                />

                {/* VS divider (visible on large screens) */}
                <Box
                    sx={{
                        display: { xs: "none", lg: "flex" },
                        flexDirection: "column",
                        alignItems: "center",
                        justifyContent: "center",
                        pt: 4,
                        flexShrink: 0,
                        gap: 0.5,
                    }}
                >
                    <Box
                        sx={{
                            width: 1,
                            height: 40,
                            backgroundColor: "rgba(73,84,149,0.4)",
                        }}
                    />
                    <Typography
                        sx={{
                            color: "rgba(255,255,255,0.25)",
                            fontSize: "0.7rem",
                            fontWeight: 700,
                            letterSpacing: "0.15em",
                            textTransform: "uppercase",
                        }}
                    >
                        vs
                    </Typography>
                    <Box
                        sx={{
                            width: 1,
                            height: 40,
                            backgroundColor: "rgba(73,84,149,0.4)",
                        }}
                    />
                </Box>

                <TeamSection
                    side="opp"
                    label="Opponent"
                    accentColor="#36f9f6"
                />
            </Box>

            <EspnImportDialog
                open={importOpen}
                onClose={() => setImportOpen(false)}
            />
        </Box>
    );
}

export function MatchupPage() {
    return (
        <MatchupProvider>
            <MatchupContent />
        </MatchupProvider>
    );
}
