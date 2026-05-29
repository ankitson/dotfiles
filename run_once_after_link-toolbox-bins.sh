#!/usr/bin/env bash
# Symlink every executable in ~/toolbox/bin into ~/.local/bin/.
#
# `run_once_after_` re-runs whenever this script's content changes; symlinks are
# forced (`ln -sfn`) so reapplying is a no-op. Run-once-per-content semantics also
# means new bins added to toolbox don't auto-publish — run `chezmoi apply -f` (or
# bump this script) to refresh, or just rely on the 24h external refresh + manual
# apply on each machine.
set -euo pipefail

src="$HOME/toolbox/bin"
dst="$HOME/.local/bin"

[ -d "$src" ] || { echo "toolbox/bin not present at $src; skipping"; exit 0; }
mkdir -p "$dst"

for f in "$src"/*; do
  [ -e "$f" ] || continue       # empty glob
  [ -x "$f" ] || continue       # only executables
  name=$(basename "$f")
  [ "$name" = ".gitkeep" ] && continue
  ln -sfn "$f" "$dst/$name"
  echo "linked $dst/$name -> $f"
done
