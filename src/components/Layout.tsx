import AdminPanelSettings from '@mui/icons-material/AdminPanelSettings'
import CalendarMonth from '@mui/icons-material/CalendarMonth'
import Home from '@mui/icons-material/Home'
import ListAlt from '@mui/icons-material/ListAlt'
import Leaderboard from '@mui/icons-material/Leaderboard'
import {
  AppBar,
  Avatar,
  BottomNavigation,
  BottomNavigationAction,
  Box,
  Drawer,
  IconButton,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Paper,
  Toolbar,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material'
import type { ReactNode } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../lib/auth'

const DRAWER = 240

export default function Layout({ children }: { children: ReactNode }) {
  const theme = useTheme()
  const desktop = useMediaQuery(theme.breakpoints.up('md'))
  const { profile, isAdmin } = useAuth()
  const navigate = useNavigate()
  const { pathname } = useLocation()

  const items = [
    { to: '/', label: 'Inicio', icon: <Home /> },
    { to: '/calendario', label: 'Calendario', icon: <CalendarMonth /> },
    { to: '/clasificacion', label: 'Clasificación', icon: <Leaderboard /> },
    { to: '/listas', label: 'Listas', icon: <ListAlt /> },
    ...(isAdmin ? [{ to: '/admin', label: 'Admin', icon: <AdminPanelSettings /> }] : []),
  ]
  const current = items.find((i) => i.to === pathname)?.to ?? false

  const avatar = (
    <IconButton onClick={() => navigate('/perfil')} aria-label="Mi perfil">
      <Avatar src={profile?.avatar_url ?? undefined} sx={{ width: 34, height: 34 }}>
        {profile?.display_name?.[0]}
      </Avatar>
    </IconButton>
  )

  return (
    <Box sx={{ display: 'flex', minHeight: '100dvh' }}>
      <AppBar position="fixed" color="default" elevation={0} sx={{ zIndex: (t) => t.zIndex.drawer + 1, borderBottom: 1, borderColor: 'divider', bgcolor: 'background.paper' }}>
        <Toolbar>
          <Box component="img" src="./icon.svg" alt="" sx={{ width: 32, height: 32, mr: 1.5 }} />
          <Typography variant="h5" sx={{ flexGrow: 1 }} noWrap>
            Super Slam Wagh
          </Typography>
          {avatar}
        </Toolbar>
      </AppBar>

      {desktop && (
        <Drawer variant="permanent" sx={{ width: DRAWER, flexShrink: 0, '& .MuiDrawer-paper': { width: DRAWER, boxSizing: 'border-box' } }}>
          <Toolbar />
          <List sx={{ px: 1 }}>
            {items.map((i) => (
              <ListItemButton key={i.to} selected={current === i.to} onClick={() => navigate(i.to)} sx={{ borderRadius: 6, mb: 0.5 }}>
                <ListItemIcon>{i.icon}</ListItemIcon>
                <ListItemText primary={i.label} />
              </ListItemButton>
            ))}
          </List>
        </Drawer>
      )}

      <Box component="main" sx={{ flexGrow: 1, minWidth: 0, px: { xs: 2, md: 4 }, pt: 10, pb: desktop ? 4 : 11 }}>
        <Box sx={{ maxWidth: 960, mx: 'auto' }}>{children}</Box>
      </Box>

      {!desktop && (
        <Paper elevation={3} sx={{ position: 'fixed', left: 0, right: 0, bottom: 0, pb: 'env(safe-area-inset-bottom)' }}>
          <BottomNavigation value={current} onChange={(_, v) => navigate(v)} showLabels>
            {items.map((i) => (
              <BottomNavigationAction key={i.to} value={i.to} label={i.label} icon={i.icon} sx={{ minWidth: 0, px: 0.5 }} />
            ))}
          </BottomNavigation>
        </Paper>
      )}
    </Box>
  )
}
