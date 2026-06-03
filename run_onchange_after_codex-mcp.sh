#!/usr/bin/env bash
# Declaratively register the mcpproxy gateway as a Codex MCP server.
# Codex's ~/.codex/config.toml is stateful (per-project trust levels, hook
# hashes), so it is NOT chezmoi-managed wholesale. Instead we drive Codex's own
# config writer here so the [mcp_servers.mcpproxy] block stays valid and in sync.
# Re-runs whenever this script's contents change (run_onchange).
#
# The bearer token is supplied at runtime via the MCPPROXY_AGENT_TOKEN env var
# (see the codex() wrapper in dot_alias.sh.tmpl), so no secret is written here.
set -euo pipefail

command -v codex >/dev/null 2>&1 || exit 0

# Idempotent: remove any existing definition, then add the canonical one.
codex mcp remove mcpproxy >/dev/null 2>&1 || true
codex mcp add mcpproxy \
  --url https://mcp.dev.ankitson.com/mcp \
  --bearer-token-env-var MCPPROXY_AGENT_TOKEN
