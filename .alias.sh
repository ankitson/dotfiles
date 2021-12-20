alias fd="fdfind"
alias soh="sort --human-numeric-sort"
alias vim="nvim"
alias ll="ls -halt"
alias g="git"
#If the last character of the alias value is a blank, then the next command word following the alias is also checked for alias expansion.
#https://www.gnu.org/software/bash/manual/bash.html#Aliases 
#This allows sudo to work with aliases.
alias sudo="sudo "
alias dc="sudo docker-compose -f /home/ankit/homeserver/docker-compose.yaml"

# "cd.. 5" will cd up 5 levels
function cd_up() {
  cd $(printf "%0.0s../" $(seq 1 $1));
}
alias 'cd..'='cd_up'

function cargo_test_stdout() {
  cargo test -- --nocapture
}
alias 'ct'='cargo_test_stdout'
