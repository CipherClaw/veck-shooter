#!/usr/bin/env python3
"""Record privacy-preserving agent-routing metadata and summarize outcomes."""

from __future__ import annotations

import argparse
import fcntl
import json
import sys
from collections import defaultdict
from datetime import datetime, timezone
from pathlib import Path


REPO_ROOT = Path(__file__).resolve().parent.parent
EVENTS_PATH = REPO_ROOT / ".agent-telemetry" / "events.jsonl"


def utc_now() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds").replace(
        "+00:00", "Z"
    )


def parse_bool(value: str) -> bool:
    normalized = value.lower()
    if normalized in {"1", "true", "yes"}:
        return True
    if normalized in {"0", "false", "no"}:
        return False
    raise argparse.ArgumentTypeError("expected true or false")


def nonnegative_int(value: str) -> int:
    parsed = int(value)
    if parsed < 0:
        raise argparse.ArgumentTypeError("expected a non-negative integer")
    return parsed


def nonnegative_float(value: str) -> float:
    parsed = float(value)
    if parsed < 0:
        raise argparse.ArgumentTypeError("expected a non-negative number")
    return parsed


def record(args: argparse.Namespace) -> int:
    event = {
        "ts": args.ts or utc_now(),
        "task_class": args.task_class,
        "provider": args.provider,
        "model": args.model,
        "model_tier": args.model.rsplit("-", 1)[-1],
        "effort": args.effort,
        "mode": args.mode,
        "success": args.success,
        "retries": args.retries,
        "escalated": args.escalated,
        "duration_s": round(args.duration_s, 3),
    }
    if args.reviewer_defects is not None:
        event["reviewer_defects"] = args.reviewer_defects

    EVENTS_PATH.parent.mkdir(parents=True, exist_ok=True)
    with EVENTS_PATH.open("a", encoding="utf-8") as handle:
        fcntl.flock(handle.fileno(), fcntl.LOCK_EX)
        handle.write(json.dumps(event, sort_keys=True, separators=(",", ":")) + "\n")
        handle.flush()
        fcntl.flock(handle.fileno(), fcntl.LOCK_UN)
    return 0


def summarize(_: argparse.Namespace) -> int:
    if not EVENTS_PATH.exists():
        print("No telemetry events recorded.")
        return 0

    groups: dict[tuple[str, str, str, str, str], list[int]] = defaultdict(
        lambda: [0, 0]
    )
    invalid = 0
    with EVENTS_PATH.open("r", encoding="utf-8") as handle:
        for line in handle:
            try:
                event = json.loads(line)
                key = (
                    str(event["task_class"]),
                    str(event["provider"]),
                    str(event["model"]),
                    str(event["effort"]),
                    str(event["mode"]),
                )
                groups[key][0] += int(bool(event["success"]))
                groups[key][1] += 1
            except (json.JSONDecodeError, KeyError, TypeError, ValueError):
                invalid += 1

    headers = (
        "TASK_CLASS",
        "PROVIDER",
        "MODEL",
        "EFFORT",
        "MODE",
        "SUCCESS",
        "TOTAL",
        "RATE",
    )
    rows = [
        (*key, str(successes), str(total), f"{100.0 * successes / total:.1f}%")
        for key, (successes, total) in sorted(groups.items())
    ]
    widths = [len(header) for header in headers]
    for row in rows:
        widths = [max(width, len(value)) for width, value in zip(widths, row)]
    print("  ".join(header.ljust(width) for header, width in zip(headers, widths)))
    print("  ".join("-" * width for width in widths))
    for row in rows:
        print("  ".join(value.ljust(width) for value, width in zip(row, widths)))
    if invalid:
        print(f"warning: skipped {invalid} invalid event(s)", file=sys.stderr)
    return 0


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description=__doc__)
    subparsers = parser.add_subparsers(dest="command", required=True)

    record_parser = subparsers.add_parser(
        "record", help="append one metadata-only event"
    )
    record_parser.add_argument("--ts")
    record_parser.add_argument("--task-class", required=True)
    record_parser.add_argument(
        "--provider", required=True, choices=("claude", "codex")
    )
    record_parser.add_argument("--model", required=True)
    record_parser.add_argument("--effort", required=True)
    record_parser.add_argument(
        "--mode", required=True, choices=("read-only", "write")
    )
    record_parser.add_argument("--success", required=True, type=parse_bool)
    record_parser.add_argument("--retries", type=nonnegative_int, default=0)
    record_parser.add_argument("--escalated", type=parse_bool, default=False)
    record_parser.add_argument("--reviewer-defects", type=nonnegative_int)
    record_parser.add_argument(
        "--duration-s", required=True, type=nonnegative_float
    )
    record_parser.set_defaults(func=record)

    summarize_parser = subparsers.add_parser(
        "summarize", help="print success rates by route"
    )
    summarize_parser.set_defaults(func=summarize)
    return parser


def main() -> int:
    args = build_parser().parse_args()
    return args.func(args)


if __name__ == "__main__":
    raise SystemExit(main())
