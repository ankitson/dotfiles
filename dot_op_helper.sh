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
