#!/bin/bash
set -euo pipefail

src="$HOME/.agents"

if [ ! -d "$src" ]; then
  echo "clankerpedia not found at $src, skipping symlink setup"
  exit 0
fi

# Symlink into ~/.claude and ~/.codex
for dir in "$HOME/.claude" "$HOME/.codex"; do
  mkdir -p "$dir"

  # AGENTS.md and skills are shared
  for item in AGENTS.md skills; do
    target="$dir/$item"
    if [ -L "$target" ] || [ ! -e "$target" ]; then
      ln -sfn "$src/$item" "$target"
    fi
  done
done

# CLAUDE.md is Claude Code-specific
target="$HOME/.claude/CLAUDE.md"
if [ -L "$target" ] || [ ! -e "$target" ]; then
  ln -sfn "$src/CLAUDE.md" "$target"
fi
