#!/bin/sh

status=$(git status --porcelain)
if [ -n "$status" ]; then
  printf '%s\n' "FAIL: working tree has uncommitted or untracked changes:"
  printf '%s\n' "$status" | sed 's/^/  /'
  exit 1
fi

upstream=$(git rev-parse --abbrev-ref --symbolic-full-name '@{u}' 2>/dev/null)
if [ -z "$upstream" ]; then
  printf '%s\n' "FAIL: current branch has no upstream configured."
  exit 1
fi

unpushed=$(git rev-list --count "$upstream"..HEAD 2>/dev/null)
if [ "$unpushed" -ne 0 ]; then
  printf '%s\n' "FAIL: HEAD has $unpushed unpushed commit(s) relative to $upstream."
  git log --oneline "$upstream"..HEAD
  exit 1
fi

printf '%s\n' "OK: tree clean and HEAD pushed to $upstream"
