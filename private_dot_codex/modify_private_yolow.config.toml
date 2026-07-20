#!/usr/bin/env python3
"""chezmoi modify_ script for ~/.codex/yolow.config.toml.

chezmoi pipes the current target file in on stdin and uses our stdout as the
new contents. We enforce only the keys this repo owns and preserve everything
codex writes itself (e.g. [projects.*] trust levels, [hooks.*] state), so the
file stops fighting between hand-managed config and tool-written config.
"""
import re
import sys
import tomllib

# Keys this repo owns. Codex owns everything else it adds to the file.
MANAGED = {
    "approval_policy": "never",
    "sandbox_mode": "danger-full-access",
    "approvals_reviewer": "user",
    "model": "gpt-5.5",
    "model_reasoning_effort": "xhigh",
    "notice": {
        "hide_rate_limit_model_nudge": True,
    },
}


def deep_merge(base, overlay):
    out = dict(base)
    for key, value in overlay.items():
        if isinstance(value, dict) and isinstance(out.get(key), dict):
            out[key] = deep_merge(out[key], value)
        else:
            out[key] = value
    return out


def quote_key(key):
    if re.fullmatch(r"[A-Za-z0-9_-]+", key):
        return key
    return '"' + key.replace("\\", "\\\\").replace('"', '\\"') + '"'


def fmt_value(value):
    if isinstance(value, bool):
        return "true" if value else "false"
    if isinstance(value, str):
        return '"' + value.replace("\\", "\\\\").replace('"', '\\"') + '"'
    if isinstance(value, (int, float)):
        return repr(value)
    raise TypeError(f"unsupported TOML value: {value!r}")


FORCED_HEADERS = {
    ("hooks", "state"),
}


def emit(table, prefix=()):
    scalars = {k: v for k, v in table.items() if not isinstance(v, dict)}
    subtables = {k: v for k, v in table.items() if isinstance(v, dict)}
    lines = []
    for key, value in scalars.items():
        # Match the current live file's spacing so a dry-run does not churn.
        padding = "   " if prefix == () and key == "sandbox_mode" else ""
        lines.append(f"{quote_key(key)}{padding} = {fmt_value(value)}")
    for key, value in subtables.items():
        path = prefix + (key,)
        child_scalars = {k: v for k, v in value.items() if not isinstance(v, dict)}
        # Only emit a header for tables that hold scalars (or are empty);
        # pure super-tables are implied by their children's headers.
        if child_scalars or not value or path in FORCED_HEADERS:
            header = ".".join(quote_key(p) for p in path)
            lines.append("")
            lines.append(f"[{header}]")
            lines.extend(f"{quote_key(k)} = {fmt_value(v)}" for k, v in child_scalars.items())
        lines.extend(emit({k: v for k, v in value.items() if isinstance(v, dict)}, path))
    return lines


raw = sys.stdin.read()
existing = tomllib.loads(raw) if raw.strip() else {}
merged = deep_merge(existing, MANAGED)
sys.stdout.write("\n".join(emit(merged)) + "\n")
