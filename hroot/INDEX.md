# INDEX

## Network
All devices on Tailscale, addressed via short names.

## Devices
- `desktop-linux` — homeserver + dev box
- `desktop-win` — Windows PC + ML model server
- `m2book` — personal MacBook (client)

## Hostnames
- `*.home.ankitson.com`, `*.dev.ankitson.com` → desktop-linux
- `*.win.ankitson.com` → desktop-win

## Services
See Caddyfiles and Docker compose files for active services.
- desktop-linux: `~/hroot/homeserver/`, `~/hroot/devserver/`
- desktop-win: Caddyfile in `~/Documents/docs-root/projects/code/win-models/`

## Paths

### desktop-linux
- `~/hroot` — real home directory
- `~/hroot/homeserver`, `~/hroot/devserver` — Docker services
- `/projects/devdocker/dotfiles` — chezmoi dotfiles (shared across all machines)
- `~/hroot/cybernetics` — Obsidian vault / knowledge base (openclaw)
- `/projects` → `~/hroot/projects` — active dev projects

### desktop-win
- `~/Documents/docs-root/projects/code/` — active dev projects
- `~/Documents/docs-root/projects/code/win-models/` — ML models, Caddy server

### m2book
- `~/Documents/docs-root/projects/code/` — active dev projects (shared Synology drive w/ desktop-win)
