# Chezmoi Dotfiles - Notes

## 2026-06-26

### Config flag cleanup + Tailscale inventory to TOML

#### Goal
Clean up the accreted boolean feature flags in `.chezmoi.toml.tmpl` and finish moving the device inventory fully into 1Password.

#### Decisions
- Two boolean pairs were really enums in disguise: `personal`/`is_agent` → `identity` (`none`/`personal`/`agent`), and `is_devbox`/`is_homeserver` → `host` (`generic`/`devbox`/`homeserver`). `none` is the third state the original `personal=false` covered. Callsites read bare `.identity`/`.host` and crash on a missing key by design — forces an explicit value after `chezmoi init` rather than silently defaulting.
- `internal_network` deprecated, not deleted: kept as a documented tombstone because Tailscale now reaches internal hosts from anywhere, so there's no LAN-only path left to gate.
- Inventory stays in 1Password (not a chezmoi data file): it must stay out of git for privacy, and three consumers across two repos read it (ssh client config, macOS sshd allowlist, homeserver Caddy `trusted` allowlist) — only 1Password is reachable by all three.
- Inventory schema made dumb/explicit per request: explicit `hostname` per device, IPs as `ts_ips`/`lan_ips` lists rather than scalar `ipv4`/`ipv6`.
- sshd allowlist trusts `lan_ips` (anti-lockout if Tailscale is down); Caddy stays tailnet-only and does NOT, matching the earlier hardening that removed off-Tailscale ingress.

#### Discovery
- The hardcoded `desktop`/`devbox`/`synology` Host blocks were the last device IPs left in git. Only `desktop-linux` was already in the inventory; `devbox` is the homeserver reached on ssh port 2201 (`desktop-linux.<tailnet>:2201`); `synology` was dropped per request.
- chezmoi's op integration requires the config's `onepassword.mode` to match the environment (service token vs interactive session). Rendering templates that call `onepasswordRead` only works when the generated config's mode and the shell env agree — relevant when testing on a host that has `OP_SERVICE_ACCOUNT_TOKEN` set.

#### Verification
- Validated the Caddy allowlist output is byte-identical before/after both vault rewrites (ts-only IP set unchanged).
- Confirmed the sshd allowlist gains `172.16.0.208` (desktop-linux LAN) and that all three consumers parse the TOML.
- Rendered both `identity = personal` and `identity = agent` branches: correct git identity, `claudep`, AGENTS.env section, and SSH vault per mode.

#### Next steps
- Add `lan_ips` for any other devices that should keep LAN reachability — only `desktop-linux` is populated.
- Reconcile a leftover: the agent `claudep` still reads `op://Agents/claude-code/credential` while everything else (ssh keys, inventory) uses the `clankers` vault.

## 2026-06-22

### Tailscale inventory source moved to 1Password

#### What was done
- Confirmed the `clankers/tailscale-inventory` Secure Note exposes its YAML body as `op://clankers/tailscale-inventory/notesPlain`.
- Switched the SSH client config template and macOS sshd allowlist partial to parse that note with `onepasswordRead | fromYaml`.
- Removed `.chezmoidata/tailscale.yaml` so the device list is not duplicated in the dotfiles repo.

#### Next steps
- Edit the `tailscale-inventory` Secure Note when devices, trusted flags, aliases, or SSH ports change, then run `chezmoi apply --refresh-externals --force` on personal machines.

## 2026-06-14

### Merged just recipe view

#### What was done
- Replaced the global-only `just` alias with a Bash wrapper that can see both the nearest local justfile and `~/justfile`.
- Clear pre-existing `just`/`j` aliases before defining the wrapper so `source ~/.alias.sh` does not alias-expand the `just()` function declaration in already-open shells.
- `just`, `just --list`, and `just -l` now print local recipes first and global recipes second when a local justfile exists.
- `just <recipe>` runs the local recipe when present; otherwise it falls back to `command just -g <recipe>`.

