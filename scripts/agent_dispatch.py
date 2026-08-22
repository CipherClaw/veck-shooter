#!/usr/bin/env python3
"""Deterministically dispatch a bounded task to a configured Codex worker."""

from __future__ import annotations

import argparse
import fcntl
import json
import os
import shlex
import shutil
import subprocess
import sys
import time
import tomllib
import uuid
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path


REPO_ROOT = Path(__file__).resolve().parent.parent
RUN_ROOT = REPO_ROOT / ".agent-runs"
LOCK_ROOT = RUN_ROOT / "locks"
WORKTREE_ROOT = REPO_ROOT / ".agent-worktrees"
TELEMETRY = REPO_ROOT / "scripts" / "agent_telemetry.py"
MAX_ACTIVE = 3
MAX_WRITERS = 2
RUN_RETENTION_DAYS = 30
EFFORTS = ("low", "medium", "high", "xhigh", "max")
EFFORT_RANK = {name: rank for rank, name in enumerate(EFFORTS)}
ROLE_TASK_CLASSES = {
    "codex-mechanical": "mechanical",
    "codex-implementer": "implementation",
    "codex-debugger": "debugging",
    "codex-reviewer": "review",
    "codex-release-reviewer": "release-review",
}


@dataclass(frozen=True)
class Role:
    provider: str
    model: str
    effort: str
    sandbox: str
    task_class: str
    instructions: str


class DispatchError(RuntimeError):
    pass


def utc_stamp() -> str:
    return datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%S.%fZ")


def pid_alive(pid: int) -> bool:
    if pid <= 0:
        return False
    try:
        os.kill(pid, 0)
        return True
    except ProcessLookupError:
        return False
    except PermissionError:
        return True


def prune_old_runs() -> None:
    if not RUN_ROOT.exists():
        return
    cutoff = time.time() - RUN_RETENTION_DAYS * 86400
    for path in RUN_ROOT.iterdir():
        if path.name in {"locks", "dispatch.lock"} or not path.is_dir():
            continue
        try:
            if path.stat().st_mtime < cutoff:
                shutil.rmtree(path)
        except OSError:
            continue


def read_leases() -> list[tuple[Path, dict[str, object]]]:
    leases = []
    for path in LOCK_ROOT.glob("*.json"):
        try:
            data = json.loads(path.read_text(encoding="utf-8"))
            if bool(data.get("test")) or pid_alive(int(data["pid"])):
                leases.append((path, data))
            else:
                path.unlink(missing_ok=True)
        except (OSError, ValueError, TypeError, KeyError, json.JSONDecodeError):
            path.unlink(missing_ok=True)
    return leases


def acquire_lease(mode: str, checkout: Path) -> Path:
    LOCK_ROOT.mkdir(parents=True, exist_ok=True)
    gate_path = RUN_ROOT / "dispatch.lock"
    with gate_path.open("a+", encoding="utf-8") as gate:
        fcntl.flock(gate.fileno(), fcntl.LOCK_EX)
        leases = read_leases()
        writers = [data for _, data in leases if data.get("mode") == "write"]
        if len(leases) >= MAX_ACTIVE:
            raise DispatchError(
                f"concurrency limit reached: {len(leases)} active dispatches "
                f"(max {MAX_ACTIVE})"
            )
        if mode == "write" and len(writers) >= MAX_WRITERS:
            raise DispatchError(
                f"writer limit reached: {len(writers)} write-capable dispatches "
                f"(max {MAX_WRITERS})"
            )
        checkout_text = str(checkout.resolve())
        if mode == "write" and any(
            data.get("checkout") == checkout_text for data in writers
        ):
            raise DispatchError(f"checkout already has an active writer: {checkout_text}")
        lease_path = LOCK_ROOT / f"{os.getpid()}-{uuid.uuid4().hex}.json"
        lease_path.write_text(
            json.dumps(
                {
                    "pid": os.getpid(),
                    "mode": mode,
                    "checkout": checkout_text,
                    "ts": utc_stamp(),
                }
            ),
            encoding="utf-8",
        )
        fcntl.flock(gate.fileno(), fcntl.LOCK_UN)
    return lease_path


def remove_lease(path: Path | None) -> None:
    if path is not None:
        path.unlink(missing_ok=True)


