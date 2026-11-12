import { Box, CircularProgress } from '@mui/material'
import { Navigate, Route, Routes } from 'react-router-dom'
import Layout from './components/Layout'
import { useAuth } from './lib/auth'
import { isConfigured } from './lib/supabase'
import AdminScreen from './screens/AdminScreen'
import CalendarScreen from './screens/CalendarScreen'
import ComingSoon from './screens/ComingSoon'
import HomeScreen from './screens/HomeScreen'
import LoginScreen from './screens/LoginScreen'
import ProfileScreen from './screens/ProfileScreen'
import SetupScreen from './screens/SetupScreen'

export default function App() {
  const { loading, session, isAdmin } = useAuth()

  if (!isConfigured) return <SetupScreen />
  if (loading)
    return (
      <Box sx={{ display: 'grid', placeItems: 'center', minHeight: '100dvh' }}>
        <CircularProgress />
      </Box>
    )
  if (!session) return <LoginScreen />

  return (
    <Layout>
      <Routes>
        <Route path="/" element={<HomeScreen />} />
        <Route path="/calendario" element={<CalendarScreen />} />
        <Route path="/clasificacion" element={<ComingSoon title="Clasificación" step="paso 3" text="La tabla de puntos, los pairings y los brackets aparecerán aquí cuando arranque la liga." />} />
        <Route path="/listas" element={<ComingSoon title="Listas" step="paso 2" text="Aquí podrás inscribirte y subir tu lista, importada de War Army o pegada como texto." />} />
        <Route path="/perfil" element={<ProfileScreen />} />
        <Route path="/admin" element={isAdmin ? <AdminScreen /> : <Navigate to="/" replace />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Layout>
  )
}
