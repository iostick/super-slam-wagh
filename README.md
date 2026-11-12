# Super Slam Wagh

Web app para gestionar la liga de Warhammer 40.000 del servidor de Discord: temporada suiza por puntos, eliminatorias, listas de ejército, avisos en Discord y estadísticas. Es una PWA (se instala en el móvil y el ordenador) con diseño Material, hecha con React + Vite + TypeScript + MUI y Supabase.

## Hoja de ruta

1. **Base** (hecho): login con Discord, roles de admin y jugador, tablas de Supabase y calendario de la temporada configurable por el admin.
2. **Inscripción y listas**: inscribirse y subir la lista (importada de War Army o pegada como texto), validada con el motor de War Army.
3. **Liga automática**: pairings suizos, reporte y confirmación de resultados, doble derrota al pasar el plazo, eliminatorias y avisos en Discord.
4. **Estadísticas**: clasificación, rachas, filtros por ejército y destacamento.
5. **Mathhammer**: calculadora de daño esperado con los perfiles de las unidades y la lista del rival de la jornada.

## Puesta en marcha

### 1. Supabase

1. Crea un proyecto en [supabase.com](https://supabase.com).
2. En **SQL Editor > New query** pega todo el contenido de [`supabase/schema.sql`](supabase/schema.sql) y pulsa **Run**. Se puede volver a ejecutar sin perder datos.
3. En **Project Settings > API** copia la **Project URL** y la clave **publishable** (o `anon`).

La **primera cuenta que inicie sesión queda como administrador**. Desde la pantalla Admin > Jugadores puede dar el rol de admin a otros.

### 2. Login con Discord

1. En el [Discord Developer Portal](https://discord.com/developers/applications) crea una aplicación y, en **OAuth2**, copia el **Client ID** y el **Client Secret**.
2. En **OAuth2 > Redirects** añade `https://<tu-proyecto>.supabase.co/auth/v1/callback`.
3. En Supabase, **Authentication > Sign In / Providers > Discord**: actívalo y pega el Client ID y el Client Secret.
4. En Supabase, **Authentication > URL Configuration**: pon como *Site URL* la dirección donde se publique la app (por ejemplo `https://iostick.github.io/super-slam-wagh/`) y añade `http://localhost:5173/**` en *Redirect URLs* para probar en local.
5. Opcional: para comprobar que cada jugador está en el servidor de la liga, activa el modo desarrollador de Discord, haz clic derecho en el servidor > **Copiar ID** y ponlo en `VITE_DISCORD_GUILD_ID`.

### 3. Variables

Copia `.env.example` como `.env.local` y rellénalo. Para publicar en GitHub Pages, añade las mismas variables en el repositorio en **Settings > Secrets and variables > Actions > Variables**: `VITE_SUPABASE_URL`, `VITE_SUPABASE_KEY` y, si quieres, `VITE_DISCORD_GUILD_ID`. Después activa **Settings > Pages > Source: GitHub Actions**.

### 4. Desarrollo

```bash
npm install
npm run dev     # http://localhost:5173
npm test        # pruebas del calendario
npm run build
```

## Cómo funciona el calendario

El admin elige la fecha de inicio, las jornadas suizas, los días por jornada, el tamaño de las eliminatorias y las pausas (por ejemplo, Navidad). Los días de pausa no cuentan como días de juego y alargan la jornada en la que caen. El límite de cada ronda es su último día a las 23:59; una partida sin resultado a esa hora se cuenta como doble derrota (paso 3). La app recomienda el número de jornadas (log2 de los jugadores, mínimo 3) y el top (4 desde 6 jugadores, 8 desde 16).
