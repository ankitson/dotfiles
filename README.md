# dotfiles

my chezmoi managed dotfiles

## Quick Start

```bash
# First-time setup
chezmoi init <repo-url>
chezmoi diff          # preview
chezmoi apply -v      # apply

# On personal machines (1Password required for SSH keys)
op signin
chezmoi apply -v
```

## Structure

```
.chezmoi.toml.tmpl              # feature flags + auto-detect Java/CUDA
.chezmoiexternal.toml.tmpl      # tpm, vim-plug, clankerpedia (agents/skills)
.chezmoiignore.tmpl             # excludes SSH on non-personal machines
dot_bashrc.tmpl                 # single consolidated PATH loop
dot_alias.tmpl                  # lookPath-gated aliases
dot_gitconfig.tmpl              # templated email, gh credential helper
dot_op_helper.sh                # 1Password shell helpers
private_dot_ssh/                # SSH keys from 1Password
private_dot_claude/             # Claude Code settings + statusline
private_dot_codex/              # Codex CLI profiles
private_dot_config/nvim/        # neovim config
```

## Modify scripts and Windows

`modify_` scripts (e.g. `modify_settings.json.py.tmpl`) target config files whose
extension (`.json`, `.toml`) has no chezmoi interpreter, so a `.py` (and `.py.tmpl`
for templated variants) suffix is appended to select the `python3` interpreter.
chezmoi strips that suffix from the target name, leaving `settings.json` / `config.toml`.

**Why:** on Windows chezmoi resolves script interpreters by file extension, not the
`#!` shebang. A modify script named after its `.json`/`.toml` target has no registered
interpreter, so chezmoi direct-exec's the temp file and fails with
`%1 is not a valid Win32 application`. The `.py` extension maps to the `python3`
interpreter (chezmoi default; already on PATH). Don't "fix" this by dropping the `.py`.

## 1Password Integration

On personal machines (`personal = true`), these require 1Password:

- `~/.ssh/id_rsa` and `~/.ssh/id_rsa.pub` — deployed at apply time via `onepasswordRead`
- `~/.ssh/authorized_keys` — public key from 1Password
- `~/.ssh/config` Host entries — generated from `op://clankers/device-inventory/notesPlain`
- macOS sshd source-address allowlist — generated from the same `device-inventory` note on personal Darwin machines
- `BORG_PASSCOMMAND` — reads passphrase at runtime via `op read`
- `claudep` function — injects token at runtime via `op_exec_interactive`

## Agent CLI Profiles

- `codexp` — Codex with the `yolow` full-access profile
- `codexb` — Codex with the opt-in `bifrost` profile
- `claudep` — Claude Code with permission prompts skipped
- `claudeb` — Claude Code with `~/.claude/bifrost-settings.json`

## External Dependencies

Managed via `.chezmoiexternal.toml.tmpl`:

- **tpm** — tmux plugin manager (git-repo)
- **vim-plug** — neovim plugin manager (single file)
- **clankerpedia** — agent instructions + skills, cloned to `~/.agents/` and symlinked into `~/.claude/` and `~/.codex/`. Uses internal Gitea on LAN, GitHub otherwise.

## Docker Builds

On unknown hostnames, `personal` defaults to `false` — 1Password calls are skipped and SSH keys are excluded. Run `chezmoi apply` interactively after boot to deploy secrets.
