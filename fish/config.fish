#auto bind to a tmux session

#if status is-interactive
#and not set -q TMUX
#  tmux attach -t base || tmux new -s base
#end

function refresh
  if set -q TMUX
    echo "reloading tmux conf..."
    set I3SOCK (tmux show-environment | grep I3SOCK | cut -d '=' -f 2)
  end
end

function fish_title
  if set -q TMUX
    echo (status current-command) ' '
  else
    echo '' (hostname) '' (status current-command) ' '
  end
end

function win10
  sudo virsh start win10-new
end

function bind_bang
  switch (commandline -t)
  case "!"
    commandline -t $history[1]; commandline -f repaint
  case "*"
    commandline -i !
  end
end

function bind_dollar
  switch (commandline -t)
  case "!"
    commandline -t ""
    commandline -f history-token-search-backward
  case "*"
    commandline -i '$'
  end
end

function fish_user_key_bindings
  bind ! bind_bang
  bind '$' bind_dollar
end

function hybrid_bindings --description "Vi-style bindings that inherit emacs-style bindings in all modes"
    for mode in default insert visual
        fish_default_key_bindings -M $mode
    end
    fish_vi_key_bindings --no-erase
end
set -g fish_key_bindings hybrid_bindings

function context_create
    echo "Creating context..."
    mkdir .context
    touch .context/urls.txt

    set dirpath (pwd)
    set dircomp (string split / $dirpath)
    set dirname $dircomp[-1]

    echo "{ \"folders\": [ { \"path\": \"../\" } ], \"settings\": {} }" | jq . > ".context/$dirname.code-workspace"

    firefox -CreateProfile "$dirname $dirpath/.context/$dirname-firefox-profile"
end
  
function context_load
    echo "Loading context..."

    set urls_file (fdfind "^urls.txt\$" .context/)
    set urls (cat $urls_file | string split '\n')
    set vscode_workspaces (fdfind "\.code-workspace\$" .context/)
    set vscode_param $vscode_workspaces | string split ' '

    function ff
      firefox -P context $urls < /dev/null > /dev/null 2>&1 &
    end

    function editor
      code $vscode_param < /dev/null  > /dev/null 2>&1 &
    end

    if string length -q -- $urls_file
      ff
    end

    if string length -q -- $vscode_workspaces
      editor
    end

    set dirpath (pwd)
    set dircomp (string split / $dirpath)
    set dirname $dircomp[-1]
    set -g active_context $dirname
end

function context_unload
  set -g -e active_context
  functions -e ff
  functions -e editor
end

function context
  if test -d .context
    context_load
  else
    context_create
    context_load
  end
end

function fish_right_prompt -d "Display context if loaded"
  #unload context when user cds out of directory
  if set -g -q active_context
    and not test -d .context
    echo "unloading context"
    context_unload
  end

  if set -g -q active_context
    set_color blue
    echo -n "(context $active_context)"
    set_color normal
  end
end

function fastapt -d "fastapt"
  apt-cache search "" | cut --delimiter " " --fields 1 | fzf --multi --exact --cycle --reverse --preview 'apt-cache search {1}'
end

alias vim="nvim"
alias fd="fdfind"
alias ..="cd .."
alias ...="cd ../../"
alias ....="cd ../../../"
alias src="source ~/.config/fish/config.fish; and echo 'Reloaded fish dotfiles...'"
alias ll="ls -halt -I . -I .." #ignore "." and ".."

set -x FZF_DEFAULT_OPTS '--height 40% --multi'

set -x FZF_TMUX 1
set -x FZF_COMPLETE 0
set -x FZF_FIND_FILE_COMMAND "fd --hidden --follow --exclude .git ." # \$dir

set PATH $HOME/.cargo/bin $HOME/bin $PATH

set -x PYENV_ROOT $HOME/.pyenv
set -x fish_user_paths $PYENV_ROOT/bin $fish_user_paths

status --is-interactive; and pyenv init - | source
status --is-interactive; and pyenv virtualenv-init - | source
