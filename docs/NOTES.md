# Chezmoi Dotfiles - Notes

## 2026-03-02: Restore chezmoi source-tracking

### What was done
- Repointed `~/.local/share/chezmoi` toward `ssh://git@git.home.ankitson.com:1024/ankitson/dotfiles.git`, fetched the remote, and reset `main` to `origin/main` so the source repo matches this tree again.
- Confirmed the working tree is clean (git status shows no working-tree or staging diffs) and that `chezmoi` sees the expected commit (`36d1427`).
- Left the previous clankerpedia copy untouched so the history is still available if we need to inspect it.

### Next steps
- Run `chezmoi update --refresh-externals --force` the next time dotfiles cover updates that pull externals so that the local source stays synchronized.

## 2026-03-02: Sync bashrc env sources

### What was done
- Added `.opencode/bin` and `.bun/bin` to the consolidated PATH block in `dot_bashrc.tmpl` so the template now reflects the live `~/.bashrc`.
- Used `onepasswordRead "op://x/bearerToken"` inside the template so `X_BEARER_TOKEN` is exported from the 1Password secret in the same pattern as the SSH keys, keeping the bearer token sourcing declarative.
- Confirmed `chezmoi diff ~/.bashrc` reports only the expected block changes.

### Next steps
- Sign into 1Password (`op signin`) before running `chezmoi apply --refresh-externals --force` so `onepasswordRead` can fetch the bearer token and SSH keys.

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

## 2026-01-31: WezTerm + macOS portability

### What was done
- Converted `.wezterm.lua` to chezmoi template (`dot_wezterm.lua.tmpl`)
- Templated `default_prog` to use Homebrew bash if `/opt/homebrew/bin/bash` exists, otherwise `/bin/bash`
- `macos_window_background_blur` only emitted on macOS
- Added `audible_bell = 'Disabled'`
- Added `eval "$(/opt/homebrew/bin/brew shellenv)"` to `.bashrc.tmpl` on macOS (before PATH/environment block)
- Moved `karabiner.json` to `private_dot_config/karabiner/karabiner.json`, ignored on non-macOS via `.chezmoiignore.tmpl`
- Deleted old `.zshrc` (superseded by `.bashrc.tmpl`)

### Key Design Decisions
- **WezTerm shell detection**: Uses `stat "/opt/homebrew/bin/bash"` rather than OS check — works if someone has macOS without Homebrew bash
- **Karabiner macOS-only**: Gated via `.chezmoiignore.tmpl` (`ne .chezmoi.os "darwin"`), not a template — the JSON stays plain
- **Brew shellenv**: Placed early in `.bashrc.tmpl` (after bash-completion, before environment/PATH) so `HOMEBREW_PREFIX` is available for downstream tools
- **SSHMUX persistence**: Confirmed that `wezterm-mux-server --ssh` survives client disconnects — sessions persist without needing `unix_domains` daemon setup

### Verification Steps
1. `chezmoi execute-template < .chezmoi.toml.tmpl` — verify feature detection
2. `chezmoi diff` — inspect what would change
3. `chezmoi cat ~/.bashrc` — verify single PATH block
4. `chezmoi cat ~/.ssh/id_rsa` — verify 1Password integration (requires `op signin`)
5. `chezmoi cat ~/.gitconfig` — verify email, gh helper rendered
6. `chezmoi apply -v -n` (dry run) on each host

## 2026-02-04: Faster external refresh

### What was done
- Reduced `.chezmoiexternal.toml.tmpl` refresh periods to 24h for tpm, vim-plug, and clankerpedia

### Rationale
- Keeps externals fresher without requiring `chezmoi apply --refresh-externals` every time

## 2026-02-04: Bash completion UX + fzf tweaks

### What was done
- Enabled readline to show all ambiguous completions and cycle through them with `TAB`
- Added fzf completion defaults (`**` trigger, compact reverse layout) before `fzf --bash`

## 2026-02-04: 1Password session sharing across WezTerm panes

### What was done
- Added `op_signin` wrapper and `PROMPT_COMMAND` hook to `dot_op_helper.sh`
- Added `config.set_environment_variables` block to `dot_wezterm.lua.tmpl` that reads `~/.op_session`

### How it works
- `op_signin` runs `op signin` and writes `OP_SESSION_*` to `~/.op_session` (mode 600)
- WezTerm watches `~/.op_session` via `add_to_config_reload_watch_list` — new panes get the var automatically
- Existing panes pick it up on next prompt via `_op_check_session` in `PROMPT_COMMAND` (only re-reads on mtime change)

## 2026-02-15: Stable WezTerm tab title truncation

### What was done
- Added a `format-tab-title` handler in `dot_wezterm.lua.tmpl` that truncates long tab labels and hostnames
- Removed usernames from `user@host` patterns shown in tab text
- Added a per-tab fallback title cache and defensive `pcall` fallback to tab index

### Key Design Decisions
- **Stability over live updates**: cache fallback titles per tab id to avoid rapid oscillation from dynamic pane title changes
- **Manual names win**: if a tab was renamed with `set_title`, use that value (sanitized + truncated) instead of cache
- **Fail-safe rendering**: if formatter logic errors, return tab index to avoid crashing/blank tab labels

## 2026-02-15: WezTerm path-only tab titles follow-up

### What was done
- Removed `max_width`-driven title shrinking from `format-tab-title`
- Switched fallback title parsing to path-only extraction from pane titles (drop `user@host:` / `host:` prefixes)

### Key Design Decisions
- **Single truncation policy**: use only `MAX_TAB_TITLE_LEN` for predictable label length
- **Path-first context**: default tab labels now show path context without host/user noise

## 2026-02-15: WezTerm shell integration auto-setup

### What was done
- Added `.chezmoiexternal.toml.tmpl` entry to fetch `wezterm.sh` from WezTerm upstream into `~/.local/share/wezterm/shell-integration/wezterm.sh`
- Updated `dot_bashrc.tmpl` to source the script automatically when running inside WezTerm (`WEZTERM_PANE` set)

### Key Design Decisions
- **Upstream source of truth**: fetch script directly from `wezterm/main` so integration stays aligned with WezTerm updates
- **Runtime guard**: source only when inside WezTerm and file exists, avoiding unnecessary shell startup work elsewhere

## 2026-03-11: Add Windows PowerShell profile

### What was done
- Added `Documents/WindowsPowerShell/Microsoft.PowerShell_profile.ps1` to the chezmoi source tree.
- Updated `.chezmoiignore.tmpl` to ignore `Documents/WindowsPowerShell/**` on non-Windows hosts.
