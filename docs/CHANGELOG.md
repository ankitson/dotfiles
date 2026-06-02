# Changelog

## 2026-06-01

### Shared agentmemory configuration
- Added `agentmemory_url` chezmoi data and exported `AGENTMEMORY_URL` in
  interactive shells.
- Added pinned agentmemory MCP entries for OpenCode and pi.
- Vendored upstream OpenCode and pi capture integrations.
- Added a `run_onchange` provisioner for Codex and Claude Code MCP entries and
  native plugins without taking ownership of their stateful global config.

## 2026-05-29

### Toolbox bootstrap
- Added `run_before_clone-toolbox.sh.tmpl` to clone `/projects/toolbox` only when the canonical clone is missing.
- Added `symlink_dot_agents.tmpl` so `~/.agents` resolves to the shared toolbox clone.

## 2026-05-26: Split pi context — generic AGENTS.md from clankerpedia, env stays private

Refines the previous entry. clankerpedia (public) owns the shared, machine-agnostic
agent instructions; the private dotfiles own this machine's env (internal infra).

- `private_dot_pi/private_agent/symlink_AGENTS.md.tmpl` → `~/.agents/AGENTS.md`: pi now uses the same global agent instructions as `~/.claude` and `~/.codex` (clankerpedia). Deploys on all personal machines.
- `private_dot_pi/private_agent/symlink_APPEND_SYSTEM.md` → `ENV_DEVBOX.md`: pi appends the devbox env to its system prompt via `~/.pi/agent/APPEND_SYSTEM.md` (devbox-only). Internal infra (hostnames/IPs/ports) stays in this private repo — never in public clankerpedia.
- Removed `AGENTS.md.tmpl` (the chezmoi `include` of ENV_DEVBOX.md) and the redundant `ENV.md` symlink.
- `.chezmoiignore.tmpl`: only `ENV_DEVBOX.md` + `APPEND_SYSTEM.md` are devbox-gated now; `AGENTS.md` (clankerpedia symlink) deploys everywhere personal.

