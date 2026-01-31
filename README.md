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
private_dot_config/nvim/        # neovim config
```

## 1Password Integration

On personal machines (`personal = true`), these require 1Password:

- `~/.ssh/id_rsa` and `~/.ssh/id_rsa.pub` — deployed at apply time via `onepasswordRead`
- `~/.ssh/authorized_keys` — public key from 1Password
- `BORG_PASSCOMMAND` — reads passphrase at runtime via `op read`
- `claudep` function — injects token at runtime via `op_exec_interactive`

## External Dependencies

Managed via `.chezmoiexternal.toml.tmpl`:

- **tpm** — tmux plugin manager (git-repo)
- **vim-plug** — neovim plugin manager (single file)
- **clankerpedia** — agent instructions + skills, cloned to `~/.agents/` and symlinked into `~/.claude/` and `~/.codex/`. Uses internal Gitea on LAN, GitHub otherwise.

## Docker Builds

On unknown hostnames, `personal` defaults to `false` — 1Password calls are skipped and SSH keys are excluded. Run `chezmoi apply` interactively after boot to deploy secrets.
