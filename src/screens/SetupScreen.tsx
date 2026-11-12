import { Box, Card, CardContent, Typography } from '@mui/material'

export default function SetupScreen() {
  return (
    <Box sx={{ display: 'grid', placeItems: 'center', minHeight: '100dvh', p: 2 }}>
      <Card sx={{ maxWidth: 520 }}>
        <CardContent>
          <Typography variant="h5" gutterBottom>
            Falta conectar Supabase
          </Typography>
          <Typography color="text.secondary">
            Copia <code>.env.example</code> como <code>.env.local</code> y rellena <code>VITE_SUPABASE_URL</code> y{' '}
            <code>VITE_SUPABASE_KEY</code> con los datos de tu proyecto de Supabase. Los pasos completos están en el README.
          </Typography>
        </CardContent>
      </Card>
    </Box>
  )
}