Net on devbox: `~/.pi/agent/AGENTS.md` → clankerpedia generic instructions; `~/.pi/agent/APPEND_SYSTEM.md` → `ENV_DEVBOX.md` (this box's environment). On other machines: just the clankerpedia AGENTS.md.

## 2026-05-26: Replace environment.ts extension with chezmoi-managed context files

Drop the custom `environment.ts` pi extension in favor of native pi context files.

- `private_dot_pi/private_agent/ENV_DEVBOX.md`: source of truth for the devbox runtime info (shared dirs, ports→host, `http://dev.ankitson.com:<port>` public URL, GPU/DISPLAY).
- `private_dot_pi/private_agent/AGENTS.md.tmpl`: pi auto-loads `~/.pi/agent/AGENTS.md` as a global context file. It contains only `{{ include "...ENV_DEVBOX.md" }}` — pi has no in-file `@FILE.md` include (that syntax is CLI-only for prompt attachment), so chezmoi inlines the whole ENV file at apply time. Single source = ENV_DEVBOX.md, nothing hand-written.
- `symlink_ENV.md` → `ENV_DEVBOX.md`: chezmoi-managed symlink so `~/.pi/agent/ENV.md` is a stable handle to this machine's env file.
- `.chezmoiignore.tmpl`: these three are deployed only when `hostname == devbox` (host / agent-devbox keep their defaults).
- Removed `extensions/environment.ts` (and its `/env` command). Env info now rides in the system context automatically via AGENTS.md.

## 2026-05-26: Fix bashrc syntax error from X_BEARER_TOKEN quoting

- `dot_bashrc.tmpl`: `export X_BEARER_TOKEN={{ $bearerToken | quote }}` produced a double-quoted shell string; Go's `quote` does NOT escape backticks or `$`, so a token value containing them (the `op://clankers/x/bearerToken` item was rotated) opened an unclosed command substitution → `~/.bashrc: syntax error: unexpected end of file` on freshly-rendered machines (hit on the devbox after re-apply). Now base64-encode the secret at render time (`b64enc`) and decode at runtime (`base64 -d`) inside single quotes — safe for any token contents. Verified lossless round-trip against a value containing `` ` ``, `$()`, `"`, `'`, `\`.

## 2026-05-26: Move to off-the-shelf pi plugins (first-party + community)

Prefer maintained packages/first-party extensions over hand-rolled ones.

### Changed
- `settings.json.tmpl` packages: `["git:github.com/badlogic/pi-doom", "npm:pi-mcp-adapter", "npm:pi-subagents", "npm:pi-goal-x", "npm:pi-web-access"]`.
  - `pi-goal-x` (tmonk/pi-goal-x) — persistent goal management w/ drafting, confirmation, independent completion auditor, multi-goal. Replaces custom `goal-mode.ts`.
  - `pi-web-access` — `web_search` (Exa/Perplexity/Gemini), `code_search`, `fetch_content` (URLs, GitHub repos, YouTube, PDFs), curator UI. Replaces custom `web-tools.ts`. NOTE: defaults to Exa MCP (external) — drops the local SearXNG (`search.home.ankitson.com`) fallback our web-tools used.

### Added
- `settings.json.tmpl` `extensions`: reference pi's first-party bundled examples **in place** (not copied) via absolute paths under `{{ .chezmoi.homeDir }}/.local/lib/node_modules/@earendil-works/pi-coding-agent/examples/extensions/`:
  - `tools.ts` — `/tools` interactive enable/disable tool selector (persists across reloads). Replaces the static `tools-command.ts` cheatsheet.
  - `plan-mode/index.ts` — Plan Mode (read-only exploration; `/plan` or Ctrl+Alt+P; plan-step extraction + progress widget).
  - Referencing instead of vendoring means they track the installed pi version and resolve their `@earendil-works/pi-*` imports from pi's own deps. Paths are templated to an absolute home dir (identical on host and devbox).

### Removed
- `extensions/goal-mode.ts` → pi-goal-x.
- `extensions/web-tools.ts` → pi-web-access.
- `extensions/tools-command.ts` → first-party tools.ts.

### Kept (no off-the-shelf equivalent)
- `extensions/environment.ts` (devbox runtime awareness), `extensions/browser-tools.ts` (Playwright screenshot — pi-web-access has no screenshot tool).

## 2026-05-26: Pi packages (subagents + MCP) and global MCP config

### Changed
- `settings.json.tmpl`: declare `"packages": ["git:github.com/badlogic/pi-doom", "npm:pi-mcp-adapter", "npm:pi-subagents"]`.
  - `pi-subagents` — maintained subagent package (tool `subagent`; commands `/run`, `/chain`, `/run-chain`, `/parallel`, `/subagents-doctor`; bundled skills/prompts) replacing the hand-rolled extension.
  - `pi-mcp-adapter` — MCP support behind a single low-token proxy tool (`mcp({search})`), servers connect lazily.
  - `pi-doom` — preserved (was already in the live host settings; declaring it keeps chezmoi from dropping it).
- `tools-command.ts` (`/tools`): list the `subagent` tool + pi-subagents commands.

### Added
- `private_dot_pi/private_agent/mcp.json`: pi-global MCP config (`~/.pi/agent/mcp.json`) with the `fastmail` server (`https://api.fastmail.com/mcp`, `auth: oauth`, lazy, directTools). Promoted from a project-only `.pi/mcp.json`. No secrets in the file — OAuth tokens live per-machine in `~/.pi/agent/mcp-oauth/` (never committed); first use on a new machine triggers the OAuth flow.

### Removed
- `extensions/subagent-tools.ts`: replaced by the pi-subagents package.

### Notes
- User-settings packages are NOT auto-installed on pi startup (only project `.pi/settings.json` packages are). So `first-run.sh` / `agent-first-run.sh` (in the devdocker repo) now run `pi update --extensions` after `chezmoi apply` to fetch declared packages. On an already-running container, run `pi update --extensions` once.

## 2026-05-26: Pi sessions from devbox flow into AgentsView

### Added
- `private_dot_pi/private_agent/settings.json.tmpl` (was `settings.json`): inside the devbox container (detected via `stat "/mnt/host/home/ankit"`, the host-home bind mount), set pi's `sessionDir` to `/mnt/host/home/ankit/.pi/agent/sessions` — i.e. the host's `~/.pi/agent/sessions`. AgentsView already ingests that directory (`PI_DIR=/agents/pi`), so pi sessions created inside devbox now appear in AgentsView automatically, with no AgentsView/compose change. On the host and on the Hermes `agent-devbox` (no such mount) the line is omitted, keeping pi's default session location. Note: devbox and host pi sessions commingle in that dir (acceptable — no per-machine tagging).

## 2026-05-26: Pi extensions — env-awareness, local browser, drop code_execute

Now that `pi` runs *inside* the `devbox` container (rather than calling into it):

### Added
- `private_dot_pi/private_agent/extensions/environment.ts`: injects container runtime context into the system prompt via the `before_agent_start` event (shared `/projects` mount, host home at `/mnt/host/home/ankit`, ports `3000-3100` published 1:1 to the host for serving web apps, SSH on 2201, GPU/DISPLAY). Guarded by a devbox detection check (`/mnt/host/home/ankit` mount / hostname) so it does NOT fire when the same dotfiles run on the host. Also registers a `/env` command.
- `private_dot_pi/private_agent/extensions/browser-tools.ts`: `browser_screenshot` rewritten to be self-contained and local — drives the container's bundled Playwright (Chromium, headless) via an inline node script in `os.tmpdir()`. No nested container, no dependency on a pre-placed `/projects/pi_screenshot.py`.
- `private_dot_pi/private_agent/extensions-available/code_execute.ts`: the old `code_execute` tool, kept as reference but deliberately OUTSIDE the auto-discovered `extensions/` dir so it does not load (pi's built-in `bash` already covers it).

### Removed
- `private_dot_pi/private_agent/extensions/devbox-tools.ts`: split into `browser-tools.ts` (browser_screenshot, now local) and `extensions-available/code_execute.ts` (not loaded).

### Changed
- `tools-command.ts` (`/tools`): updated listing — built-in vs custom tools, dropped `code_execute`, browser is now "local Playwright", lists `/goal`, `/env`, `/tools`.

### Fixed
- `goal-mode.ts`: the goal reminder hooked a non-existent `message_sent` event (silent no-op). Ported to the documented `before_agent_start` hook, which now appends the goal reminder to the system prompt each prompt. Also fixed the status indicator: was misusing `pi.setLabel` (which labels session-tree entries); now uses `ctx.ui.setStatus`. Kickoff uses `pi.sendUserMessage` (string) instead of `pi.sendMessage` (which expects a message object).

### Notes
- Foldable thinking/tool blocks are native in pi: `ctrl+t` toggles thinking, `ctrl+o` toggles tool output. No config needed.
- On an already-running container, `chezmoi apply` won't delete the now-removed `devbox-tools.ts`; remove it once with `rm ~/.pi/agent/extensions/devbox-tools.ts` then `/reload`. Fresh image builds are clean.

## 2026-05-26: Pi agent secrets via 1Password (fix "No models available")

### Added
- `private_dot_pi/private_agent/models.json.tmpl`: LiteLLM provider `apiKey` injected from `op://clankers/litellm/password` via `onepasswordRead`, matching the SSH key / `X_BEARER_TOKEN` declarative pattern.
- `private_dot_pi/private_agent/auth.json.tmpl`: `opencode` and `deepseek` provider keys injected from `op://clankers/opencode-zen/password` and `op://clankers/deepseek/password`.
- `.chezmoiignore.tmpl`: ignore `.pi` on non-personal machines (mirrors the `.ssh` rule) so `onepasswordRead` is never called where 1Password is unavailable.

### Removed
- `private_dot_pi/private_agent/models.json` and `auth.json`: static files that hardcoded the non-functional literal placeholders `"$LITELLM_API_KEY"` / `"LITELLM_API_KEY"`. Pi reads `apiKey` as a literal string (no env expansion), so these authenticated with garbage and produced "No models available" in the devbox container. Replaced by the templated versions above.

## 2026-03-02: Sync bashrc environment

### Changed
- `dot_bashrc.tmpl`: include `.opencode/bin` and `.bun/bin` in the consolidated PATH block so the shared template now matches the live `~/.bashrc`.
- `dot_bashrc.tmpl`: source `X_BEARER_TOKEN` via `onepasswordRead "op://x/bearerToken"` so the bearer token follows the same declarative 1Password helper pattern as the SSH keys.

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

## 2026-02-04: 1Password session sharing across WezTerm panes

### Added
- `dot_op_helper.sh`: `op_signin` wrapper that saves `OP_SESSION_*` to `~/.op_session`, plus `PROMPT_COMMAND` hook to auto-load it in existing panes
- `dot_wezterm.lua.tmpl`: Reads `~/.op_session` and sets `config.set_environment_variables` for new panes; watches file for config reload

## 2026-02-15: WezTerm tab title stability and truncation

### Changed
- `dot_wezterm.lua.tmpl`: Added a stable `format-tab-title` handler that:
- truncates full tab labels (`MAX_TAB_TITLE_LEN = 28`)
- truncates hostnames (`MAX_HOSTNAME_LEN = 12`) and shortens FQDN hostnames to first segment
- hides usernames by rewriting `user@host` to `host`
- caches fallback title per tab id to prevent oscillation between pane titles
- uses `pcall` and falls back to tab index if formatting fails

## 2026-02-15: WezTerm path-only title revision

### Changed
- `dot_wezterm.lua.tmpl`: `format-tab-title` now ignores `max_width` and uses fixed truncation (`MAX_TAB_TITLE_LEN`)
- `dot_wezterm.lua.tmpl`: fallback parsing now extracts only path from pane titles (for example, `user@host: /path` -> `/path`)

## 2026-02-15: WezTerm shell integration auto-setup

### Added
- `.chezmoiexternal.toml.tmpl`: Added external file mapping for `~/.local/share/wezterm/shell-integration/wezterm.sh` from WezTerm upstream

### Changed
- `dot_bashrc.tmpl`: Auto-sources `wezterm.sh` when running inside WezTerm (`WEZTERM_PANE` is set) and the integration file is present

## 2026-03-11: Windows PowerShell profile

### Added
- `Documents/WindowsPowerShell/Microsoft.PowerShell_profile.ps1`: Windows PowerShell profile from `~/Documents/WindowsPowerShell/`.

### Changed
- `.chezmoiignore.tmpl`: Ignore `Documents/WindowsPowerShell/**` when `chezmoi.os` is not `windows`.
