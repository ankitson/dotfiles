# Changelog

## 2026-01-31: WezTerm template + macOS portability

### Added
- `dot_wezterm.lua.tmpl`: WezTerm config converted to chezmoi template. Shell path uses `stat` to detect Homebrew bash, falls back to `/bin/bash`. `macos_window_background_blur` only on macOS. `audible_bell = 'Disabled'`.
- `private_dot_config/karabiner/karabiner.json`: Karabiner config moved into chezmoi directory structure, deployed to `~/.config/karabiner/` on macOS only.
- `dot_bashrc.tmpl`: Added `eval "$(/opt/homebrew/bin/brew shellenv)"` on macOS, before environment/PATH blocks.

### Changed
- `.chezmoiignore.tmpl`: Added karabiner ignore rule for non-macOS machines.

### Removed
- `.wezterm.lua`: Replaced by `dot_wezterm.lua.tmpl`
- `karabiner.json`: Moved to `private_dot_config/karabiner/karabiner.json`
- `.zshrc`: Old oh-my-zsh config, superseded by `.bashrc.tmpl`

## 2026-01-30: v2 Reorganization

### Added
- `.chezmoi.toml.tmpl`: Feature detection with `$personal`, `$is_devbox`, `$is_homeserver`, `$internal_network` flags. Auto-detect Java via `readlink`, CUDA via `stat`. Interactive prompt for unknown hosts.
- `.chezmoiignore.tmpl`: Conditional SSH exclusion on non-personal machines
- `.chezmoiexternal.toml.tmpl`: Templated externals — tpm, vim-plug (fetched as file), clankerpedia (internal Gitea on LAN, GitHub otherwise)
- `dot_gitconfig.tmpl`: Templated email, `gh` credential helper via `lookPath`, modern git settings (histogram diff, zdiff3, autoSquash, autoStash, updateRefs, prune)
- `dot_op_helper.sh`: 1Password shell helpers (`op_inject`, `op_shell`, `op_exec_interactive`), managed by chezmoi
- `private_dot_ssh/private_id_rsa.tmpl`: SSH private key from 1Password
- `private_dot_ssh/id_rsa.pub.tmpl`: SSH public key from 1Password
- `private_dot_ssh/authorized_keys.tmpl`: SSH public key from 1Password
- `private_dot_ssh/config.tmpl`: SSH config with IP addresses for internal hosts, Tailscale hosts
- `private_dot_claude/settings.json.tmpl`: Claude Code settings with templated paths
- `private_dot_claude/executable_statusline-command.sh`: Claude Code statusline script
- `run_once_after_setup-clankerpedia.sh`: Symlinks `~/.agents/` into `~/.claude/` and `~/.codex/`

### Changed
- `.chezmoiexternal.toml` → `.chezmoiexternal.toml.tmpl`: Now templated. vim-plug fetched as external file instead of committed locally. Clankerpedia clone URL switches on `$internal_network`.
- `dot_bashrc.tmpl`: Consolidated all PATH into single template block with `stat` checks, editor via `lookPath`, clang via `lookPath`, completions via `lookPath`, simplified fzf setup, removed GitHub token export, removed Borg config (kept in separate per-machine setup), increased history to 100k/200k
- `dot_alias.tmpl`: Aliases that shadow commands gated by `lookPath` (nvim, bat/batcat, fdfind, eza, terraform, stdbuf, cargo, just). 1Password helper + claudep gated by `$personal`. Functions use POSIX-style syntax.

### Removed
- `dot_gitconfig`: Replaced by `dot_gitconfig.tmpl`
- `.chezmoiignore`: Replaced by `.chezmoiignore.tmpl`
- `.chezmoiexternal.toml`: Replaced by `.chezmoiexternal.toml.tmpl`
- `private_dot_config/nvim/autoload/plug.vim`: Now fetched via `.chezmoiexternal.toml.tmpl`

## 2026-02-04: Faster external refresh

### Changed
- `.chezmoiexternal.toml.tmpl`: Reduced refresh periods for tpm, vim-plug, and clankerpedia to 24h

## 2026-02-04: Bash completion UX + fzf tweaks

### Changed
- `dot_bashrc.tmpl`: Enabled readline to show ambiguous matches on first `TAB`, added menu cycling, and set fzf completion trigger/options before `fzf --bash`
