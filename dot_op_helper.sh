# -----------------------------------------------------------------------------
# op_inject: generic wrapper for injecting environment variables from 1Password
# -----------------------------------------------------------------------------

# Usage:
#   op_inject VAR1=op://vault/item/field VAR2=op://vault/item/field -- command args...
# It will map each VAR=secret into a temp .env file, then op run the given command.
#
op_inject() {
  local args=()
  local envfile
  envfile="$(mktemp)"

  # parse until --
  while [[ $# -gt 0 && "$1" != "--" ]]; do
    args+=("$1")
    shift
  done

  if [[ "$1" != "--" ]]; then
    echo "Usage: op_inject VAR1=op://... VAR2=op://... -- command [args...]"
    rm -f "$envfile"
    return 1
  fi

  shift # remove --

  # write secret refs to temp env file
  for kv in "${args[@]}"; do
    echo "$kv" >> "$envfile"
  done

  # Run command with op run
  # Using --env-file avoids partial expansion before op run
  op run --env-file="$envfile" -- "$@"

  local status=$?
  rm -f "$envfile"
  return $status
}

# Optional shortcut for interactive shells:
# This opens a subshell with secrets loaded
op_shell() {
  local envfile
  envfile="$(mktemp)"
  for kv in "$@"; do
    echo "$kv" >> "$envfile"
  done
  # launch a new shell with secrets
  op run --env-file="$envfile" -- "$SHELL"
  rm -f "$envfile"
}

# -----------------------------------------------------------------------------
# 1Password session sharing across WezTerm panes
# -----------------------------------------------------------------------------
# When you run `op_signin`, the session token is saved to ~/.op_session.
# WezTerm watches this file and sets the env var for all new panes.
# Existing panes pick it up via PROMPT_COMMAND on the next prompt.

_OP_SESSION_FILE="$HOME/.op_session"
_op_session_mtime=""

op_signin() {
  eval "$(command op signin "$@")"
  # Save OP_SESSION_* vars for sharing across panes
  ( umask 077; env | grep '^OP_SESSION_' | sed 's/^/export /' > "$_OP_SESSION_FILE" )
}

# Re-source session file when it changes (called via PROMPT_COMMAND)
_op_check_session() {
  [ -f "$_OP_SESSION_FILE" ] || return 0
  local mtime
  mtime=$(stat -c %Y "$_OP_SESSION_FILE" 2>/dev/null || stat -f %m "$_OP_SESSION_FILE" 2>/dev/null)
  if [ "$mtime" != "$_op_session_mtime" ]; then
    _op_session_mtime="$mtime"
    source "$_OP_SESSION_FILE"
  fi
}

PROMPT_COMMAND="${PROMPT_COMMAND:+$PROMPT_COMMAND;}_op_check_session"

op_exec_interactive() {
  local cleanup_vars=()
  local kv key ref value

  while [[ $# -gt 0 && "$1" != "--" ]]; do
    kv="$1"
    shift

    key="${kv%%=*}"
    ref="${kv#*=}"

    # fetch secret
    value="$(op read "$ref")" || return 1

    export "$key=$value"
    cleanup_vars+=("$key")
  done

  shift # --

  # ensure cleanup even if user Ctrl-C's
  trap 'for v in "${cleanup_vars[@]}"; do unset "$v"; done' RETURN INT TERM

  "$@"
}
