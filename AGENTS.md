# Veck Shooter

## Purpose

This project is for the new `veck-shooter` workstream.

## Discord Bridge

- Discord channel: `#veck-shooter`
- Discord channel ID: `1502741218365542582`
- Local project context: `/home/ssm-user/work/projects/veck-shooter`

The Discord bridge is configured in `/home/ssm-user/work/projects/discord-codex-bridge` and polls this project through `discord_project_pairs.json`.

## Notes

- Keep project-specific setup, build, test, deploy, and architecture notes here as decisions are made.
- After code or deploy-relevant config changes, confirm whether Railway needs an update. If the change should be live, push the GitHub commit and trigger/verify the Railway deployment as needed.
- Do not store secrets, tokens, private keys, or passwords in this file.

## Railway

Railway CLI auth is non-interactive on this host. Do not rely on cached `railway login` state. Use the shared token wrapper for all Railway commands:

- Token file: `/home/ssm-user/work/secrets/railway.env`
- Wrapper: `/home/ssm-user/work/shared/scripts/railway-with-token.sh`
- Linked Railway project: `veck-shooter`
- Environment: `production`
- Service: `veck-shooter`
- Public URL: `https://veck-shooter-production.up.railway.app`

Useful commands from this repo:

```sh
/home/ssm-user/work/shared/scripts/railway-with-token.sh status
/home/ssm-user/work/shared/scripts/railway-with-token.sh up --service veck-shooter --environment production --detach --message "Deploy <commit> <summary>"
/home/ssm-user/work/shared/scripts/railway-with-token.sh deployment list --service veck-shooter --environment production --json
/home/ssm-user/work/shared/scripts/railway-with-token.sh logs --service veck-shooter --environment production --lines 100
```

If a future checkout is not linked, run the wrapper with `link <project-id>` or `init` as appropriate instead of `railway login`. Never print Railway token values or copy them into repo files, logs, docs, or hosted environment notes.
