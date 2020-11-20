export ZSH="/home/dev/.oh-my-zsh"
ZSH_THEME="custom"
DISABLE_UNTRACKED_FILES_DIRTY="true"
plugins=(git fzf)

source $ZSH/oh-my-zsh.sh

# User config

export LANG=en_US.UTF-8
export TZ=America/Vancouver
export EDITOR='nvim'

[ -f ~/.fzf.zsh ] && source ~/.fzf.zsh

function ssh-init()
{
    /usr/bin/keychain id_rsa
    [ -z "$HOSTNAME" ] && HOSTNAME=`/bin/uname -n`
    [ -f $HOME/.keychain/$HOSTNAME-sh ] && . $HOME/.keychain/$HOSTNAME-sh
}
 
ssh-init

export LD_LIBRARY_PATH=/usr/local/pgsql/lib
export PATH=/usr/local/pgsql/bin:$PATH

alias vim='nvim'
