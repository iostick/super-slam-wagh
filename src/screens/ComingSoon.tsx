import Construction from '@mui/icons-material/Construction'
import { Card, CardContent, Chip, Stack, Typography } from '@mui/material'

export default function ComingSoon({ title, text, step }: { title: string; text: string; step: string }) {
  return (
    <Stack spacing={2}>
      <Typography variant="h4">{title}</Typography>
      <Card>
        <CardContent>
          <Stack direction="row" spacing={2} sx={{ alignItems: 'center' }}>
            <Construction color="secondary" />
            <Typography sx={{ flexGrow: 1 }}>{text}</Typography>
            <Chip label={step} size="small" />
          </Stack>
        </CardContent>
      </Card>
    </Stack>
  )
}
