# Veck Shooter

## Purpose

This project is for the new `veck-shooter` workstream.

## Discord Bridge

- Discord channel: `#veck-shooter`
- Discord channel ID: `1502741218365542582`
- Local project context: `/srv/codex-work/projects/veck-shooter`

The Discord bridge is configured in `/srv/codex-work/projects/discord-codex-bridge` and polls this project through `discord_project_pairs.json`.

## Notes

- Keep project-specific setup, build, test, deploy, and architecture notes here as decisions are made.
- Maps are pure data in `shared/src/index.ts` (`MapName` union + `MAPS` + `ARENAS`); visuals in `client/src/components/Maps.tsx` (`ArenaMap` auto-renders every collider as a box, plus per-map detail components). Server validates via `MAPS.includes`. App.tsx map picker reads `MAPS`. Adding a map = edit those two files only.
- Physics constraint: player Y is hard-clamped to `[1.2, 12]`; jump only fires at `pos.y <= 1.22` (world floor); max hop ≈1.6. No negative Y. Multi-level maps must put the lowest playable floor at y≈1.2 and stack upward (e.g. the Subway map inverts: subway = world floor, street = elevated deck on top). Stand-y = `collider.center.y + size.y/2 + 1.2`. Stairs = stacked `climbable` step boxes rising ≤0.95 each.
- Build/validate: `npm run build` (shared→client→server), `npm test` (server vitest), `npm run lint`.
- After code or deploy-relevant config changes, confirm whether Railway needs an update. If the change should be live, push the GitHub commit and trigger/verify the Railway deployment as needed.
- Do not store secrets, tokens, private keys, or passwords in this file.

## Railway

Use the shared token wrapper per the workspace root `AGENTS.md` ("Railway Credentials
And CLI"). Do not rely on cached `railway login`.

- Railway project: `veck-shooter`, environment `production`, service `veck-shooter`
- Public URL: `https://veck-shooter-production.up.railway.app`
