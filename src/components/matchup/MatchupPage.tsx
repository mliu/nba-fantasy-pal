import React, { useState } from 'react';
import {
  Box,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
  Chip,
} from '@mui/material';
import BarChartIcon from '@mui/icons-material/BarChart';
import EventNoteIcon from '@mui/icons-material/EventNote';
import { TeamSection } from './TeamSection';
import { StorageService } from '../../storage/StorageService';
import type { PlayerEntry, TimeWindow, DisplayMode, WeekKey } from '../../types';
import { WEEKS, TIME_WINDOWS } from '../../types';

const store = StorageService.getInstance();

export function MatchupPage() {
  const [myPlayers,    setMyPlayersState]   = useState<PlayerEntry[]>(() => store.getMyPlayers());
  const [oppPlayers,   setOppPlayersState]  = useState<PlayerEntry[]>(() => store.getOppPlayers());
  const [myTeamName,   setMyTeamNameState]  = useState(() => store.getMyTeamName());
  const [oppTeamName,  setOppTeamNameState] = useState(() => store.getOppTeamName());
  const [weekKey,      setWeekKeyState]     = useState<WeekKey>(() => store.getSelectedWeek());
  const [timeWindow,   setTimeWindowState]  = useState<TimeWindow>(() => store.getTimeWindow());
  const [displayMode,  setDisplayModeState] = useState<DisplayMode>(() => store.getDisplayMode());

  // Persist + update state helpers
  const setMyPlayers = (p: PlayerEntry[]) => { setMyPlayersState(p); store.setMyPlayers(p); };
  const setOppPlayers = (p: PlayerEntry[]) => { setOppPlayersState(p); store.setOppPlayers(p); };
  const setMyTeamName = (n: string) => { setMyTeamNameState(n); store.setMyTeamName(n); };
  const setOppTeamName = (n: string) => { setOppTeamNameState(n); store.setOppTeamName(n); };
  const setWeekKey = (w: WeekKey) => { setWeekKeyState(w); store.setSelectedWeek(w); };
  const setTimeWindow = (tw: TimeWindow) => { setTimeWindowState(tw); store.setTimeWindow(tw); };
  const setDisplayMode = (m: DisplayMode) => { setDisplayModeState(m); store.setDisplayMode(m); };

  const selectedWeek = WEEKS.find(w => w.key === weekKey)!;

  return (
    <Box sx={{ p: { xs: 1.5, md: 2.5 }, maxWidth: '100%' }}>
      {/* ── Controls bar ── */}
      <Box
        sx={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 2,
          alignItems: 'center',
          mb: 2.5,
          pb: 2,
          borderBottom: '1px solid rgba(73,84,149,0.4)',
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
            {WEEKS.map(w => (
              <MenuItem key={w.key} value={w.key}>{w.label}</MenuItem>
            ))}
          </Select>
        </FormControl>

        {/* Time window selector */}
        <FormControl size="small" sx={{ minWidth: 150 }}>
          <InputLabel>Stats Window</InputLabel>
          <Select
            value={timeWindow}
            label="Stats Window"
            onChange={(e) => setTimeWindow(e.target.value as TimeWindow)}
          >
            {TIME_WINDOWS.map(tw => (
              <MenuItem key={tw.value} value={tw.value}>{tw.label}</MenuItem>
            ))}
          </Select>
        </FormControl>

        {/* Per Game / EV toggle */}
        <ToggleButtonGroup
          value={displayMode}
          exclusive
          onChange={(_, v) => { if (v) setDisplayMode(v as DisplayMode); }}
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
        </ToggleButtonGroup>

        {/* Context chip */}
        <Box sx={{ ml: 'auto', display: 'flex', gap: 1 }}>
          <Chip
            label={`${selectedWeek.start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${selectedWeek.end.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`}
            size="small"
            sx={{
              backgroundColor: 'rgba(54,249,246,0.1)',
              color: '#36f9f6',
              border: '1px solid rgba(54,249,246,0.25)',
              fontSize: '0.72rem',
            }}
          />
        </Box>
      </Box>

      {/* ── Team sections ── */}
      <Box
        sx={{
          display: 'flex',
          gap: 2.5,
          flexDirection: { xs: 'column', lg: 'row' },
          alignItems: 'flex-start',
        }}
      >
        <TeamSection
          label="Your Team"
          teamName={myTeamName}
          players={myPlayers}
          timeWindow={timeWindow}
          weekKey={weekKey}
          displayMode={displayMode}
          accentColor="#ff7edb"
          onTeamNameChange={setMyTeamName}
          onPlayersChange={setMyPlayers}
        />

        {/* VS divider (visible on large screens) */}
        <Box
          sx={{
            display: { xs: 'none', lg: 'flex' },
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            pt: 4,
            flexShrink: 0,
            gap: 0.5,
          }}
        >
          <Box sx={{ width: 1, height: 40, backgroundColor: 'rgba(73,84,149,0.4)' }} />
          <Typography
            sx={{
              color: 'rgba(255,255,255,0.25)',
              fontSize: '0.7rem',
              fontWeight: 700,
              letterSpacing: '0.15em',
              textTransform: 'uppercase',
            }}
          >
            vs
          </Typography>
          <Box sx={{ width: 1, height: 40, backgroundColor: 'rgba(73,84,149,0.4)' }} />
        </Box>

        <TeamSection
          label="Opponent"
          teamName={oppTeamName}
          players={oppPlayers}
          timeWindow={timeWindow}
          weekKey={weekKey}
          displayMode={displayMode}
          accentColor="#36f9f6"
          onTeamNameChange={setOppTeamName}
          onPlayersChange={setOppPlayers}
        />
      </Box>
    </Box>
  );
}
