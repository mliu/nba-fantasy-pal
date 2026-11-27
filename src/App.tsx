import React, { useState } from 'react';
import {
  AppBar,
  Box,
  CssBaseline,
  Tab,
  Tabs,
  Toolbar,
  Typography,
} from '@mui/material';
import { ThemeProvider } from '@mui/material/styles';
import { QueryClient } from '@tanstack/react-query';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { idbPersister, PERSIST_BUSTER, PERSIST_MAX_AGE } from './queryPersist';
import { synthwaveTheme } from './theme';
import { MatchupPage } from './components/matchup/MatchupPage';
import { CategoryRanksPage } from './components/ranks/CategoryRanksPage';
import logo from './img/logo.svg';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      // must be >= the persister's maxAge or restored entries are garbage-collected immediately
      gcTime: PERSIST_MAX_AGE,
    },
  },
});

const TABS = [
  { label: 'Head-to-Head', component: <MatchupPage />, lazy: false },
  // lazy: only mounted while selected, since it loads the whole league
  { label: 'Category Ranks', component: <CategoryRanksPage />, lazy: true },
];

export default function App() {
  const [tab, setTab] = useState(0);

  return (
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{
        persister: idbPersister,
        maxAge: PERSIST_MAX_AGE,
        buster: PERSIST_BUSTER,
        dehydrateOptions: {
          shouldDehydrateQuery: (q) => q.state.status === 'success' && q.meta?.persist === true,
        },
      }}
    >
      <ThemeProvider theme={synthwaveTheme}>
        <CssBaseline />
        <Box sx={{ minHeight: '100vh', backgroundColor: 'background.default' }}>
          <AppBar position="sticky" elevation={0}>
            <Toolbar variant="dense" sx={{ gap: 2 }}>
              {/* Logo mark */}
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Box
                  component="img"
                  src={logo}
                  alt="logo"
                  sx={{ width: 28, height: 28, borderRadius: 1 }}
                />
                <Typography
                  variant="h6"
                  sx={{
                    fontSize: '0.95rem',
                    fontWeight: 700,
                    background: 'linear-gradient(90deg, #ff7edb 0%, #36f9f6 100%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    letterSpacing: '-0.01em',
                  }}
                >
                  Fantasy NBA
                </Typography>
              </Box>

              {/* Tabs */}
              <Tabs
                value={tab}
                onChange={(_, v) => setTab(v)}
                sx={{ ml: 2, '& .MuiTabs-root': { minHeight: 48 } }}
              >
                {TABS.map((t, i) => (
                  <Tab key={i} label={t.label} disableRipple />
                ))}
              </Tabs>
            </Toolbar>
          </AppBar>

          {/* Tab panels */}
          {TABS.map((t, i) => (
            <Box
              key={i}
              role="tabpanel"
              hidden={tab !== i}
              sx={{ display: tab === i ? 'block' : 'none' }}
            >
              {t.lazy && tab !== i ? null : t.component}
            </Box>
          ))}
        </Box>
      </ThemeProvider>
    </PersistQueryClientProvider>
  );
}
