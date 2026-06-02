# Uday Pratap Singh — Portfolio (monorepo)

```
portfolio-next/
├── web/                 # Next.js 15 (App Router, TS, Tailwind) frontend  →  udayps.com
│   ├── src/
│   │   ├── app/         #   layout, page, globals.css
│   │   ├── components/  #   Hero, Hero3D, Projects, LivePresence, Effects, …
│   │   └── lib/         #   projects.ts (content/data)
│   ├── public/          #   project cover SVGs, résumé PDF
│   └── Dockerfile       #   standalone Next image
│
├── api/                 # Express + WebSocket + SQLite backend  →  udayps.com/api, /ws
│   ├── src/
│   │   ├── config/      #   env config
│   │   ├── db/          #   better-sqlite3 connection + schema
│   │   ├── repositories/#   data access (visits, chat)
│   │   ├── services/    #   presence, telemetry, chat, geo
│   │   ├── websocket/   #   ws server + connection handler
│   │   ├── routes/      #   REST: /health, /stats
│   │   ├── middleware/  #   adminAuth, errorHandler
│   │   └── utils/       #   logger, ip
│   ├── data/            #   SQLite file (Docker volume mount target)
│   └── Dockerfile
│
└── docker-compose.yml   # web + api + persistent volume + Traefik routing (Dokploy)
```

## What the backend does
- **Live presence** over WebSocket: distinct users (visitor-id in localStorage + IP +
  client fingerprint), tab grouping ("N of these tabs are yours"), and a desktop/mobile split.
- **Visitor telemetry** captured on connect (URL, referrer, UA, languages, platform, GPU,
  screen, timezone, fingerprint, …), geolocated to city via ip-api.com, and **persisted to
  SQLite** in a mounted volume. Telemetry stays server-side; visitors only ever see aggregate
  counts.
- **Live chat** (desktop only on the client), persisted to SQLite with recent history replay.
- **REST**: `GET /api/health` (public), `GET /api/stats` + `/api/stats/recent`
  (guarded by `ADMIN_TOKEN` when set).

## Local development
Two terminals:

```bash
# 1) backend
cd api
cp .env.example .env
npm install
npm run dev            # http://localhost:4000  (REST /api, WS /ws)

# 2) frontend
cd web
npm install
echo "NEXT_PUBLIC_WS_URL=ws://localhost:4000/ws" > .env.local
npm run dev            # http://localhost:3000
```

In production the frontend talks to the **same origin** `/ws` (Traefik routes it to the
API container), so `NEXT_PUBLIC_WS_URL` is only needed locally.

## Deploy on Dokploy
1. Push this repo; create a **Docker Compose** application pointing at `docker-compose.yml`.
2. Set the domain **udayps.com** (Dokploy wires Traefik via the labels in the compose file;
   `/api` and `/ws` automatically route to the API, everything else to the web app).
3. (Optional) set `ADMIN_TOKEN` in the Dokploy env to protect `/api/stats`.
4. The `portfolio-data` volume keeps the SQLite visitor database across redeploys.

## Editing content
- Projects: `web/src/lib/projects.ts`
- Covers / résumé: `web/public/assets/`, `web/public/Resume__Uday_PS.pdf`
- Nameplate rotates through variants `02 → 06 → 10 → 11` on each load (localStorage), see
  `initBrand` in `web/src/components/Effects.tsx`.
