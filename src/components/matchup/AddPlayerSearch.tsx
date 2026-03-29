import React, { useState, useEffect } from 'react';
import {
  Autocomplete,
  TextField,
  CircularProgress,
  Box,
  Typography,
} from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import { searchPlayers, type PlayerSearchResult } from '../../api/espn';

interface Props {
  onSelect: (player: PlayerSearchResult) => void;
}

export function AddPlayerSearch({ onSelect }: Props) {
  const [inputValue, setInputValue] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(inputValue), 300);
    return () => clearTimeout(t);
  }, [inputValue]);

  const { data: results = [], isFetching } = useQuery({
    queryKey: ['playerSearch', debouncedQuery],
    queryFn: () => searchPlayers(debouncedQuery),
    enabled: debouncedQuery.length >= 2,
    staleTime: 1000 * 60 * 5,
  });

  return (
    <Autocomplete
      size="small"
      options={results}
      getOptionLabel={(opt) => opt.name}
      filterOptions={(x) => x}
      inputValue={inputValue}
      onInputChange={(_, v) => setInputValue(v)}
      onChange={(_, v) => {
        if (v) {
          onSelect(v);
          setInputValue('');
        }
      }}
      loading={isFetching}
      noOptionsText={
        debouncedQuery.length < 2
          ? 'Type at least 2 characters'
          : isFetching
          ? 'Searching…'
          : 'No players found'
      }
      renderOption={({ key, ...props }, opt) => (
        <Box
          key={key}
          component="li"
          {...props}
          sx={{ display: 'flex', gap: 1, alignItems: 'center', py: 0.75 }}
        >
          <Typography variant="body2" sx={{ fontWeight: 500 }}>
            {opt.name}
          </Typography>
          <Typography variant="caption" sx={{ color: '#36f9f6', ml: 'auto' }}>
            {opt.teamAbbr}
          </Typography>
          {opt.position && (
            <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.4)' }}>
              {opt.position}
            </Typography>
          )}
        </Box>
      )}
      renderInput={(params) => (
        <TextField
          {...params}
          placeholder="Search & add player…"
          variant="outlined"
          InputProps={{
            ...params.InputProps,
            endAdornment: (
              <>
                {isFetching && <CircularProgress size={14} sx={{ color: '#ff7edb' }} />}
                {params.InputProps.endAdornment}
              </>
            ),
          }}
          sx={{ minWidth: 260 }}
        />
      )}
    />
  );
}
