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
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { synthwaveTheme } from './theme';
import { MatchupPage } from './components/matchup/MatchupPage';
import logo from './img/logo.svg';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

const TABS = [
  { label: 'Head-to-Head', component: <MatchupPage /> },
  // Future tabs can be added here
];

export default function App() {
  const [tab, setTab] = useState(0);

  return (
    <QueryClientProvider client={queryClient}>
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
              {t.component}
            </Box>
          ))}
        </Box>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
