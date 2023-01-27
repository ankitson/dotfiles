echo "Running alias.sh"

alias fd="fdfind"
alias soh="sort --human-numeric-sort"
alias vim="nvim"
alias ls="ls --color=auto"
alias ll="ls -hlt"
alias lla="ls -halt"
alias g="git"

if [ ! -z "$(which exa)" ]
then
  alias x="exa"
  if [ ! -z "$(exa --version | grep "\+git")" ]
  then
    alias xl="exa --long --header --git --icons"
    alias xlt="exa -a --long --header --git --icons --tree --level=2"
    alias xltt="exa -a --long --header --git --icons --tree --level=3"
  fi
fi

#If the last character of the alias value is a blank, then the next command word following the alias is also checked for alias expansion.
#https://www.gnu.org/software/bash/manual/bash.html#Aliases 
#This allows sudo to work with aliases.
alias sudo="sudo "

alias dc="sudo docker-compose -f /home/ankit/homeserver/docker-compose.yaml"
function dc_log_short() {
  sudo docker compose -f /home/ankit/homeserver/docker-compose.yaml logs -f -t --tail=10 $1
}
alias 'dcl'='dc_log_short'

# "cd.. 5" will cd up 5 levels
function cd_up() {
  cd $(printf "%0.0s../" $(seq 1 $1));
}
alias 'cd..'='cd_up'

function cargo_test_stdout() {
  cargo test -- --nocapture
}
alias 'ct'='cargo_test_stdout'

function rsync_cp() {
  rsync -vhrazP $1 $2
}
alias 'rscp'='rsync_cp'