#### Key Decisions
- Keep this as shell behavior rather than trying to force `just -g` to merge files; installed `just` has a global mode but no built-in merged local/global list.
- Explicitly ignore `~/justfile` when detecting a local justfile so global recipes still run with `just -g` semantics from arbitrary directories.

#### Verification
- Rendered `~/.alias.sh` with chezmoi and tested the wrapper in a scratch directory containing a local `justfile`.
- Confirmed merged listing, local recipe dispatch, and global fallback for `docs-build --dry-run`.
- Confirmed re-sourcing `~/.alias.sh` works when old `just`/`j` aliases are already defined.
- Applied `~/.alias.sh` with chezmoi and confirmed `just --list` still shows the global list from a directory without a local justfile.

## 2026-06-11

### Global justfile and docs recipes

#### What was done
- Added a chezmoi-managed `~/justfile` with `docs-build`, `docs-serve`, and `docs-deploy` recipes based on `/projects/job-search`.
- Updated shell aliases so both `just` and `j` run the global justfile by default.
- Added a managed `~/.config/webby/config.json` so `internal` and `public` bags are available to every `webby` invocation.

#### Key Decisions
- Use `command just -g` in aliases to avoid bash recursively expanding `j` into duplicate `-g` flags.
- Keep webby bag configuration in webby's config file instead of shell aliases, so non-interactive tools like just see the same context.
- Store webby's Cloudflare account id as regular chezmoi data; keep only the API token as a runtime 1Password reference.
- Derive `docs-deploy`'s base name from the current directory, e.g. `/projects/job-search` passes `jobsearch-docs`; webby's `--tmp` mode publishes it as `tmp-jobsearch-docs`.
- Use toolbox's `docme` command for Markdown site generation. Keep webby deployment in the justfile, where `docs-deploy` builds to a temporary output directory and deletes it after `webby add`.

## 2026-06-07

### Global OpenCode YOLO agent

#### What was done
- Added a chezmoi-managed OpenCode agent at `private_dot_opencode/agents/yolo.md`, rendered to `~/.opencode/agents/yolo.md`.

#### Key Decisions
- Keep OpenCode MCP servers and plugins in the existing global `~/.config/opencode/opencode.jsonc` config.
- Define the YOLO agent as a markdown agent under `~/.opencode/agents/` so it is available from all projects.

## 2026-06-03

### Pi OpenAI Codex provider defaults

#### What was done
- Confirmed Pi already has a built-in `openai-codex` provider using the `openai-codex-responses` API and ChatGPT Plus/Pro Codex subscription OAuth.
- Found public Pi packages that rely on the same built-in provider (`pi-codex-search`, `pi-provider-service-tier`, `end-pi-multi-pass`) rather than replacing it with a separate provider plugin.
- Switched Pi's default provider/model to `openai-codex` / `gpt-5.5`.
- Replaced the fully managed `~/.pi/agent/auth.json` template with a small `jq` merge script that injects managed API keys while preserving OAuth entries such as `openai-codex`.

#### Next steps
- In Pi, run `/login openai-codex` once and choose `ChatGPT Plus/Pro (Codex Subscription)` if prompted.
- Future `chezmoi apply` runs should preserve that OAuth entry while refreshing managed API keys from 1Password.

### Pi MCPProxy metadata refresh

#### What was done
- Switched Pi's managed `mcpproxy` MCP server lifecycle from `lazy` to `eager`.

#### Why
- MCPProxy's visible tool set changes after upstream OAuth and tool approval. Eager startup lets Pi
  refresh the gateway metadata instead of relying on a stale `mcp-cache.json` entry.

### Codex MCPProxy auth without env-var dependency

#### What was done
- Switched Codex's managed `mcpproxy` MCP block from `bearer_token_env_var` to a literal
  `Authorization` header written by the run-onchange script.
- Removed the `codex()` shell wrapper that injected `MCPPROXY_AGENT_TOKEN`.
- Centralized the shared MCPProxy gateway URL in `.chezmoidata.toml` as `mcpproxy_gateway_url`; Claude,
  Pi, OpenCode, and Codex config generation now reference that value.

