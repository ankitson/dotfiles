#!/usr/bin/env python3
"""chezmoi modify_ script for ~/.codex/config.toml.

The Codex app/mobile remote-control path starts a plain app-server on the host;
it does not inherit shell aliases such as `codexp` or the `yolow` profile. Keep
the base config in full-access mode so app-controlled local threads do not fall
back to permission prompts, while preserving Codex-owned runtime state and
secrets in the live file.
"""
import re
import sys
import tomllib

ROOT_SETTINGS = {
    "approval_policy": "never",
    "sandbox_mode": "danger-full-access",
    "approvals_reviewer": "user",
    # The desktop app launches `codex app-server` without a profile flag, so
    # provider settings must live in the base config. Preserve the app-selected
    # model while routing it through the named Bifrost provider.
    "model_provider": "bifrost",
}

LEGACY_ROOT_SETTINGS = ["openai_base_url", "env_key"]

BIFROST_PROVIDER_SETTINGS = {
    "name": "Bifrost",
    "base_url": "https://bifrost.dev.ankitson.com/openai/v1",
    "wire_api": "responses",
    # Bifrost inference auth is currently disabled. This non-secret placeholder
    # prevents Codex from forwarding its ChatGPT OAuth token to the gateway.
    # Replace with env_key=BIFROST_API_KEY when inference auth is enabled.
    "experimental_bearer_token": "bifrost-local",
    "requires_openai_auth": False,
    # Bare model IDs selected by the app need Bifrost governance routing,
    # which currently runs on the HTTP/SSE path but not before WS key selection.
    "supports_websockets": False,
    "request_max_retries": 4,
    "stream_max_retries": 10,
    "stream_idle_timeout_ms": 300000,
}

TRUSTED_PROJECTS = [
    "/home/ankit",
    "/home/ankit/hroot",
    "/home/ankit/hroot/projects",
]


def quote_string(value):
    return '"' + value.replace("\\", "\\\\").replace('"', '\\"') + '"'


def fmt_value(value):
    if isinstance(value, bool):
        return "true" if value else "false"
    if isinstance(value, str):
        return quote_string(value)
    if isinstance(value, int):
        return str(value)
    raise TypeError(f"unsupported TOML value: {value!r}")


def table_header(parts):
    return "[" + ".".join(quote_string(part) if "/" in part else part for part in parts) + "]"


def is_header(line):
    stripped = line.strip()
    return stripped.startswith("[") and stripped.endswith("]")


def set_root_key(lines, key, value):
    replacement = f"{key} = {fmt_value(value)}"
    first_header = next((i for i, line in enumerate(lines) if is_header(line)), len(lines))
    pattern = re.compile(rf"^\s*{re.escape(key)}\s*=")

    for index in range(first_header):
        if pattern.match(lines[index]):
            lines[index] = replacement
            return

    insert_at = first_header
    if insert_at > 0 and lines[insert_at - 1].strip() == "":
        insert_at -= 1
    lines.insert(insert_at, replacement)


def remove_root_key(lines, key):
    first_header = next((i for i, line in enumerate(lines) if is_header(line)), len(lines))
    pattern = re.compile(rf"^\s*{re.escape(key)}\s*=")
    for index in range(first_header - 1, -1, -1):
        if pattern.match(lines[index]):
            lines.pop(index)


def set_table_key(lines, header, key, value):
    replacement = f"{key} = {fmt_value(value)}"
    pattern = re.compile(rf"^\s*{re.escape(key)}\s*=")

    for index, line in enumerate(lines):
        if line.strip() != header:
            continue

        end = next((i for i in range(index + 1, len(lines)) if is_header(lines[i])), len(lines))
        for item_index in range(index + 1, end):
            if pattern.match(lines[item_index]):
                lines[item_index] = replacement
                return

        lines.insert(end, replacement)
        return

    if lines and lines[-1].strip() != "":
        lines.append("")
    lines.extend([header, replacement])


raw = sys.stdin.read()
lines = raw.splitlines()

for key, value in ROOT_SETTINGS.items():
    set_root_key(lines, key, value)

for key in LEGACY_ROOT_SETTINGS:
    remove_root_key(lines, key)

for key, value in BIFROST_PROVIDER_SETTINGS.items():
    set_table_key(lines, "[model_providers.bifrost]", key, value)

for project in TRUSTED_PROJECTS:
    set_table_key(lines, table_header(("projects", project)), "trust_level", "trusted")

output = "\n".join(lines).rstrip() + "\n"
tomllib.loads(output)
sys.stdout.write(output)