def ensure_codex_ready() -> str:
    codex = shutil.which("codex")
    if not codex:
        raise DispatchError(
            "codex executable not found on PATH; install Codex CLI before dispatching"
        )
    status = subprocess.run(
        [codex, "login", "status"], text=True, capture_output=True, check=False
    )
    combined = (status.stdout + "\n" + status.stderr).strip()
    if status.returncode != 0 or "logged in" not in combined.lower():
        detail = combined.splitlines()[-1] if combined else "no status returned"
        raise DispatchError(f"Codex is not logged in: {detail}")
    return codex


def create_worktree(path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    result = subprocess.run(
        ["git", "worktree", "add", "--detach", str(path), "HEAD"],
        cwd=REPO_ROOT,
        text=True,
        capture_output=True,
        check=False,
    )
    if result.returncode != 0:
        detail = (result.stderr or result.stdout).strip()
        raise DispatchError(f"failed to create worktree {path}: {detail}")


def remove_worktree(path: Path) -> None:
    result = subprocess.run(
        ["git", "worktree", "remove", "--force", str(path)],
        cwd=REPO_ROOT,
        text=True,
        capture_output=True,
        check=False,
    )
    if result.returncode != 0:
        detail = (result.stderr or result.stdout).strip()
        raise DispatchError(f"failed to remove dry-run worktree {path}: {detail}")


def load_task(args: argparse.Namespace) -> str:
    if args.task is not None:
        task = args.task
    else:
        try:
            task = args.task_file.read_text(encoding="utf-8")
        except OSError as exc:
            raise DispatchError(f"cannot read task file {args.task_file}: {exc}") from exc
    if not task.strip():
        raise DispatchError("task must not be empty")
    return task


def load_role(name: str) -> Role:
    config_path = REPO_ROOT / ".codex" / "agents" / f"{name}.toml"
    try:
        with config_path.open("rb") as handle:
            data = tomllib.load(handle)
        if data.get("name") != name:
            raise ValueError(f'name must be "{name}"')
        model = str(data["model"])
        effort = str(data["model_reasoning_effort"])
        sandbox = str(data["sandbox_mode"])
        instructions = str(data["developer_instructions"]).strip()
    except (OSError, KeyError, TypeError, ValueError, tomllib.TOMLDecodeError) as exc:
        raise DispatchError(f"invalid role config {config_path}: {exc}") from exc
    if effort not in EFFORTS:
        raise DispatchError(f"invalid default effort in {config_path}: {effort}")
    if not model.startswith("gpt-5.6-"):
        raise DispatchError(f"unexpected model in {config_path}: {model}")
    if sandbox not in {"read-only", "workspace-write"}:
        raise DispatchError(f"invalid sandbox_mode in {config_path}: {sandbox}")
    if not instructions:
        raise DispatchError(
            f"developer_instructions must not be empty in {config_path}"
        )
    return Role(
        "codex", model, effort, sandbox, ROLE_TASK_CLASSES[name], instructions
    )


def resolve_sandbox(role: Role, mode: str) -> str:
    requested = "read-only" if mode == "read-only" else "workspace-write"
    if role.sandbox == "read-only" and requested != "read-only":
        raise DispatchError("read-only role cannot be elevated to workspace-write")
    return requested


def build_command(
    codex: str,
    checkout: Path,
    role: Role,
    effort: str,
    sandbox: str,
    last_message: Path,
    task: str,
) -> list[str]:
    return [
        codex,
        "exec",
        "--strict-config",
        "--enable",
        "use_legacy_landlock",
        "-C",
        str(checkout),
        "-m",
        role.model,
        "-c",
        f'model_reasoning_effort="{effort}"',
        "-c",
        'approval_policy="never"',
        "-c",
        f"developer_instructions={json.dumps(role.instructions)}",
        "--sandbox",
        sandbox,
        "--ephemeral",
        "--json",
        "--output-last-message",
        str(last_message),
        task,
    ]


def record_telemetry(
    role: Role,
    effort: str,
    mode: str,
    success: bool,
    escalated: bool,
    duration: float,
) -> None:
    subprocess.run(
        [
            sys.executable,
            str(TELEMETRY),
            "record",
            "--task-class",
            role.task_class,
            "--provider",
            role.provider,
            "--model",
            role.model,
            "--effort",
            effort,
            "--mode",
            mode,
            "--success",
            str(success).lower(),
            "--retries",
            "0",
            "--escalated",
            str(escalated).lower(),
            "--duration-s",
            f"{duration:.3f}",
        ],
        cwd=REPO_ROOT,
        text=True,
        capture_output=True,
        check=False,
    )


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--role", required=True, choices=tuple(ROLE_TASK_CLASSES))
    task_group = parser.add_mutually_exclusive_group(required=True)
    task_group.add_argument("--task")
    task_group.add_argument("--task-file", type=Path)
    parser.add_argument("--mode", required=True, choices=("read-only", "write"))
    parser.add_argument("--effort", choices=EFFORTS)
    parser.add_argument(
        "--worktree",
        action="store_true",
        help="use an isolated detached worktree for a write task",
    )
    parser.add_argument(
        "--json", action="store_true", help="print the dispatch result as JSON"
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="print the exact Codex command without invoking Codex",
    )
    return parser


def emit_result(result: dict[str, object], as_json: bool) -> None:
    if as_json:
        print(json.dumps(result, sort_keys=True))
    else:
        for key, value in result.items():
            print(f"{key}: {value}")


def run(args: argparse.Namespace) -> int:
    if args.worktree and args.mode != "write":
        raise DispatchError("--worktree is valid only with --mode write")
    role = load_role(args.role)
    effort = args.effort or role.effort
    sandbox = resolve_sandbox(role, args.mode)
    task = load_task(args)
    codex = ensure_codex_ready()
    prune_old_runs()

    run_id = f"{utc_stamp()}-{args.role}-{os.getpid()}"
    run_dir = RUN_ROOT / run_id
    last_message_path = run_dir / "last_message.txt"
    stdout_path = run_dir / "stdout.jsonl"
    stderr_path = run_dir / "stderr.log"
    worktree = WORKTREE_ROOT / run_id if args.worktree else None
    checkout = worktree or REPO_ROOT
    lease = None
    created_worktree = False

    try:
        lease = acquire_lease(args.mode, checkout)
        run_dir.mkdir(parents=True, exist_ok=False)
        if worktree is not None:
            create_worktree(worktree)
            created_worktree = True
            print(f"worktree: {worktree}", file=sys.stderr)
        command = build_command(
            codex, checkout, role, effort, sandbox, last_message_path, task
        )
        if args.dry_run:
            result: dict[str, object] = {
                "role": args.role,
                "provider": role.provider,
                "model": role.model,
                "effort": effort,
                "mode": args.mode,
                "sandbox": sandbox,
                "dry_run": True,
                "command": command,
                "command_shell": shlex.join(command),
                "worktree": str(worktree) if worktree else None,
                "worktree_created": created_worktree,
            }
            if created_worktree:
                remove_worktree(worktree)
                created_worktree = False
            result["worktree_removed"] = bool(worktree) and not worktree.exists()
            shutil.rmtree(run_dir, ignore_errors=True)
            emit_result(result, args.json)
            return 0

        started = time.monotonic()
        with (
            stdout_path.open("w", encoding="utf-8") as stdout_handle,
            stderr_path.open("w", encoding="utf-8") as stderr_handle,
        ):
            completed = subprocess.run(
                command,
                cwd=checkout,
                stdin=subprocess.DEVNULL,
                text=True,
                stdout=stdout_handle,
                stderr=stderr_handle,
                check=False,
            )
        duration = time.monotonic() - started
        try:
            last_message = last_message_path.read_text(encoding="utf-8").strip()
        except OSError:
            last_message = ""
        escalated = EFFORT_RANK[effort] > EFFORT_RANK[role.effort]
        record_telemetry(
            role,
            effort,
            args.mode,
            completed.returncode == 0,
            escalated,
            duration,
        )
        result = {
            "role": args.role,
            "provider": role.provider,
            "model": role.model,
            "effort": effort,
            "mode": args.mode,
            "sandbox": sandbox,
            "exit_code": completed.returncode,
            "duration_s": round(duration, 3),
            "last_message": last_message,
            "run_dir": str(run_dir),
            "worktree": str(worktree) if worktree else None,
        }
        emit_result(result, args.json)
        return completed.returncode
    finally:
        remove_lease(lease)


def main() -> int:
    parser = build_parser()
    try:
        return run(parser.parse_args())
    except DispatchError as exc:
        print(f"agent_dispatch: {exc}", file=sys.stderr)
        return 2


if __name__ == "__main__":
    raise SystemExit(main())
