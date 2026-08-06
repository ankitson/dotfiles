#!/usr/bin/env python3
"""Update ~/.omnigent/config.yaml after its managed source changes.

Omnigent writes host identity and provider settings to this file itself. Keep
that tool-owned state intact while enforcing the shared server and Pi's
Bifrost gateway provider.
"""
import re
from pathlib import Path

SERVER = "https://omni.dev.ankitson.com"
SERVER_LINE = f"server: {SERVER}"
ROOT_SERVER = re.compile(r"^server\s*:")
ROOT_SECTION = re.compile(r"^[^\s#][^:]*:")
PROVIDER = re.compile(r"^  ([^\s#][^:]*):")
CONFIG_PATH = Path.home() / ".omnigent" / "config.yaml"
BIFROST_PROVIDER = [
    "  bifrost:",
    "    default: pi",
    "    kind: gateway",
    "    openai:",
    "      api_key: sk-bifrost-local",
    "      base_url: https://bifrost.dev.ankitson.com/openai/v1",
    "      models:",
    "        default: deepseek/deepseek-v4-flash",
    "      wire_api: chat",
]


def section_end(lines, start):
    for index in range(start + 1, len(lines)):
        if ROOT_SECTION.match(lines[index]):
            return index
    return len(lines)


def upsert_bifrost_provider(lines):
    try:
        providers_start = lines.index("providers:")
    except ValueError:
        if lines and lines[-1]:
            lines.append("")
        lines.extend(["providers:", *BIFROST_PROVIDER])
        return

    providers_end = section_end(lines, providers_start)
    for index in range(providers_start + 1, providers_end):
        match = PROVIDER.match(lines[index])
        if not match or match.group(1) != "bifrost":
            continue
        entry_end = index + 1
        while entry_end < providers_end and not PROVIDER.match(lines[entry_end]):
            entry_end += 1
        lines[index:entry_end] = BIFROST_PROVIDER
        return

    lines[providers_end:providers_end] = BIFROST_PROVIDER

lines = CONFIG_PATH.read_text(encoding="utf-8").splitlines() if CONFIG_PATH.exists() else []
for index, line in enumerate(lines):
    if ROOT_SERVER.match(line):
        lines[index] = SERVER_LINE
        break
else:
    lines.insert(0, SERVER_LINE)

upsert_bifrost_provider(lines)
CONFIG_PATH.parent.mkdir(parents=True, exist_ok=True)
CONFIG_PATH.write_text("\n".join(lines).rstrip() + "\n", encoding="utf-8")