#### Why
- Codex can be launched from contexts where shell functions are not active, so relying on
  `MCPPROXY_AGENT_TOKEN` caused MCP startup to fail before the wrapper could help.
- The gateway URL is a shared client contract and should not be hand-maintained across each agent
  config template.

### Toolbox bin link refresh

#### What was done
- Converted the toolbox bin linker from `run_once_after_` to a templated `run_onchange_after_` script.
- Added a rendered fingerprint of executable regular files in `~/toolbox/bin` so `chezmoi apply` reruns the link step when bins are added, removed, or changed.
- Added a regular-file guard before linking so executable directories such as `tests/` are skipped.

#### Why
- `run_once_after_` skipped the linker once the same script content had already run on a machine, leaving newly added toolbox bins unpublished until a manual script run or forced apply.
- Directories can have the execute bit, so the previous `[ -x "$f" ]` check was not enough to avoid linking subdirectories.

## 2026-05-29

### Toolbox bootstrap via canonical /projects clone

#### What was done
- Added a minimal `run_before_clone-toolbox.sh.tmpl` script that clones `toolbox` to `/projects/toolbox` only when `/projects/toolbox/.git` is absent.
- Added `symlink_dot_agents.tmpl` so `~/.agents` points at `/projects/toolbox`.

#### Key Design Decisions
- Keep `/projects/toolbox` as the single canonical clone because `/projects` is the shared host/container path.
- Keep `~/toolbox` and agent skill paths as symlinks into that canonical clone.
- Do not use a chezmoi external for toolbox because externals target paths under `$HOME`, which creates per-container clones and drift.
- Keep the bootstrap script intentionally small: no stale-directory migrations, no backups, no bin-script behavior changes.

#### Next steps
- Apply on a clean host to confirm `run_before_clone-toolbox.sh` clones before symlink creation.
- On machines with an existing real `~/.agents` directory, remove or move it once before applying the new symlink.

## 2026-05-26

### Pi agent "No models available" fix

#### What was done
- Root cause: pi reads `apiKey` in `~/.pi/agent/models.json` as a **literal string** — it does not expand `$LITELLM_API_KEY`. The previous static `models.json`/`auth.json` shipped literal placeholders (`"$LITELLM_API_KEY"`, `"LITELLM_API_KEY"`), so pi inside the `devbox` container authenticated with garbage and reported "No models available".
- Converted both to chezmoi templates that inject the real keys at apply time via `onepasswordRead`, the same declarative pattern already used for SSH keys and `X_BEARER_TOKEN`:
  - `models.json.tmpl` → `op://clankers/litellm/password` (LiteLLM gateway, the `litellm` provider / default).
  - `auth.json.tmpl` → `op://clankers/opencode-zen/password` and `op://clankers/deepseek/password`.
- Added `.pi` to the `not .personal` block of `.chezmoiignore.tmpl` so the templates are skipped on machines without 1Password.
- Verified with `chezmoi execute-template` that both render to valid JSON and resolve to the real keys (litellm `sk-tdjK…`, opencode-zen `sk-uD17…`, deepseek `sk-a822…`), matching the host's working `~/.pi/agent` config.

#### Next steps
- Sign into 1Password (`op signin`) before running `chezmoi apply` so `onepasswordRead` can fetch the pi keys (in `agent-devbox`, `OP_SERVICE_ACCOUNT_TOKEN` is already in env, so apply works non-interactively).
- Rebuild the devbox image (`build.sh` now tags `ankit/devbox:1.5`) to bake pi in, then re-run `pi` in the container to confirm models list.
- Unrelated but adjacent: `opencode.jsonc` still reads `{env:LITELLM_API_KEY}`, which nothing currently exports. If opencode also reports auth failures in the container, export it in `dot_bashrc.tmpl` via `onepasswordRead "op://clankers/litellm/password"` (same as `X_BEARER_TOKEN`).

