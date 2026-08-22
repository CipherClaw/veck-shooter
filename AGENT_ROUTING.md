# Hybrid Agent Routing Policy

This repository uses a deterministic hybrid router: the Claude Code main session orchestrates, while Claude project subagents and Codex CLI roles perform bounded specialist work. Routes are cost/capability defaults, not permanent provider rankings.

`CLAUDE.md` intentionally remains a symlink to `AGENTS.md`. Shared repository rules and the short router summary therefore live once in `AGENTS.md`; this document carries the detailed policy.

The host blocks bubblewrap user namespaces. Codex 0.149.0 provides the deprecated `use_legacy_landlock` compatibility feature, so project config and dispatcher commands enable it while retaining the requested read-only or workspace-write sandbox. This does not grant unrestricted execution. Before upgrading past support for this feature, establish working bubblewrap/user-namespace isolation and remove the flag.

## Escalation must be earned

> Never escalate model or effort solely because a task sounds important or is long.

Escalate only after preserving evidence: a failed implementation or diagnosis, an unresolved contradiction, credible reviewer disagreement, ambiguous requirements, several viable solutions with meaningful tradeoffs, unusual correctness impact, or a release blocker that depends on subtle reasoning. Give the stronger worker the gathered evidence so it does not repeat cheap exploration.

## Defaults and configuration precedence

The normal Claude Code parent is `sonnet` at `high` effort, declared in `.claude/settings.json`.

