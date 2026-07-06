    1. Change claudep alias to not use a long-lived token (remote control doesn't work). The claudep alias would live in the dotfiles repo
    (dot_alias.sh.tmpl / dot_bashrc.tmpl in projects/devdocker/dotfiles), so a TODO about it belongs with the dotfiles work — either a dated TODO doc
    there or appended to the current mcpproxy effort's notes.
    2. Enable dynamic workflows in Claude by default. This is a Claude Code harness setting (settings.json), also dotfiles-managed under
    private_dot_claude/settings.json.tmpl.
    3. Fix the 1Password personal-vs-service ergonomics. A process can use EITHER the service account
    (OP_SERVICE_ACCOUNT_TOKEN set -> only op://clankers) OR a personal session (token unset + signed in ->
    op://Private AND op://clankers); a set token makes op ignore interactive sessions. The service token is
    sourced globally (~/.config/op/service-account.env in dot_bashrc.tmpl:127), so personal `op` reads
    (op://Private/*) and chezmoi in account mode both break with "onepassword.mode is account, but
    OP_SERVICE_ACCOUNT_TOKEN is set". Existing op_signin() in dot_op_helper.sh has the same bug (doesn't strip
    the token). Proposed fix (drafted, not applied): add op_personal_signin() + op_personal() helpers to
    dot_op_helper.sh that run op with `env -u OP_SERVICE_ACCOUNT_TOKEN`. Decide whether to adopt these or take
    a different approach (e.g. don't source the service token in interactive shells at all).