## 2026-03-11

### Add Windows PowerShell profile

#### What was done
- Added `Documents/WindowsPowerShell/Microsoft.PowerShell_profile.ps1` to the chezmoi source tree.
- Updated `.chezmoiignore.tmpl` to ignore `Documents/WindowsPowerShell/**` on non-Windows hosts.

## 2026-03-02

### Restore chezmoi source-tracking

#### What was done
- Repointed `~/.local/share/chezmoi` toward `ssh://git@git.home.ankitson.com:1024/ankitson/dotfiles.git`, fetched the remote, and reset `main` to `origin/main` so the source repo matches this tree again.
- Confirmed the working tree is clean (git status shows no working-tree or staging diffs) and that `chezmoi` sees the expected commit (`36d1427`).
- Left the previous clankerpedia copy untouched so the history is still available if we need to inspect it.

#### Next steps
- Run `chezmoi update --refresh-externals --force` the next time dotfiles cover updates that pull externals so that the local source stays synchronized.

### Sync bashrc env sources

#### What was done
- Added `.opencode/bin` and `.bun/bin` to the consolidated PATH block in `dot_bashrc.tmpl` so the template now reflects the live `~/.bashrc`.
- Used `onepasswordRead "op://x/bearerToken"` inside the template so `X_BEARER_TOKEN` is exported from the 1Password secret in the same pattern as the SSH keys, keeping the bearer token sourcing declarative.
- Confirmed `chezmoi diff ~/.bashrc` reports only the expected block changes.

#### Next steps
- Sign into 1Password (`op signin`) before running `chezmoi apply --refresh-externals --force` so `onepasswordRead` can fetch the bearer token and SSH keys.

## 2026-02-15

### Stable WezTerm tab title truncation

#### What was done
- Added a `format-tab-title` handler in `dot_wezterm.lua.tmpl` that truncates long tab labels and hostnames
- Removed usernames from `user@host` patterns shown in tab text
- Added a per-tab fallback title cache and defensive `pcall` fallback to tab index

#### Key Design Decisions
- **Stability over live updates**: cache fallback titles per tab id to avoid rapid oscillation from dynamic pane title changes
- **Manual names win**: if a tab was renamed with `set_title`, use that value (sanitized + truncated) instead of cache
- **Fail-safe rendering**: if formatter logic errors, return tab index to avoid crashing/blank tab labels

### WezTerm path-only tab titles follow-up

#### What was done
- Removed `max_width`-driven title shrinking from `format-tab-title`
- Switched fallback title parsing to path-only extraction from pane titles (drop `user@host:` / `host:` prefixes)

#### Key Design Decisions
- **Single truncation policy**: use only `MAX_TAB_TITLE_LEN` for predictable label length
- **Path-first context**: default tab labels now show path context without host/user noise

### WezTerm shell integration auto-setup

#### What was done
- Added `.chezmoiexternal.toml.tmpl` entry to fetch `wezterm.sh` from WezTerm upstream into `~/.local/share/wezterm/shell-integration/wezterm.sh`
- Updated `dot_bashrc.tmpl` to source the script automatically when running inside WezTerm (`WEZTERM_PANE` set)

#### Key Design Decisions
- **Upstream source of truth**: fetch script directly from `wezterm/main` so integration stays aligned with WezTerm updates
- **Runtime guard**: source only when inside WezTerm and file exists, avoiding unnecessary shell startup work elsewhere

## 2026-02-04

### Faster external refresh

#### What was done
- Reduced `.chezmoiexternal.toml.tmpl` refresh periods to 24h for tpm, vim-plug, and clankerpedia

#### Rationale
- Keeps externals fresher without requiring `chezmoi apply --refresh-externals` every time

### Bash completion UX + fzf tweaks

#### What was done
- Enabled readline to show all ambiguous completions and cycle through them with `TAB`
- Added fzf completion defaults (`**` trigger, compact reverse layout) before `fzf --bash`

