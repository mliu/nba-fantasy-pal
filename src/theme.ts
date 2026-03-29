import { createTheme } from '@mui/material/styles';

// Palette derived from the SynthWave '84 VS Code theme
export const synthwaveTheme = createTheme({
  palette: {
    mode: 'dark',
    background: {
      default: '#262335',
      paper:   '#241b2f',
    },
    primary: {
      main:  '#ff7edb',
      light: '#ff9ee4',
      dark:  '#cc64af',
    },
    secondary: {
      main:  '#36f9f6',
      light: '#72f9f7',
      dark:  '#22d0cc',
    },
    error:   { main: '#fe4450' },
    warning: { main: '#fede5d' },
    success: { main: '#72f1b8' },
    info:    { main: '#03edf9' },
    text: {
      primary:   '#ffffff',
      secondary: 'rgba(255,255,255,0.6)',
      disabled:  'rgba(255,255,255,0.35)',
    },
    divider: '#34294f',
  },
  typography: {
    fontFamily: '"Inter", "Roboto", sans-serif',
    h6: { fontWeight: 600 },
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: { backgroundColor: '#262335', color: '#ffffff' },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: { backgroundImage: 'none' },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          background: 'linear-gradient(90deg, #171520 0%, #241b2f 100%)',
          borderBottom: '1px solid #34294f',
          boxShadow: '0 2px 20px rgba(255,126,219,0.08)',
        },
      },
    },
    MuiTabs: {
      styleOverrides: {
        indicator: { backgroundColor: '#ff7edb', height: 2 },
      },
    },
    MuiTab: {
      styleOverrides: {
        root: {
          color: 'rgba(255,255,255,0.5)',
          textTransform: 'none',
          fontSize: '0.875rem',
          fontWeight: 500,
          '&.Mui-selected': { color: '#ff7edb' },
          '&:hover': { color: 'rgba(255,255,255,0.85)' },
        },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        head: {
          backgroundColor: '#171520',
          color: 'rgba(255,255,255,0.5)',
          fontWeight: 600,
          fontSize: '0.7rem',
          textTransform: 'uppercase',
          letterSpacing: '0.06em',
          padding: '8px 10px',
          whiteSpace: 'nowrap',
          borderBottom: '1px solid #34294f',
        },
        body: {
          color: 'rgba(255,255,255,0.9)',
          borderColor: 'rgba(52,41,79,0.4)',
          padding: '4px 10px',
          fontSize: '0.85rem',
        },
      },
    },
    MuiTableRow: {
      styleOverrides: {
        root: {
          '&:hover': { backgroundColor: 'rgba(52,41,79,0.35)' },
          '&:last-child td, &:last-child th': { borderBottom: 0 },
        },
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          '& fieldset': { borderColor: '#495495' },
          '&:hover fieldset': { borderColor: '#ff7edb88 !important' },
          '&.Mui-focused fieldset': { borderColor: '#ff7edb !important' },
        },
      },
    },
    MuiInputLabel: {
      styleOverrides: {
        root: {
          color: 'rgba(255,255,255,0.5)',
          '&.Mui-focused': { color: '#ff7edb' },
        },
      },
    },
    MuiSelect: {
      styleOverrides: {
        icon: { color: 'rgba(255,255,255,0.5)' },
      },
    },
    MuiMenuItem: {
      styleOverrides: {
        root: {
          '&.Mui-selected': { backgroundColor: 'rgba(255,126,219,0.15)' },
          '&.Mui-selected:hover': { backgroundColor: 'rgba(255,126,219,0.25)' },
        },
      },
    },
    MuiToggleButton: {
      styleOverrides: {
        root: {
          color: 'rgba(255,255,255,0.5)',
          borderColor: '#495495',
          textTransform: 'none',
          fontSize: '0.8rem',
          padding: '4px 14px',
          '&.Mui-selected': {
            color: '#ff7edb',
            backgroundColor: 'rgba(255,126,219,0.12)',
            borderColor: '#ff7edb66',
          },
          '&.Mui-selected:hover': {
            backgroundColor: 'rgba(255,126,219,0.2)',
          },
        },
      },
    },
    MuiIconButton: {
      styleOverrides: {
        root: {
          color: 'rgba(255,255,255,0.4)',
          '&:hover': { color: 'rgba(255,255,255,0.8)' },
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: { borderColor: '#495495' },
      },
    },
    MuiAutocomplete: {
      styleOverrides: {
        paper: {
          backgroundColor: '#2a2139',
          border: '1px solid #495495',
        },
        option: {
          '&[aria-selected="true"]': { backgroundColor: 'rgba(255,126,219,0.15)' },
          '&[data-focus="true"]': { backgroundColor: 'rgba(255,126,219,0.08)' },
        },
      },
    },
    MuiTooltip: {
      styleOverrides: {
        tooltip: {
          backgroundColor: '#2a2139',
          border: '1px solid #495495',
          fontSize: '0.75rem',
        },
        arrow: { color: '#2a2139' },
      },
    },
  },
});
