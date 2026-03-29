import React from 'react';
import {
  TableRow,
  TableCell,
  IconButton,
  TextField,
  Skeleton,
  Tooltip,
  Box,
  Typography,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/DeleteOutline';
import ArrowUpwardIcon from '@mui/icons-material/KeyboardArrowUp';
import ArrowDownwardIcon from '@mui/icons-material/KeyboardArrowDown';
import type { PlayerEntry, PlayerStats, DisplayMode } from '../../types';
import { STAT_COLS } from '../../types';

interface Props {
  player: PlayerEntry;
  stats: PlayerStats | null;
  isLoadingStats: boolean;
  scheduledGames: number;
  isLoadingSchedule: boolean;
  displayMode: DisplayMode;
  isFirst: boolean;
  isLast: boolean;
  onDelete: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onChangeDays: (days: number | null) => void;
}

function formatStat(
  stats: PlayerStats,
  key: keyof PlayerStats,
  isRate: boolean,
  displayMode: DisplayMode,
  days: number
): string {
  const raw = stats[key] as number;
  if (isRate && displayMode === 'ev') {
    // In EV mode show projected makes/attempts for the week
    const [madeKey, attKey] = key === 'fgPct'
      ? ['fgm', 'fga'] as const
      : ['ftm', 'fta'] as const;
    const made = (stats[madeKey] as number) * days;
    const att  = (stats[attKey]  as number) * days;
    return `${made.toFixed(1)}/${att.toFixed(1)}`;
  }
  if (isRate) return `${raw.toFixed(1)}%`;
  const v = displayMode === 'ev' ? raw * days : raw;
  return v.toFixed(1);
}

export function PlayerRow({
  player,
  stats,
  isLoadingStats,
  scheduledGames,
  isLoadingSchedule,
  displayMode,
  isFirst,
  isLast,
  onDelete,
  onMoveUp,
  onMoveDown,
  onChangeDays,
}: Props) {
  const effectiveDays = player.customDays !== null ? player.customDays : scheduledGames;
  const isCustom = player.customDays !== null;

  return (
    <TableRow>
      {/* Reorder controls */}
      <TableCell sx={{ py: 0.25, px: 0.5, width: 52 }}>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
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
      <TableCell sx={{ py: 0.5, whiteSpace: 'nowrap', minWidth: 140 }}>
        <Typography variant="body2" sx={{ fontWeight: 500, color: '#ff7edb', lineHeight: 1.2 }}>
          {player.name}
        </Typography>
        <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.35)', fontSize: '0.68rem' }}>
          {player.teamAbbr}
        </Typography>
      </TableCell>

      {/* Days input */}
      <TableCell sx={{ py: 0.5, width: 64 }}>
        <Tooltip
          title={
            isLoadingSchedule
              ? 'Loading schedule…'
              : isCustom
              ? `Override active (auto: ${scheduledGames})`
              : `${scheduledGames} scheduled game${scheduledGames !== 1 ? 's' : ''} this week`
          }
          arrow
        >
          <TextField
            type="number"
            size="small"
            value={effectiveDays}
            onChange={(e) => {
              const n = parseInt(e.target.value, 10);
              onChangeDays(isNaN(n) ? null : Math.max(0, Math.min(7, n)));
            }}
            inputProps={{
              min: 0,
              max: 7,
              style: { textAlign: 'center', padding: '3px 4px', width: 36, fontSize: '0.8rem' },
            }}
            sx={{
              '& .MuiInputBase-root': {
                height: 28,
                backgroundColor: isCustom ? 'rgba(254,222,93,0.08)' : 'transparent',
              },
              '& fieldset': {
                borderColor: isCustom ? '#fede5d66 !important' : undefined,
              },
            }}
          />
        </Tooltip>
      </TableCell>

      {/* Stat cells */}
      {STAT_COLS.map(({ key, isRate }) => (
        <TableCell
          key={key}
          align="right"
          sx={{ py: 0.5, fontFamily: 'monospace', fontSize: '0.82rem', minWidth: 46 }}
        >
          {isLoadingStats ? (
            <Skeleton width={32} sx={{ ml: 'auto', bgcolor: 'rgba(255,255,255,0.06)' }} />
          ) : stats ? (
            <span style={{ color: isRate ? '#72f1b8' : '#ffffffee' }}>
              {formatStat(stats, key, isRate, displayMode, effectiveDays)}
            </span>
          ) : (
            <span style={{ color: 'rgba(255,255,255,0.2)' }}>—</span>
          )}
        </TableCell>
      ))}

      {/* Delete */}
      <TableCell sx={{ py: 0.5, px: 0.5, width: 36 }}>
        <IconButton
          size="small"
          onClick={onDelete}
          sx={{ color: '#fe4450', opacity: 0.5, '&:hover': { opacity: 1 }, p: 0.5 }}
        >
          <DeleteIcon sx={{ fontSize: 16 }} />
        </IconButton>
      </TableCell>
    </TableRow>
  );
}
