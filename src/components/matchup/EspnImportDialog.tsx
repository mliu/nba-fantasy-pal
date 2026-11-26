import React, { useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Checkbox,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  FormControlLabel,
  InputLabel,
  Link,
  MenuItem,
  Select,
  TextField,
  Typography,
} from '@mui/material';
import { ESPN_PROXY_URL, fetchLeague, type League, type LeagueTeam } from '../../api/espnFantasy';
import { useMatchup } from '../../context/MatchupContext';
import { StorageService } from '../../storage/StorageService';
import { WEEKS, type EspnLeagueCredentials, type WeekKey } from '../../types';

const store = StorageService.getInstance();

interface Props {
  open: boolean;
  onClose: () => void;
}

const EMPTY_CREDS: EspnLeagueCredentials = { leagueId: '', espnS2: '', swid: '' };

export function EspnImportDialog({ open, onClose }: Props) {
  const { myTeam, oppTeam, weekKey, setWeekKey } = useMatchup();
  const [selectedWeek, setSelectedWeek] = useState<WeekKey>(weekKey);
  const [creds, setCreds] = useState<EspnLeagueCredentials>(() => store.getEspnCredentials() ?? EMPTY_CREDS);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [league, setLeague] = useState<League | null>(null);
  const [myTeamId, setMyTeamId] = useState<number | ''>('');
  const [oppTeamId, setOppTeamId] = useState<number | ''>('');
  const [skipIR, setSkipIR] = useState(true);

  const close = () => {
    setLeague(null);
    setError(null);
    setLoading(false);
    onClose();
  };

  const load = async (weekToLoad: WeekKey = selectedWeek) => {
    const trimmed = {
      leagueId: creds.leagueId.trim(),
      espnS2: creds.espnS2.trim(),
      swid: creds.swid.trim(),
    };
    setLoading(true);
    setError(null);
    try {
      const result = await fetchLeague(trimmed, WEEKS.find((w) => w.key === weekToLoad));
      store.setEspnCredentials(trimmed);
      setCreds(trimmed);
      setLeague(result);
      setMyTeamId(result.myTeamId ?? '');
      setOppTeamId(result.opponentTeamId ?? '');
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  };

  // Saved credentials: skip the form and load straight away (for the app's current week)
  useEffect(() => {
    if (!open || !ESPN_PROXY_URL || league) return;
    setSelectedWeek(weekKey);
    if (store.getEspnCredentials()) void load(weekKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const changeWeek = (w: WeekKey) => {
    setSelectedWeek(w);
    void load(w);
  };

  const forget = () => {
    store.clearEspnCredentials();
    setCreds(EMPTY_CREDS);
    setLeague(null);
  };

  const importTeams = () => {
    if (!league) return;
    const apply = (teamId: number | '', target: typeof myTeam) => {
      const team = league.teams.find((t) => t.id === teamId);
      if (!team) return;
      target.replacePlayers(team.players.filter((p) => !(skipIR && p.isInjuredReserve)));
      target.setTeamName(team.name);
    };
    apply(myTeamId, myTeam);
    apply(oppTeamId, oppTeam);
    setWeekKey(selectedWeek);
    close();
  };

  const teamSelect = (label: string, value: number | '', onChange: (v: number | '') => void) => (
    <FormControl size="small" fullWidth>
      <InputLabel>{label}</InputLabel>
      <Select value={value} label={label} onChange={(e) => onChange(e.target.value as number | '')}>
        <MenuItem value="">
          <em>Don't import</em>
        </MenuItem>
        {league!.teams.map((t: LeagueTeam) => (
          <MenuItem key={t.id} value={t.id}>
            {t.name} ({t.players.length})
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  );

  const credsComplete = creds.leagueId.trim() && creds.espnS2.trim() && creds.swid.trim();

  return (
    <Dialog open={open} onClose={close} fullWidth maxWidth="sm">
      <DialogTitle>Import from ESPN league</DialogTitle>
      <DialogContent>
        {!ESPN_PROXY_URL ? (
          <Alert severity="info">
            ESPN league import needs the proxy in <code>worker/</code>. Deploy it and set{' '}
            <code>VITE_ESPN_PROXY_URL</code> (see <code>worker/README.md</code>).
          </Alert>
        ) : !league ? (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, pt: 1 }}>
            <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.6)' }}>
              While logged in to ESPN fantasy, open dev tools → Application → Cookies →
              fantasy.espn.com and copy <code>espn_s2</code> and <code>SWID</code>. They're saved
              in this browser only.
            </Typography>
            <TextField
              size="small"
              label="League ID"
              value={creds.leagueId}
              onChange={(e) => setCreds({ ...creds, leagueId: e.target.value })}
            />
            <TextField
              size="small"
              label="espn_s2"
              type="password"
              value={creds.espnS2}
              onChange={(e) => setCreds({ ...creds, espnS2: e.target.value })}
            />
            <TextField
              size="small"
              label="SWID"
              type="password"
              placeholder="{XXXXXXXX-XXXX-…}"
              value={creds.swid}
              onChange={(e) => setCreds({ ...creds, swid: e.target.value })}
            />
            {store.getEspnCredentials() && (
              <Link component="button" variant="caption" onClick={forget} sx={{ alignSelf: 'flex-start' }}>
                Forget saved credentials
              </Link>
            )}
            {error && <Alert severity="error">{error}</Alert>}
          </Box>
        ) : (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, pt: 1 }}>
            <FormControl size="small" fullWidth>
              <InputLabel>Week</InputLabel>
              <Select
                value={selectedWeek}
                label="Week"
                disabled={loading}
                onChange={(e) => changeWeek(e.target.value as WeekKey)}
              >
                {WEEKS.map((w) => (
                  <MenuItem key={w.key} value={w.key}>
                    {w.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            {league.myTeamId === null && (
              <Alert severity="warning">Couldn't find a team owned by this SWID — pick one below.</Alert>
            )}
            {teamSelect('Your team', myTeamId, setMyTeamId)}
            {teamSelect('Opponent', oppTeamId, setOppTeamId)}
            <FormControlLabel
              control={<Checkbox size="small" checked={skipIR} onChange={(e) => setSkipIR(e.target.checked)} />}
              label={<Typography variant="body2">Skip players in IR slots</Typography>}
            />
            <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.5)' }}>
              Opponent is your matchup for the selected week; past weeks show rosters as of that
              week's last day. This replaces the current players on each team you import.
            </Typography>
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={close}>Cancel</Button>
        {ESPN_PROXY_URL && !league && (
          <Button
            variant="contained"
            disabled={!credsComplete || loading}
            onClick={() => load()}
            startIcon={loading ? <CircularProgress size={14} /> : undefined}
          >
            Load league
          </Button>
        )}
        {league && (
          <Button variant="contained" disabled={myTeamId === '' && oppTeamId === ''} onClick={importTeams}>
            Import
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}
