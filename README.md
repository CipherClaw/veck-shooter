# Veck Shooter

A blocky browser arena FPS inspired by the feel of `veck.io`: first-person weapons, low-poly maps, Socket.IO multiplayer rooms, chat, match timers, team/free-play scoring, and cookie/localStorage-backed guest identity with server-side lifetime stats.

## Features

- React + Vite + TypeScript client with Three.js / React Three Fiber rendering.
- Node.js + Express + Socket.IO server with per-match rooms and authoritative-ish hit validation.
- Three maps: Pyramid, Practice Range, and Forest.
- Five weapons: Revolver, Sniper Rifle, Grenade, Shottie, and Water Gun.
- Lobby flow with guest name persistence, profanity filtering, active game list, create/join controls, stats, and lobby chat.
- Match flow with max 8 players, free-play/team mode, friendly-fire prevention, timers, respawn, kill feed, scoreboard, in-game chat, pause/help overlay, generated weapon/reload/explosion sounds, and mute toggle.
- SQLite persistence for kills, deaths, wins, games played, and coin awards.
- Railway-ready build/start config.

## Local Development

```bash
npm install
npm run dev
```

Client dev server: `http://localhost:5173`

Server/API/Socket.IO: `http://localhost:3000`

For a production-style local run:

```bash
npm run build
npm start
```

Then open `http://localhost:3000`.

## Controls

- `WASD` move
- Mouse look with pointer lock
- Left click fire
- Right click sniper scope
- `R` reload
- `Space` jump
- `Shift` sprint
- `1-5` select weapon
- `Enter` chat
- `Escape` pause/help

## Tests And Validation

```bash
npm run test
npm run build
```

The server tests cover team allocation, friendly-fire prevention, player limit enforcement, and winner calculation.

## Deployment

Railway can deploy the repo directly with the included `railway.json`.

Pushes to `main` automatically redeploy the production Railway service through `.github/workflows/railway-deploy.yml`. The workflow expects a GitHub repository secret named `RAILWAY_API_TOKEN`.

Manual deploys can still be triggered from this repo with the Railway token wrapper documented in `AGENTS.md`.

Build command:

```bash
npm run railway:build
```

Start command:

```bash
npm run railway:start
```

Optional environment variables:

- `PORT`: set automatically by Railway.
- `CORS_ORIGIN`: comma-separated allowed origins. Omit for same-service deploy.
- `SQLITE_PATH`: custom SQLite file path. For durable Railway persistence, mount a volume and point this at the mounted path.

## Architecture

- `shared`: common TypeScript types, constants, weapon specs, and game contracts.
- `server`: Express static hosting, Socket.IO realtime events, game hub/rules, chat/name filtering, SQLite stats store.
- `client`: React UI, Zustand state, Socket.IO client, Three.js maps/avatars/weapons, HUD and lobby screens.

## Known Limitations

- Hit validation is server-side ray/distance validation, but movement is client-reported with server clamping rather than full physics authority.
- Ammo is validated server-side but the HUD currently emphasizes selected weapon/reload state rather than exact per-weapon server ammo counts.
- SQLite persistence is included; Railway durability requires configuring a mounted volume or swapping to Postgres later.
