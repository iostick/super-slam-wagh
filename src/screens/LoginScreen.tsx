import { Box, Button, Card, CardContent, Stack, Typography } from '@mui/material'
import { useState } from 'react'
import { useAuth } from '../lib/auth'

function DiscordIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M20.3 4.4A19.8 19.8 0 0 0 15.4 3l-.6 1.3a18.3 18.3 0 0 0-5.6 0L8.6 3a19.7 19.7 0 0 0-4.9 1.4C.6 9 0 13.6.3 18.1a19.9 19.9 0 0 0 6 3l1.3-2.1a12.9 12.9 0 0 1-2-1l.5-.4a14.2 14.2 0 0 0 12 0l.5.4c-.7.4-1.3.7-2 1l1.3 2.1a19.8 19.8 0 0 0 6-3c.5-5.2-.8-9.8-3.6-13.7ZM8.5 15.3c-1.2 0-2.2-1.1-2.2-2.4s1-2.4 2.2-2.4 2.2 1.1 2.2 2.4-1 2.4-2.2 2.4Zm7 0c-1.2 0-2.2-1.1-2.2-2.4s1-2.4 2.2-2.4 2.2 1.1 2.2 2.4-1 2.4-2.2 2.4Z" />
    </svg>
  )
}

export default function LoginScreen() {
  const { signIn } = useAuth()
  const [busy, setBusy] = useState(false)
  return (
    <Box sx={{ display: 'grid', placeItems: 'center', minHeight: '100dvh', p: 2, background: 'radial-gradient(circle at 50% 20%, #3a1212 0%, #121212 60%)' }}>
      <Card sx={{ maxWidth: 420, width: '100%' }}>
        <CardContent>
          <Stack spacing={3} sx={{ alignItems: 'center', textAlign: 'center', py: 2 }}>
            <Box component="img" src="./icon.svg" alt="" sx={{ width: 88, height: 88 }} />
            <Box>
              <Typography variant="h4">Super Slam Wagh</Typography>
              <Typography color="text.secondary">Liga de Warhammer 40.000 del servidor</Typography>
            </Box>
            <Button
              size="large"
              variant="contained"
              startIcon={<DiscordIcon />}
              disabled={busy}
              onClick={() => {
                setBusy(true)
                signIn().catch(() => setBusy(false))
              }}
              sx={{ bgcolor: '#5865F2', '&:hover': { bgcolor: '#4752c4' }, px: 4 }}
            >
              Entrar con Discord
            </Button>
            <Typography variant="caption" color="text.secondary">
              Usamos tu nombre y avatar de Discord para la liga.
            </Typography>
          </Stack>
        </CardContent>
      </Card>
    </Box>
  )
}
