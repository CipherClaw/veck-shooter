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
- After code or deploy-relevant config changes, confirm whether Railway needs an update. If the change should be live, push the GitHub commit and trigger/verify the Railway deployment as needed.
- Do not store secrets, tokens, private keys, or passwords in this file.

## Railway

Use the shared token wrapper per the workspace root `AGENTS.md` ("Railway Credentials
And CLI"). Do not rely on cached `railway login`.

- Railway project: `veck-shooter`, environment `production`, service `veck-shooter`
- Public URL: `https://veck-shooter-production.up.railway.app`