### 1Password session sharing across WezTerm panes

#### What was done
- Added `op_signin` wrapper and `PROMPT_COMMAND` hook to `dot_op_helper.sh`
- Added `config.set_environment_variables` block to `dot_wezterm.lua.tmpl` that reads `~/.op_session`

#### How it works
- `op_signin` runs `op signin` and writes `OP_SESSION_*` to `~/.op_session` (mode 600)
- WezTerm watches `~/.op_session` via `add_to_config_reload_watch_list` — new panes get the var automatically
- Existing panes pick it up on next prompt via `_op_check_session` in `PROMPT_COMMAND` (only re-reads on mtime change)

## 2026-01-31

### WezTerm + macOS portability

#### What was done
- Converted `.wezterm.lua` to chezmoi template (`dot_wezterm.lua.tmpl`)
- Templated `default_prog` to use Homebrew bash if `/opt/homebrew/bin/bash` exists, otherwise `/bin/bash`
- `macos_window_background_blur` only emitted on macOS
- Added `audible_bell = 'Disabled'`
- Added `eval "$(/opt/homebrew/bin/brew shellenv)"` to `.bashrc.tmpl` on macOS (before PATH/environment block)
- Moved `karabiner.json` to `private_dot_config/karabiner/karabiner.json`, ignored on non-macOS via `.chezmoiignore.tmpl`
- Deleted old `.zshrc` (superseded by `.bashrc.tmpl`)

#### Key Design Decisions
- **WezTerm shell detection**: Uses `stat "/opt/homebrew/bin/bash"` rather than OS check — works if someone has macOS without Homebrew bash
- **Karabiner macOS-only**: Gated via `.chezmoiignore.tmpl` (`ne .chezmoi.os "darwin"`), not a template — the JSON stays plain
- **Brew shellenv**: Placed early in `.bashrc.tmpl` (after bash-completion, before environment/PATH) so `HOMEBREW_PREFIX` is available for downstream tools
- **SSHMUX persistence**: Confirmed that `wezterm-mux-server --ssh` survives client disconnects — sessions persist without needing `unix_domains` daemon setup

#### Verification Steps
1. `chezmoi execute-template < .chezmoi.toml.tmpl` — verify feature detection
2. `chezmoi diff` — inspect what would change
3. `chezmoi cat ~/.bashrc` — verify single PATH block
4. `chezmoi cat ~/.ssh/id_rsa` — verify 1Password integration (requires `op signin`)
5. `chezmoi cat ~/.gitconfig` — verify email, gh helper rendered
6. `chezmoi apply -v -n` (dry run) on each host

## 2026-01-30

### v2 Reorganization Complete

#### What was done
- Reorganized chezmoi dotfiles following twpayne's reference implementation patterns
- Replaced static `dot_gitconfig` with templated `dot_gitconfig.tmpl`
- Replaced static `.chezmoiignore` with templated `.chezmoiignore.tmpl`
- Replaced static `.chezmoiexternal.toml` with `.chezmoiexternal.toml.tmpl` for conditional git URLs
- Added 1Password-managed SSH keys in `private_dot_ssh/`
- Added `op_helper.sh` as a chezmoi-managed file
- Added Claude Code config (`settings.json`, `statusline-command.sh`)
- Added clankerpedia (agents/skills) as external git-repo with symlinks into `~/.claude/` and `~/.codex/`

#### Key Design Decisions
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

#### 1Password Items Required
| Item | Field | Used for |
|---|---|---|
| `SSH Key` (or `dev`) | `private key` | `~/.ssh/id_rsa` |
| `SSH Key` (or `dev`) | `public key` | `~/.ssh/id_rsa.pub`, `~/.ssh/authorized_keys` |
| `Borg Backup` | `password` | `$BORG_PASSCOMMAND` (runtime) |
| `Anthropic` | `claude-code-setup-token` | `claudep` function (runtime) |
