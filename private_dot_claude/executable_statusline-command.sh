#!/bin/bash

# Read JSON input from stdin
input=$(cat)

# Extract current directory from JSON
cwd=$(echo "$input" | jq -r '.workspace.current_dir')
model_display=$(echo "$input" | jq -r '.model.display_name')
ctx_rem_pct=$(echo "$input" | jq -r '.context_window.remaining_percentage')

# Get git branch info if in a git repo
git_info=""
if [ -d "$cwd/.git" ] || git -C "$cwd" rev-parse --git-dir > /dev/null 2>&1; then
    export GIT_PS1_SHOWDIRTYSTATE=1
    source "$HOME/.git-branch.sh"
    git_info=$(__git_ps1 " (%s)")
fi

# Build the status line
printf '\033[33m'
printf "(%s)" "$model_display"
printf "[%s]" "$(date '+%y/%m/%d %H:%M')"
printf '\033[0m'
printf '\033[01;34m'
printf "%s" "$cwd"
printf '\033[00m'
printf "%s" "$git_info"
printf "[%s]" "$ctx_rem_pct"
