# Global justfile, used by `just -g`.

default:
    @just -g --list

choose:
    @just -g --choose

# Build the docs site (MkDocs Material) into site/.
docs-build:
    docme build --output site

# Live-preview the docs with hot reload at http://127.0.0.1:8000.
docs-serve:
    docme serve

# Build, then stage into webby's internal bag as a throwaway tmp site.
docs-deploy:
    #!/usr/bin/env bash
    set -euo pipefail
    tmp="$(mktemp -d)"
    trap 'rm -rf "$tmp"' EXIT
    docme build --output "$tmp"
    name="${WEBBY_DOCS_NAME:-$(python3 -c 'import pathlib, re; stem = pathlib.Path.cwd().name.lower(); print(re.sub(r"[^a-z0-9]+", "", stem) + "-docs")')}"
    webby add "$tmp" --bag internal --tmp --name "$name"
