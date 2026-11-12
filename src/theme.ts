import { createTheme } from '@mui/material/styles'

// Material Design en modo oscuro, con el rojo y el dorado de la liga
export const theme = createTheme({
  palette: {
    mode: 'dark',
    primary: { main: '#e53935' },
    secondary: { main: '#ffca28' },
    background: { default: '#121212', paper: '#1d1d1d' },
  },
  shape: { borderRadius: 12 },
  typography: {
    fontFamily: 'Roboto, system-ui, sans-serif',
    h4: { fontFamily: '"Roboto Condensed", Roboto, sans-serif', fontWeight: 700, letterSpacing: 0.5 },
    h5: { fontFamily: '"Roboto Condensed", Roboto, sans-serif', fontWeight: 700 },
    h6: { fontWeight: 500 },
  },
  components: {
    MuiButton: { defaultProps: { disableElevation: true }, styleOverrides: { root: { textTransform: 'none', borderRadius: 20 } } },
    MuiCard: { defaultProps: { variant: 'outlined' } },
  },
})
