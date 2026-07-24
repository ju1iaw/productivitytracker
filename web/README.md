# Productivity Tracker (Web)

Web port of the macOS Productivity Tracker. Totals timed calendar events by calendar for Day / Week / Month.

## Calendar sources

| Source | How |
|---|---|
| **Google Calendar** | Sign in with Google (OAuth). Requires `VITE_GOOGLE_CLIENT_ID`. |
| **ICS import** | Upload `.ics` files. Use this for **Apple Calendar / iCloud** (no public Apple Calendar web API). |
| Apple Calendar | Export from Calendar.app → **File → Export → Export…**, then import the `.ics`. Or sync the calendar into Google and use Google sign-in. |

## Setup

```bash
cd web
cp .env.example .env
# edit .env with your Google client ID (optional if using ICS only)
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173).

### Google Cloud setup

1. Create a project in [Google Cloud Console](https://console.cloud.google.com/).
2. Enable **Google Calendar API**.
3. Create **OAuth 2.0 Client ID** → application type **Web application**.
4. Authorized JavaScript origins: `http://localhost:5173`
5. Copy the Client ID into `web/.env` as `VITE_GOOGLE_CLIENT_ID`.
6. Restart the dev server.

OAuth consent screen: add your Google account as a test user while the app is in Testing.

## Duration rules (same as macOS app)

- Timed events count; all-day events are excluded
- Events spanning period boundaries are clipped to the range
- Overlapping events both count (no de-overlapping)

## Scripts

- `npm run dev` — local dev server
- `npm run build` — production build
- `npm run preview` — preview production build
