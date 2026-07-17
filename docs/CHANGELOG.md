# Changelog

## 2026-07-17

### Cache-first Pi Bifrost and OpenCode model discovery

- Migrated the live Bifrost and OpenCode model providers to Pi's persisted
  `refreshModels` catalog API, so startup uses the local catalog immediately
  and refreshes stale entries in the background.
- Primed the cached catalogs before enabling the migration, preserving all
  currently exposed Bifrost (1,171) and OpenCode (55) models and their
  supported Pi metadata.

### Disable Pi's duplicate browser screenshot tool

- Moved `browser-tools.ts` to Pi's `extensions-available/` source directory
  and added its old live path to `.chezmoiremove`, disabling the auto-loaded
  `browser_screenshot` tool while preserving its source for a reversible
  re-enable.

### Disable Pi's stale devbox tools

- Moved the unmanaged `devbox-tools.ts` extension to `extensions-available/`
  and added its active path to `.chezmoiremove`, disabling the redundant
  `devbox_code_execute` and `devbox_browser_screenshot` tools while retaining
  their source as a backup.

## 2026-07-11

### AGENTS.md fan-out: cover ~/AGENTS.md and OpenCode's XDG root
- Added root `symlink_AGENTS.md.tmpl` (manages `~/AGENTS.md`, previously an
  unmanaged drifted hand-copy) and
  `private_dot_config/opencode/symlink_AGENTS.md.tmpl` (OpenCode reads global
  rules from `~/.config/opencode/AGENTS.md`, which didn't exist) — both →
  `~/toolbox/AGENTS.md`, matching the existing claude/codex/opencode/pi links.
- `dot_AGENTS.env.md.tmpl`: dropped the stale `~/hroot/INDEX.md` pointer
  (index moved to `~/hroot/allplace/wiki/INDEX.md` and is inlined into
  AGENTS.md by `toolbox/context/build.py`); updated the header comment — the
  file is now inlined by the toolbox render, not `@`-imported.

## 2026-07-10

### Route Windows Codex app and CLI through Bifrost

- Updated the base Codex config modifier to select a named Bifrost Responses
  provider without hardcoding the user's model selection.
- Removed the legacy root OpenAI base URL/key settings and disabled Responses
  WebSockets so Bifrost's bare-model REST routing is used consistently.
- Updated the opt-in Bifrost profile to the same HTTPS route and provider
  behavior.
- Applied and validated the equivalent base-config change on Windows, restarted
  the app, and verified a fresh CLI turn through the gateway.

## 2026-07-06

### Bifrost opt-in profiles for Codex and Claude Code
- Added `~/.codex/bifrost.config.toml` as an opt-in Codex profile pointing at Bifrost's OpenAI-compatible `/openai/v1` route.
- Added `~/.claude/bifrost-settings.json` as an opt-in Claude Code settings file pointing at Bifrost's Anthropic-compatible `/anthropic` route.
- Added `codexb` and `claudeb` shell helpers alongside the existing `codexp` and `claudep` flows.

## 2026-06-27

### Codex app-server full-access defaults
- Added `private_dot_codex/modify_private_config.toml` to manage base `~/.codex/config.toml` without clobbering Codex-owned runtime state, MCP config, hook state, or secrets.
- Enforced `approval_policy = "never"` and `sandbox_mode = "danger-full-access"` in base Codex config so app-server/mobile remote-control sessions inherit the same no-prompt behavior as `codexp`.
- Marked broad local roots (`/home/ankit`, `/home/ankit/hroot`, `/home/ankit/hroot/projects`) trusted in base config so project-local Codex layers load when app/mobile starts threads there.

### Chezmoi drift noise cleanup
- Added `umask = 0o022` to the chezmoi config template so executable targets render as `0755` instead of inheriting the shell's group-writable `0002` umask.
- Renamed the toolbox bootstrap script from `run_before_` to `run_onchange_before_` so future diffs do not show it as an always-run script once its state is recorded.
- Refreshed the managed WezTerm vendor binaries from the live `20260625-133254-06c71b67` build.
- Converted Pi's `~/.pi/agent/settings.json` source to a `modify_` script so Pi-owned runtime fields like `lastChangelogVersion` and local model selection are preserved while repo-owned packages/extensions stay enforced.
- Reconciled the OpenCode Bifrost template with live additions: absolute file plugin path, `@whisperopencode/push`, the direct DeepSeek route, and the Codex model entry.
- Replaced the OpenCode YOLO agent with a top-level `permission: { "*": "allow" }` override, so Build keeps the user's current model selection while using YOLO-style permissions. Added `.chezmoiremove` for the stale `~/.opencode/agents/yolo.md` file.

### Agent config modify scripts
- Replaced the static managed sources for `~/.codex/yolow.config.toml` and `~/.claude/settings.json` with chezmoi `modify_` scripts. The scripts enforce repo-owned settings while preserving tool-owned runtime keys such as Codex `[projects.*]` / `[hooks.*]` state and Claude Code `enabledPlugins` / `tui`.
- Kept `~/.codex/yolow.config.toml` private via `modify_private_` so chezmoi preserves the live file's `0600` mode and avoids permission churn.
- Verified targeted `chezmoi diff --no-pager` and `chezmoi apply --dry-run --verbose` for both files are no-ops against this machine's current live dotfiles.

### Agent devbox identity and shell PATH
- Updated agent-mode git identity to `Azimuth <azimuth@agents.ankitson.com>`.
- Moved the consolidated `.bashrc` PATH block before the non-interactive shell return so `bash -lc` gets the same user tool paths as interactive shells.
- Added GitHub CLI (`gh`) to the devbox image package install list.

## 2026-06-26

### OpenCode config: LiteLLM → Bifrost gateway
- Reconciled `private_dot_config/opencode/opencode.jsonc.tmpl` to this machine's current setup: replaced the LiteLLM provider with the Bifrost LLM gateway (`bifrost.dev.ankitson.com`), `enabled_providers: ["bifrost"]`, the full Bifrost model list (OpenRouter/NVIDIA NIM/Unsloth/etc.), and the `bifrost-passthrough-headers.js` plugin (added to `plugins/`).
- Kept the two secret-bearing fields templated rather than copying the machine's rendered literals: mcpproxy `url` → `.mcpproxy_gateway_url`, `Authorization` → `onepasswordRead "op://clankers/mcpproxy-agents/password"`. Verified the rendered structure is byte-identical to the machine file apart from those two lines.

### Remove vestigial zsh first-run script
- Deleted `run_first_time.txt` (a `run_` script that launched zsh's `zsh-newuser-install` on every interactive apply) and its `first_time.txt` entry in the `.chezmoiignore.tmpl` Windows block. Login shell is bash and no zsh config is managed, so it only ever no-op'd (or would have run the zsh wizard on a TTY apply). Nothing referenced it.

### Webby config: reconcile to the machine's current version
- `private_dot_config/webby/config.json.tmpl` was stale (last touched 2026-06-16) vs the live file on `desktop-linux` (2026-06-23), and rendered a dangling `defaultBag: "local"` (no such bag). Replaced the source with the machine's current config: `internal` serves via Caddy at `home.ankitson.com/webby/`; `public` regenerates into the blog repo (`type: command`) for Cloudflare to build on push, rather than deploying directly via `cloudflare-pages`.
- The new config has no template expressions, so it's now a plain `config.json` (dropped the `.tmpl`). Removed the orphaned `webby_cloudflare_account_id` from `.chezmoidata.toml` (no remaining consumers).

### Machine config: collapse boolean flags into `identity` + `host` enums
- `.chezmoi.toml.tmpl`: replaced `personal` + `is_agent` with `identity` (`none` | `personal` | `agent`), and `is_devbox` + `is_homeserver` with `host` (`generic` | `devbox` | `homeserver`). One source of truth per axis; no more `personal = true` for agents.
- Rewrote every callsite: `.personal` → `ne .identity "none"`, `.is_agent` → `eq .identity "agent"`, `.is_devbox`/`.is_homeserver` → `eq .host "..."`. Flattened the gate+fork nesting in the SSH key templates and `claudep` into `if/else if` chains.
- `internal_network`: deprecated, not deleted. Kept the declaration as a tombstone comment (Tailscale now reaches internal hosts from anywhere), stopped assigning it, dropped it from `[data]`. The toolbox clone always uses `https://github.com/...` (git `insteadOf` rewrites it to ssh on secret machines); `Host git.home.ankitson.com / Port 1024` is now unconditional.

### Tailscale inventory: YAML → TOML, explicit hostnames, IP lists, LAN IPs
- Renamed the 1Password note `tailscale-inventory` → `device-inventory` (it carries LAN IPs and non-Tailscale entries now), migrated YAML → TOML, and flattened the root `[tailscale]` table to top-level `tailnet` + `[[devices]]`.
- Schema is now dumb/explicit: every device carries an explicit `hostname` (no `<name>.<tailnet>` derivation) and `ts_ips` / `lan_ips` lists (replacing scalar `ipv4`/`ipv6`).
- Added `devbox` (→ `desktop-linux.<tailnet>:2201`; no `trusted`/IPs, so it never enters the allowlists). Dropped the `synology` and bare `desktop`/`desktop-linux` hardcoded Host blocks — no device IPs remain in git.
- `private_dot_ssh/private_config.tmpl`: `fromYaml` → `fromToml`; renderer emits `Host <name>` / `HostName <hostname>` (dropped the `ts-` prefix and `aliases`).
- `.chezmoitemplates/sshd_config_tailscale_secure.conf`: `fromYaml` → `fromToml`; the source-address allowlist now includes each trusted device's `lan_ips` alongside `ts_ips`, so a trusted device isn't locked out over the LAN if Tailscale is down. `trusted` lookups are fail-closed via `dig`.
- `homeserver:bin/render-caddy-allowlist.py`: switched to stdlib `tomllib` (dropped the `pyyaml` dep); reads `ts_ips` only — Caddy stays tailnet-only and deliberately does NOT trust `lan_ips`.

### Fix agent claudep token vault
- `dot_alias.sh.tmpl`: agent `claudep` now reads `op://clankers/anthropic-claude-code-setup-token/password` instead of the stale `op://Agents/claude-code/credential` (the `Agents` vault no longer exists). Audited every `op://` reference across both repos; all others resolve.

## 2026-06-22

### Tailscale inventory from 1Password

#### Changed
- `private_dot_ssh/config.tmpl`: reads `op://clankers/tailscale-inventory/notesPlain`, parses it as YAML, and generates Tailscale SSH Host entries from devices with an `ssh:` block.
- `.chezmoitemplates/sshd_config_tailscale_secure.conf`: reads the same 1Password inventory for trusted-device IPs in the macOS sshd allowlist.
- `run_onchange_after_configure-macos-sshd.sh.tmpl`: runs only on personal Darwin machines because rendering the allowlist now requires 1Password access.

#### Removed
- `.chezmoidata/tailscale.yaml`: removed the committed Tailscale device list so 1Password is the single source of truth.

## 2026-06-14

### Merged just listing wrapper

#### Changed
- `dot_alias.sh.tmpl`: replaced the `just='command just -g'` alias with a shell function.
- `dot_alias.sh.tmpl`: clears stale `just`/`j` aliases before defining the wrapper so re-sourcing `~/.alias.sh` works in existing shells.
- `just`/`j` now show local and global recipes together for `just`, `just --list`, and `just -l` when a local justfile exists.
- Recipe execution now prefers a matching local recipe and falls back to the global justfile for global-only recipes such as `docs-build`, `docs-serve`, and `docs-deploy`.

## 2026-06-11

### Global justfile

#### Added
- `justfile`: chezmoi-managed global justfile rendered to `~/justfile`, with global docs build, serve, and deploy recipes.
- `private_dot_config/webby/config.json.tmpl`: managed webby config defining the `internal` Caddy bag and `public` Cloudflare Pages bag.
- `.chezmoidata.toml`: `webby_cloudflare_account_id` for webby's Cloudflare Pages config.

#### Changed
- `dot_alias.sh.tmpl`: `just` and `j` now invoke `command just -g`, making the global justfile the default from any directory without alias recursion.
- `justfile`: docs recipes now delegate Markdown site generation to toolbox's `docme`; `docs-deploy` handles the temporary output directory and webby publish step.

## 2026-06-07

### OpenCode YOLO agent

#### Added
- `private_dot_opencode/agents/yolo.md`: global OpenCode markdown agent rendered to `~/.opencode/agents/yolo.md`.

## 2026-06-03

### Pi OpenAI Codex provider
- Changed Pi's default provider/model to the built-in `openai-codex` provider with `gpt-5.5`.
- Replaced the managed `private_dot_pi/private_agent/auth.json.tmpl` file with `run_onchange_after_pi-auth-keys.sh.tmpl`, which uses `jq` to merge 1Password-managed API keys into `~/.pi/agent/auth.json` without overwriting OAuth credentials from `/login openai-codex`.
- Documented in `models.json.tmpl` that Codex subscription models come from Pi's built-in `openai-codex` provider.

### Pi MCPProxy metadata refresh

#### Changed
- `private_dot_pi/private_agent/mcp.json.tmpl`: changed the `mcpproxy` server lifecycle from
  `lazy` to `eager` so Pi refreshes gateway tools after upstream OAuth/approval changes.

### Codex MCPProxy auth

#### Changed
- `run_onchange_after_codex-mcp.sh`: writes Codex's `mcpproxy` MCP server with a literal
  `Authorization` header instead of `bearer_token_env_var = "MCPPROXY_AGENT_TOKEN"`.
- `dot_alias.sh.tmpl`: removed the `codex()` wrapper because Codex no longer needs a per-invocation
  token env var.
- `.chezmoidata.toml`: added `mcpproxy_gateway_url` as the single source for the shared MCPProxy
  gateway URL.
- MCP client templates for Claude, OpenCode, Pi, and Codex now render the gateway URL from
  `mcpproxy_gateway_url` instead of duplicating the literal endpoint.

### Toolbox bin linker

#### Changed
- `run_once_after_link-toolbox-bins.sh` -> `run_onchange_after_link-toolbox-bins.sh.tmpl`: the rendered script now includes a fingerprint of executable regular files in `~/toolbox/bin`, so `chezmoi apply` refreshes links when the bin set changes.
- The linker now requires each candidate to be a regular file before checking executability, preventing executable directories from being symlinked into `~/.local/bin`.

## 2026-05-31

### Enable + harden macOS sshd (Tailscale-only remote login)

Adds declarative setup so this MacBook accepts SSH, but only from trusted source addresses — driven by a shared Tailscale device inventory that the whole repo can read.

- `.chezmoidata/tailscale.yaml`: **new shared metadata** loaded into the chezmoi template data root (`.tailscale`). Lists the tailnet domain and my own Tailscale devices with their stable per-node IPv4+IPv6 and two flags: `trusted` (may SSH *into* this Mac → sshd allowlist) and an optional `ssh:` block (this Mac can SSH *to* it → a `~/.ssh/config` Host is generated, with optional `user`/`port`/`aliases`). Single source of truth for both consumers below. Third-party devices deliberately omitted.
- `.chezmoitemplates/sshd_config_tailscale_secure.conf`: the hardened drop-in (kept as a template partial so chezmoi doesn't deploy it into `$HOME`). Pubkey-only auth (`AuthenticationMethods publickey`, no password/root/empty), reduced forwarding/X11/tunnel surface, idle reaping. Source-address allowlist via a negated `Match Address "*,!…"` + `DenyUsers *`: every login is refused unless allowed. Rather than the whole Tailscale CGNAT range (`100.64.0.0/10`, which would also admit other devices sharing the tailnet), it **pins the IPs of devices flagged `trusted`** in the inventory, plus home LAN (`172.16.0.0/16`, `172.21.0.0/16`) and loopback (`127.0.0.1`, `::1`). The `Match` rule and the doc-comment table are both generated from `.tailscale`.
- `private_dot_ssh/config.tmpl`: the two hand-written `ts-*` Host blocks are replaced by a loop over `.tailscale.devices` (those with an `ssh:` block), connecting over MagicDNS (`<name>.<tailnet>`). Primary alias is `ts-<name>` (e.g. `ts-desktop-linux`, `ts-desktop-win`); the old `ts-desktop` alias is preserved via `aliases`. Note `ts-hetzner-homelab` is an outbound target (`ssh:` set) but `trusted: false`, so it's *not* in the inbound allowlist.
- `run_onchange_after_configure-macos-sshd.sh.tmpl`: enables Remote Login (`systemsetup -f -setremotelogin on`) and installs the drop-in to `/etc/ssh/sshd_config.d/010-tailscale-secure.conf` (sorts before macOS's stock `100-macos.conf`, so its first-value-wins hardening takes precedence). `sudo`-gated; validates with `sshd -t` and rolls back on failure so a bad config can't lock you out. Renders empty on non-darwin (chezmoi skips it).
- Verified with `sshd -T -C addr=…`: external IPs (8.8.8.8, 192.168.1.50) and excluded devices (hetzner, third-party) → `DenyUsers *`; trusted Tailscale devices / 172.x / 127.0.0.1 fall through to the pubkey-only baseline. macOS launches sshd per-connection via launchd, so the config is re-read on each connect — no daemon reload needed.

## 2026-05-29

### Toolbox bootstrap
- Added `run_before_clone-toolbox.sh.tmpl` to clone `/projects/toolbox` only when the canonical clone is missing.
- Added `symlink_dot_agents.tmpl` so `~/.agents` resolves to the shared toolbox clone.

## 2026-05-26

### Split pi context — generic AGENTS.md from clankerpedia, env stays private

Refines the previous entry. clankerpedia (public) owns the shared, machine-agnostic
agent instructions; the private dotfiles own this machine's env (internal infra).

- `private_dot_pi/private_agent/symlink_AGENTS.md.tmpl` → `~/.agents/AGENTS.md`: pi now uses the same global agent instructions as `~/.claude` and `~/.codex` (clankerpedia). Deploys on all personal machines.
- `private_dot_pi/private_agent/symlink_APPEND_SYSTEM.md` → `ENV_DEVBOX.md`: pi appends the devbox env to its system prompt via `~/.pi/agent/APPEND_SYSTEM.md` (devbox-only). Internal infra (hostnames/IPs/ports) stays in this private repo — never in public clankerpedia.
- Removed `AGENTS.md.tmpl` (the chezmoi `include` of ENV_DEVBOX.md) and the redundant `ENV.md` symlink.
- `.chezmoiignore.tmpl`: only `ENV_DEVBOX.md` + `APPEND_SYSTEM.md` are devbox-gated now; `AGENTS.md` (clankerpedia symlink) deploys everywhere personal.

Net on devbox: `~/.pi/agent/AGENTS.md` → clankerpedia generic instructions; `~/.pi/agent/APPEND_SYSTEM.md` → `ENV_DEVBOX.md` (this box's environment). On other machines: just the clankerpedia AGENTS.md.

### Replace environment.ts extension with chezmoi-managed context files

Drop the custom `environment.ts` pi extension in favor of native pi context files.

- `private_dot_pi/private_agent/ENV_DEVBOX.md`: source of truth for the devbox runtime info (shared dirs, ports→host, `http://dev.ankitson.com:<port>` public URL, GPU/DISPLAY).
- `private_dot_pi/private_agent/AGENTS.md.tmpl`: pi auto-loads `~/.pi/agent/AGENTS.md` as a global context file. It contains only `{{ include "...ENV_DEVBOX.md" }}` — pi has no in-file `@FILE.md` include (that syntax is CLI-only for prompt attachment), so chezmoi inlines the whole ENV file at apply time. Single source = ENV_DEVBOX.md, nothing hand-written.
- `symlink_ENV.md` → `ENV_DEVBOX.md`: chezmoi-managed symlink so `~/.pi/agent/ENV.md` is a stable handle to this machine's env file.
- `.chezmoiignore.tmpl`: these three are deployed only when `hostname == devbox` (host / agent-devbox keep their defaults).
- Removed `extensions/environment.ts` (and its `/env` command). Env info now rides in the system context automatically via AGENTS.md.

### Fix bashrc syntax error from X_BEARER_TOKEN quoting

- `dot_bashrc.tmpl`: `export X_BEARER_TOKEN={{ $bearerToken | quote }}` produced a double-quoted shell string; Go's `quote` does NOT escape backticks or `$`, so a token value containing them (the `op://clankers/x/bearerToken` item was rotated) opened an unclosed command substitution → `~/.bashrc: syntax error: unexpected end of file` on freshly-rendered machines (hit on the devbox after re-apply). Now base64-encode the secret at render time (`b64enc`) and decode at runtime (`base64 -d`) inside single quotes — safe for any token contents. Verified lossless round-trip against a value containing `` ` ``, `$()`, `"`, `'`, `\`.

### Move to off-the-shelf pi plugins (first-party + community)

Prefer maintained packages/first-party extensions over hand-rolled ones.

#### Changed
- `settings.json.tmpl` packages: `["git:github.com/badlogic/pi-doom", "npm:pi-mcp-adapter", "npm:pi-subagents", "npm:pi-goal-x", "npm:pi-web-access"]`.
  - `pi-goal-x` (tmonk/pi-goal-x) — persistent goal management w/ drafting, confirmation, independent completion auditor, multi-goal. Replaces custom `goal-mode.ts`.
  - `pi-web-access` — `web_search` (Exa/Perplexity/Gemini), `code_search`, `fetch_content` (URLs, GitHub repos, YouTube, PDFs), curator UI. Replaces custom `web-tools.ts`. NOTE: defaults to Exa MCP (external) — drops the local SearXNG (`search.home.ankitson.com`) fallback our web-tools used.

#### Added
- `settings.json.tmpl` `extensions`: reference pi's first-party bundled examples **in place** (not copied) via absolute paths under `{{ .chezmoi.homeDir }}/.local/lib/node_modules/@earendil-works/pi-coding-agent/examples/extensions/`:
  - `tools.ts` — `/tools` interactive enable/disable tool selector (persists across reloads). Replaces the static `tools-command.ts` cheatsheet.
  - `plan-mode/index.ts` — Plan Mode (read-only exploration; `/plan` or Ctrl+Alt+P; plan-step extraction + progress widget).
  - Referencing instead of vendoring means they track the installed pi version and resolve their `@earendil-works/pi-*` imports from pi's own deps. Paths are templated to an absolute home dir (identical on host and devbox).

#### Removed
- `extensions/goal-mode.ts` → pi-goal-x.
- `extensions/web-tools.ts` → pi-web-access.
- `extensions/tools-command.ts` → first-party tools.ts.

#### Kept (no off-the-shelf equivalent)
- `extensions/environment.ts` (devbox runtime awareness), `extensions/browser-tools.ts` (Playwright screenshot — pi-web-access has no screenshot tool).

### Pi packages (subagents + MCP) and global MCP config

#### Changed
- `settings.json.tmpl`: declare `"packages": ["git:github.com/badlogic/pi-doom", "npm:pi-mcp-adapter", "npm:pi-subagents"]`.
  - `pi-subagents` — maintained subagent package (tool `subagent`; commands `/run`, `/chain`, `/run-chain`, `/parallel`, `/subagents-doctor`; bundled skills/prompts) replacing the hand-rolled extension.
  - `pi-mcp-adapter` — MCP support behind a single low-token proxy tool (`mcp({search})`), servers connect lazily.
  - `pi-doom` — preserved (was already in the live host settings; declaring it keeps chezmoi from dropping it).
- `tools-command.ts` (`/tools`): list the `subagent` tool + pi-subagents commands.

#### Added
- `private_dot_pi/private_agent/mcp.json`: pi-global MCP config (`~/.pi/agent/mcp.json`) with the `fastmail` server (`https://api.fastmail.com/mcp`, `auth: oauth`, lazy, directTools). Promoted from a project-only `.pi/mcp.json`. No secrets in the file — OAuth tokens live per-machine in `~/.pi/agent/mcp-oauth/` (never committed); first use on a new machine triggers the OAuth flow.

#### Removed
- `extensions/subagent-tools.ts`: replaced by the pi-subagents package.

#### Notes
- User-settings packages are NOT auto-installed on pi startup (only project `.pi/settings.json` packages are). So `first-run.sh` / `agent-first-run.sh` (in the devdocker repo) now run `pi update --extensions` after `chezmoi apply` to fetch declared packages. On an already-running container, run `pi update --extensions` once.

### Pi sessions from devbox flow into AgentsView

#### Added
- `private_dot_pi/private_agent/settings.json.tmpl` (was `settings.json`): inside the devbox container (detected via `stat "/mnt/host/home/ankit"`, the host-home bind mount), set pi's `sessionDir` to `/mnt/host/home/ankit/.pi/agent/sessions` — i.e. the host's `~/.pi/agent/sessions`. AgentsView already ingests that directory (`PI_DIR=/agents/pi`), so pi sessions created inside devbox now appear in AgentsView automatically, with no AgentsView/compose change. On the host and on the Hermes `agent-devbox` (no such mount) the line is omitted, keeping pi's default session location. Note: devbox and host pi sessions commingle in that dir (acceptable — no per-machine tagging).

### Pi extensions — env-awareness, local browser, drop code_execute

Now that `pi` runs *inside* the `devbox` container (rather than calling into it):

#### Added
- `private_dot_pi/private_agent/extensions/environment.ts`: injects container runtime context into the system prompt via the `before_agent_start` event (shared `/projects` mount, host home at `/mnt/host/home/ankit`, ports `3000-3100` published 1:1 to the host for serving web apps, SSH on 2201, GPU/DISPLAY). Guarded by a devbox detection check (`/mnt/host/home/ankit` mount / hostname) so it does NOT fire when the same dotfiles run on the host. Also registers a `/env` command.
- `private_dot_pi/private_agent/extensions/browser-tools.ts`: `browser_screenshot` rewritten to be self-contained and local — drives the container's bundled Playwright (Chromium, headless) via an inline node script in `os.tmpdir()`. No nested container, no dependency on a pre-placed `/projects/pi_screenshot.py`.
- `private_dot_pi/private_agent/extensions-available/code_execute.ts`: the old `code_execute` tool, kept as reference but deliberately OUTSIDE the auto-discovered `extensions/` dir so it does not load (pi's built-in `bash` already covers it).

#### Removed
- `private_dot_pi/private_agent/extensions/devbox-tools.ts`: split into `browser-tools.ts` (browser_screenshot, now local) and `extensions-available/code_execute.ts` (not loaded).

#### Changed
- `tools-command.ts` (`/tools`): updated listing — built-in vs custom tools, dropped `code_execute`, browser is now "local Playwright", lists `/goal`, `/env`, `/tools`.

#### Fixed
- `goal-mode.ts`: the goal reminder hooked a non-existent `message_sent` event (silent no-op). Ported to the documented `before_agent_start` hook, which now appends the goal reminder to the system prompt each prompt. Also fixed the status indicator: was misusing `pi.setLabel` (which labels session-tree entries); now uses `ctx.ui.setStatus`. Kickoff uses `pi.sendUserMessage` (string) instead of `pi.sendMessage` (which expects a message object).

#### Notes
- Foldable thinking/tool blocks are native in pi: `ctrl+t` toggles thinking, `ctrl+o` toggles tool output. No config needed.
- On an already-running container, `chezmoi apply` won't delete the now-removed `devbox-tools.ts`; remove it once with `rm ~/.pi/agent/extensions/devbox-tools.ts` then `/reload`. Fresh image builds are clean.

### Pi agent secrets via 1Password (fix "No models available")

#### Added
- `private_dot_pi/private_agent/models.json.tmpl`: LiteLLM provider `apiKey` injected from `op://clankers/litellm/password` via `onepasswordRead`, matching the SSH key / `X_BEARER_TOKEN` declarative pattern.
- `private_dot_pi/private_agent/auth.json.tmpl`: `opencode` and `deepseek` provider keys injected from `op://clankers/opencode-zen/password` and `op://clankers/deepseek/password`.
- `.chezmoiignore.tmpl`: ignore `.pi` on non-personal machines (mirrors the `.ssh` rule) so `onepasswordRead` is never called where 1Password is unavailable.

#### Removed
- `private_dot_pi/private_agent/models.json` and `auth.json`: static files that hardcoded the non-functional literal placeholders `"$LITELLM_API_KEY"` / `"LITELLM_API_KEY"`. Pi reads `apiKey` as a literal string (no env expansion), so these authenticated with garbage and produced "No models available" in the devbox container. Replaced by the templated versions above.

## 2026-03-11

### Windows PowerShell profile

#### Added
- `Documents/WindowsPowerShell/Microsoft.PowerShell_profile.ps1`: Windows PowerShell profile from `~/Documents/WindowsPowerShell/`.

#### Changed
- `.chezmoiignore.tmpl`: Ignore `Documents/WindowsPowerShell/**` when `chezmoi.os` is not `windows`.

## 2026-03-02

### Sync bashrc environment

#### Changed
- `dot_bashrc.tmpl`: include `.opencode/bin` and `.bun/bin` in the consolidated PATH block so the shared template now matches the live `~/.bashrc`.
- `dot_bashrc.tmpl`: source `X_BEARER_TOKEN` via `onepasswordRead "op://x/bearerToken"` so the bearer token follows the same declarative 1Password helper pattern as the SSH keys.

## 2026-02-15

### WezTerm tab title stability and truncation

#### Changed
- `dot_wezterm.lua.tmpl`: Added a stable `format-tab-title` handler that:
- truncates full tab labels (`MAX_TAB_TITLE_LEN = 28`)
- truncates hostnames (`MAX_HOSTNAME_LEN = 12`) and shortens FQDN hostnames to first segment
- hides usernames by rewriting `user@host` to `host`
- caches fallback title per tab id to prevent oscillation between pane titles
- uses `pcall` and falls back to tab index if formatting fails

### WezTerm path-only title revision

#### Changed
- `dot_wezterm.lua.tmpl`: `format-tab-title` now ignores `max_width` and uses fixed truncation (`MAX_TAB_TITLE_LEN`)
- `dot_wezterm.lua.tmpl`: fallback parsing now extracts only path from pane titles (for example, `user@host: /path` -> `/path`)

### WezTerm shell integration auto-setup

#### Added
- `.chezmoiexternal.toml.tmpl`: Added external file mapping for `~/.local/share/wezterm/shell-integration/wezterm.sh` from WezTerm upstream

#### Changed
- `dot_bashrc.tmpl`: Auto-sources `wezterm.sh` when running inside WezTerm (`WEZTERM_PANE` is set) and the integration file is present

## 2026-02-04

### Faster external refresh

#### Changed
- `.chezmoiexternal.toml.tmpl`: Reduced refresh periods for tpm, vim-plug, and clankerpedia to 24h

### Bash completion UX + fzf tweaks

#### Changed
- `dot_bashrc.tmpl`: Enabled readline to show ambiguous matches on first `TAB`, added menu cycling, and set fzf completion trigger/options before `fzf --bash`

### 1Password session sharing across WezTerm panes

#### Added
- `dot_op_helper.sh`: `op_signin` wrapper that saves `OP_SESSION_*` to `~/.op_session`, plus `PROMPT_COMMAND` hook to auto-load it in existing panes
- `dot_wezterm.lua.tmpl`: Reads `~/.op_session` and sets `config.set_environment_variables` for new panes; watches file for config reload

## 2026-01-31

### WezTerm template + macOS portability

#### Added
- `dot_wezterm.lua.tmpl`: WezTerm config converted to chezmoi template. Shell path uses `stat` to detect Homebrew bash, falls back to `/bin/bash`. `macos_window_background_blur` only on macOS. `audible_bell = 'Disabled'`.
- `private_dot_config/karabiner/karabiner.json`: Karabiner config moved into chezmoi directory structure, deployed to `~/.config/karabiner/` on macOS only.
- `dot_bashrc.tmpl`: Added `eval "$(/opt/homebrew/bin/brew shellenv)"` on macOS, before environment/PATH blocks.

#### Changed
- `.chezmoiignore.tmpl`: Added karabiner ignore rule for non-macOS machines.

#### Removed
- `.wezterm.lua`: Replaced by `dot_wezterm.lua.tmpl`
- `karabiner.json`: Moved to `private_dot_config/karabiner/karabiner.json`
- `.zshrc`: Old oh-my-zsh config, superseded by `.bashrc.tmpl`

## 2026-01-30

### v2 Reorganization

#### Added
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

#### Changed
- `.chezmoiexternal.toml` → `.chezmoiexternal.toml.tmpl`: Now templated. vim-plug fetched as external file instead of committed locally. Clankerpedia clone URL switches on `$internal_network`.
- `dot_bashrc.tmpl`: Consolidated all PATH into single template block with `stat` checks, editor via `lookPath`, clang via `lookPath`, completions via `lookPath`, simplified fzf setup, removed GitHub token export, removed Borg config (kept in separate per-machine setup), increased history to 100k/200k
- `dot_alias.tmpl`: Aliases that shadow commands gated by `lookPath` (nvim, bat/batcat, fdfind, eza, terraform, stdbuf, cargo, just). 1Password helper + claudep gated by `$personal`. Functions use POSIX-style syntax.

#### Removed
- `dot_gitconfig`: Replaced by `dot_gitconfig.tmpl`
- `.chezmoiignore`: Replaced by `.chezmoiignore.tmpl`
- `.chezmoiexternal.toml`: Replaced by `.chezmoiexternal.toml.tmpl`
- `private_dot_config/nvim/autoload/plug.vim`: Now fetched via `.chezmoiexternal.toml.tmpl`
