# Chezmoi Dotfiles - Notes

## 2026-01-30: v2 Reorganization Complete

### What was done
- Reorganized chezmoi dotfiles following twpayne's reference implementation patterns
- Replaced static `dot_gitconfig` with templated `dot_gitconfig.tmpl`
- Replaced static `.chezmoiignore` with templated `.chezmoiignore.tmpl`
- Replaced static `.chezmoiexternal.toml` with `.chezmoiexternal.toml.tmpl` for conditional git URLs
- Added 1Password-managed SSH keys in `private_dot_ssh/`
- Added `op_helper.sh` as a chezmoi-managed file
- Added Claude Code config (`settings.json`, `statusline-command.sh`)
- Added clankerpedia (agents/skills) as external git-repo with symlinks into `~/.claude/` and `~/.codex/`

### Key Design Decisions
- **Feature flags**: `$personal`, `$is_devbox`, `$is_homeserver`, `$internal_network` derived from hostname in `.chezmoi.toml.tmpl`
- **`$internal_network`**: True for machines on home LAN (both desktop-linux and devbox). Used to select internal Gitea vs GitHub URLs for external repos.
- **1Password-native secrets**: SSH keys via `onepasswordRead`, Borg passphrase via `op read` at runtime, `claudep` via `op_exec_interactive`
- **SSH directory from 1Password**: `private_dot_ssh/` with 4 template files, gated by `$personal` flag. Excluded on non-personal machines via `.chezmoiignore.tmpl`.
- **Single PATH loop**: All PATH additions consolidated into one template block using `stat` checks. No deduplication function needed.
- **lookPath-gated aliases**: Aliases that shadow existing commands (vim, cat) use `lookPath` at template time. Harmless aliases left ungated.
- **Zero hardcoded versions**: Java detected via `readlink`, CUDA via `/usr/local/cuda` symlink
- **Templated gitconfig**: Email from data, `gh` credential helper via `lookPath`, modern git settings (histogram diff, zdiff3, autoSquash, autoStash, updateRefs)
- **Agent config**: clankerpedia repo cloned to `~/.agents/`, symlinked into both `~/.claude/` and `~/.codex/` for Claude Code and Codex CLI support
- **Docker builds**: On unknown hostnames, `$personal = false` so 1Password calls are skipped. Run `chezmoi apply` again interactively after boot to deploy secrets.

### 1Password Items Required
| Item | Field | Used for |
|---|---|---|
| `SSH Key` (or `dev`) | `private key` | `~/.ssh/id_rsa` |
| `SSH Key` (or `dev`) | `public key` | `~/.ssh/id_rsa.pub`, `~/.ssh/authorized_keys` |
| `Borg Backup` | `password` | `$BORG_PASSCOMMAND` (runtime) |
| `Anthropic` | `claude-code-setup-token` | `claudep` function (runtime) |

### Verification Steps
1. `chezmoi execute-template < .chezmoi.toml.tmpl` — verify feature detection
2. `chezmoi diff` — inspect what would change
3. `chezmoi cat ~/.bashrc` — verify single PATH block
4. `chezmoi cat ~/.ssh/id_rsa` — verify 1Password integration (requires `op signin`)
5. `chezmoi cat ~/.gitconfig` — verify email, gh helper rendered
6. `chezmoi apply -v -n` (dry run) on each host
