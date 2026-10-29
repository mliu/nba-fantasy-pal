import React, { useState } from 'react';
import {
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
  Typography,
  Box,
} from '@mui/material';
import { searchPlayers, type PlayerSearchResult } from '../../api/espn';
import { parseRosterNames } from '../../utils/parseRoster';

interface Props {
  open: boolean;
  onClose: () => void;
  onAdd: (players: PlayerSearchResult[]) => void;
}

const normalize = (s: string) =>
  s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9 ]/g, '').replace(/\s+/g, ' ').trim();

async function resolveName(name: string): Promise<PlayerSearchResult | null> {
  const results = await searchPlayers(name);
  if (results.length === 0) return null;
  const target = normalize(name);
  return results.find((r) => normalize(r.name) === target) ?? results[0];
}

export function BulkAddDialog({ open, onClose, onAdd }: Props) {
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [found, setFound] = useState<PlayerSearchResult[] | null>(null);
  const [missing, setMissing] = useState<string[]>([]);

  const reset = () => {
    setText('');
    setFound(null);
    setMissing([]);
    setLoading(false);
  };

  const close = () => {
    reset();
    onClose();
  };

  const find = async () => {
    const names = parseRosterNames(text);
    setLoading(true);
    const resolved = await Promise.all(names.map((n) => resolveName(n).catch(() => null)));
    const hits: PlayerSearchResult[] = [];
    const misses: string[] = [];
    resolved.forEach((r, i) => {
      if (r && !hits.some((h) => h.espnId === r.espnId)) hits.push(r);
      else if (!r) misses.push(names[i]);
    });
    setFound(hits);
    setMissing(misses);
    setLoading(false);
  };

  return (
    <Dialog open={open} onClose={close} fullWidth maxWidth="sm">
      <DialogTitle>Add multiple players</DialogTitle>
      <DialogContent>
        <Typography variant="body2" sx={{ mb: 1.5, color: 'rgba(255,255,255,0.6)' }}>
          Paste your roster from the ESPN team page (or a list of names, one per line).
        </Typography>
        <TextField
          multiline
          minRows={6}
          maxRows={12}
          fullWidth
          autoFocus
          value={text}
          onChange={(e) => { setText(e.target.value); setFound(null); }}
          placeholder="Paste here…"
        />
        {found && (
          <Box sx={{ mt: 2 }}>
            <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.5)' }}>
              Found {found.length} player{found.length === 1 ? '' : 's'}
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75, mt: 0.5 }}>
              {found.map((p) => (
                <Chip
                  key={p.espnId}
                  size="small"
                  label={`${p.name} · ${p.teamAbbr}`}
                  onDelete={() => setFound(found.filter((f) => f.espnId !== p.espnId))}
                />
              ))}
            </Box>
            {missing.length > 0 && (
              <Typography variant="caption" sx={{ display: 'block', mt: 1, color: '#ff7edb' }}>
                Not found: {missing.join(', ')}
              </Typography>
            )}
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={close}>Cancel</Button>
        {found ? (
          <Button
            variant="contained"
            disabled={found.length === 0}
            onClick={() => { onAdd(found); close(); }}
          >
            Add {found.length}
          </Button>
        ) : (
          <Button
            variant="contained"
            disabled={!text.trim() || loading}
            onClick={find}
            startIcon={loading ? <CircularProgress size={14} /> : undefined}
          >
            Find players
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}
