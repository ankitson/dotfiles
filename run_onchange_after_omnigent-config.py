#!/usr/bin/env python3
"""Update ~/.omnigent/config.yaml after its managed source changes.

Omnigent writes host identity and provider settings to this file itself. Keep
those tool-owned values intact while enforcing the shared default server.
"""
import re
from pathlib import Path

SERVER = "https://omni.dev.ankitson.com"
SERVER_LINE = f"server: {SERVER}"
ROOT_SERVER = re.compile(r"^server\s*:")
CONFIG_PATH = Path.home() / ".omnigent" / "config.yaml"

lines = CONFIG_PATH.read_text(encoding="utf-8").splitlines() if CONFIG_PATH.exists() else []
for index, line in enumerate(lines):
    if ROOT_SERVER.match(line):
        lines[index] = SERVER_LINE
        break
else:
    lines.insert(0, SERVER_LINE)

CONFIG_PATH.parent.mkdir(parents=True, exist_ok=True)
CONFIG_PATH.write_text("\n".join(lines).rstrip() + "\n", encoding="utf-8")
