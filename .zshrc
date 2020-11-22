export ZSH="/home/ankit/.oh-my-zsh"
ZSH_THEME="custom"
DISABLE_UNTRACKED_FILES_DIRTY="true"
plugins=(git fzf)

source $ZSH/oh-my-zsh.sh

# User config

export LANG=en_US.UTF-8
export TZ=America/Vancouver
export EDITOR='nvim'

alias g="git"