Claude Code 2.1.239 applies settings in this order: managed settings, command-line settings, project-local `.claude/settings.local.json`, shared project `.claude/settings.json`, then user `~/.claude/settings.json`. `ANTHROPIC_MODEL` also overrides file-based `model` values. Therefore the host's deliberate user setting (`claude-fable-5[1m]`, high) does **not** override this repo's shared `sonnet`, high setting. The effective parent changes only when a higher-precedence managed, CLI/environment, or project-local setting applies. See the [Claude Code settings precedence documentation](https://code.claude.com/docs/en/settings#settings-precedence).

This project intentionally does not set top-level Codex `model`, `model_reasoning_effort`, `approval_policy`, or `sandbox_mode`. Direct and Discord-bridge Codex sessions retain their user-level defaults. The dispatcher reads `.codex/agents/<role>.toml` as the source for each worker's model, effort, sandbox ceiling, and developer instructions, then explicitly passes model, effort, approval-never, and sandbox values to `codex exec`.

## Routing matrix

| Task class | First route | Effort | Mode | Escalation |
| --- | --- | --- | --- | --- |
| Repository search / inventory | Claude `claude-explorer` (Haiku) | medium | read-only | Luna low/medium only if CLI isolation or exact extraction helps |
| Exact lookup / metadata / formatting | Codex `codex-mechanical` (Luna) | low | read-only or write | Luna medium, then Terra only when judgment emerges |
| Mechanical implementation | Codex `codex-mechanical` (Luna) | low; medium if the edit stops being trivial | write | `codex-implementer` Terra medium |
| Normal shared/client/server TypeScript implementation or focused refactor | Codex `codex-implementer` (Terra) | medium; high only after concrete complexity | write | Sol or Opus only with preserved failure evidence |
| Map data or arena visual work (`shared/src/index.ts`, `client/src/components/Maps.tsx`) | Codex `codex-implementer` (Terra) | medium | write | Terra high if collider/physics interactions become nontrivial |
| Documentation, UX copy, or player-facing instructional prose | Claude `claude-content-editor` (Sonnet) | medium | write | Sonnet high only for difficult source reconciliation |
| Repo-aware planning | Claude `claude-planner` (Sonnet) | high | read-only | One frontier reviewer only for genuinely difficult architecture |
| Complex architecture | Claude `claude-deep-reviewer` (Opus) or Codex `codex-reviewer` (Sol) | high | read-only | Do not automatically run both; xhigh requires unresolved ambiguity |
| Difficult debugging | Codex `codex-debugger` (Terra) | high | read-only first; write after cause | Sol or Opus high only after failed hypotheses |
| Independent review of Claude-authored work | Codex `codex-reviewer` (Sol) | high | read-only | xhigh only under the evidence rules below |
| Independent review of Codex-authored work | Claude reviewer; reserve `claude-deep-reviewer` for subtle/high-risk work | high | read-only | Avoid premium review for trivial changes |
| High-risk release gate | Codex `codex-release-reviewer` (Sol) plus opposite-provider author/reviewer separation | high | read-only | xhigh only if high leaves release-blocking ambiguity |

High-risk release gates apply to server-authoritative gameplay or physics validation, matchmaking and cross-game profile-hub behavior in `server/src/profile.ts`, security or secrets handling, migrations or data-loss risk, `railway.json`, Railway deployment configuration, `Dockerfile`, and substantial architecture changes.

## Effort ladder

- **Low:** exact lookups, simple file discovery, formatting, trivial transformations, and deterministic metadata extraction.
- **Medium:** ordinary tests, straightforward fixes, mechanical refactors, focused content edits, and routine implementation from clear acceptance criteria.
- **High:** substantive engineering judgment, normal nontrivial implementation, repo-aware planning, review, troubleshooting, architecture comparison, source reconciliation, and unclear test failures.
- **Xhigh:** only after a high-effort attempt failed; two credible reviewers disagree; several technically plausible solutions remain; root cause is unresolved after evidence collection; correctness has unusually high impact; a release blocker depends on subtle reasoning; or adversarial review exposes a second defensible design. Task size alone is not evidence.
- **Max, ultracode, or equivalent maximum:** never automatic. Use only on explicit user instruction or preserved evidence that ordinary high/xhigh reasoning failed. No project role defaults to a maximum mode.

Model escalation follows the same ladder: Luna to Terra when a mechanical task proves judgment-heavy, Terra to Sol when a high-effort attempt remains unresolved, and Sonnet to Opus when genuinely difficult architecture or subtle correctness remains. Preserve failed hypotheses, commands, and concise evidence.

## Cross-provider author/reviewer separation

A worker is never its own independent reviewer. Meaningful work follows author → independent reviewer → parent integrator:

- Claude author → Codex reviewer.
- Codex author → Claude reviewer.

Cross-provider review is required for the high-risk release gates above and for security impact, destructive migrations, substantial architecture, and other unusually consequential correctness changes. It is deliberately omitted for trivial documentation, formatting, exact metadata changes, and routine low-risk edits. The parent resolves findings but never manufactures reviewer agreement.

Release reviewers are read-only. They report readiness and defects but do not deploy, modify secrets, authorize production, or weaken `AGENTS.md`. Railway commands remain behind the shared token wrapper. The existing Definition of Done remains authoritative.

## Concurrency and worktree contract

At most three specialist tasks may be active, including at most two write-capable tasks. Parallelize only genuinely independent work; do not run best-of-N for routine tasks.

Read-only workers may share the main checkout. Two writers never share a checkout. Use `--worktree` for parallel writers; the dispatcher creates a detached checkout below gitignored `.agent-worktrees/` and returns its path. A successful real worktree run retains that checkout for parent integration; the parent removes it with `git worktree remove <path>` after integration. A dry run creates the worktree to verify isolation and then removes it automatically. A write without `--worktree` holds an exclusive writer lease on the main checkout. Dispatcher run logs older than 30 days are pruned.

## Context-economy contract

Give workers only the bounded task, relevant paths, constraints, acceptance criteria, safe validation commands, and required response shape. Do not forward secrets, the full parent transcript, hidden reasoning, or unrelated logs.

Each worker returns:

- Result or finding.
- Files changed, or `none`.
- Tests run, or `none`.
- Unresolved issues, or `none`.

Full Codex JSONL stdout and stderr stay in gitignored `.agent-runs/`; the parent consumes the concise last message. These local debug logs are not telemetry and must never be committed or used to pass secrets.

## Dispatcher

Read-only mechanical lookup:

```sh
python3 scripts/agent_dispatch.py \
  --role codex-mechanical \
  --mode read-only \
  --task "List the npm workspace names in one line" \
  --json
```

Normal implementation in an isolated worktree:

```sh
python3 scripts/agent_dispatch.py \
  --role codex-implementer \
  --mode write \
  --worktree \
  --task-file /path/to/bounded-task.txt \
  --json
```

Evidence-backed effort override:

```sh
python3 scripts/agent_dispatch.py \
  --role codex-debugger \
  --mode read-only \
  --effort high \
  --task "Diagnose using the supplied reproduction and failed hypotheses" \
  --json
```

Inspect the exact invocation without consuming a model run:

```sh
python3 scripts/agent_dispatch.py \
  --role codex-implementer \
  --mode write \
  --worktree \
  --task "Inspect dispatcher isolation" \
  --dry-run \
  --json
```

The dispatcher fails clearly rather than changing providers when Codex is missing, unauthenticated, invalidly configured, or at capacity. A write-capable role may be restricted to read-only for a run; a read-only reviewer role can never be elevated to write. Codex 0.149.0 locally confirms the emitted `--strict-config`, `--enable`, `-C`, `-m`, `-c`, `--sandbox`, `--ephemeral`, `--json`, and `--output-last-message` flags. The dispatcher never uses the dangerous bypass flag.

## Telemetry and self-tuning

`.agent-telemetry/events.jsonl` stores only timestamp, task class, provider, model and tier, effort, read/write mode, success/failure, retry/escalation counts, optional reviewer defect count, and approximate duration. It never stores prompts, outputs, file contents, secrets, or chain-of-thought.

Record Claude-native results manually and summarize all recorded routes with:

```sh
python3 scripts/agent_telemetry.py record \
  --task-class planning --provider claude --model sonnet \
  --effort high --mode read-only --success true --duration-s 42
python3 scripts/agent_telemetry.py summarize
```

Change routing defaults only after repeated comparable evidence, never one anecdote. Examples: repeated Luna failure can move a class to Terra; reliable Terra success can remove unnecessary Sol usage; reliable Sonnet planning can remove Opus escalation; consistently empty cross-provider reviews on a low-risk class can reduce review; and repeated detection of a defect class can favor that provider for that review. Review aggregate telemetry and documented reviewer defects before changing the matrix.

## Repository validation and release boundaries

Run focused checks plus the repository gates:

```sh
npm run build
npm test
npm run lint
```

After committing and pushing, run `npm run finish-check`. Deploy or verify Railway only when the change should go live. Use the shared Railway token wrapper documented in `AGENTS.md`; never rely on cached login, log secrets, or infer production authorization from a reviewer result. Dispatcher sandbox selection does not broaden task authority.

## Provider neutrality and explicit overrides

These routes are economic defaults, not claims that either provider is always better. Explicit user routing overrides win, provided they do not weaken safety or release boundaries. Evidence-backed one-off overrides are allowed; record the actual route and the reason for changing it. Never silently fall back to another provider.

No project-specific provider overrides are currently recorded.
