    1. Change claudep alias to not use a long-lived token (remote control doesn't work). The claudep alias would live in the dotfiles repo
    (dot_alias.sh.tmpl / dot_bashrc.tmpl in projects/devdocker/dotfiles), so a TODO about it belongs with the dotfiles work — either a dated TODO doc
    there or appended to the current mcpproxy effort's notes.
    2. Enable dynamic workflows in Claude by default. This is a Claude Code harness setting (settings.json), also dotfiles-managed under
    private_dot_claude/settings.json.tmpl.
